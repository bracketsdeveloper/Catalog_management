const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const OpenPurchase = require("../models/OpenPurchase");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Helper function to calculate totals from OpenPurchase
async function calculateOpenPurchaseTotals(jobSheetNumber) {
  if (!jobSheetNumber) return { productCost: 0, brandingCost: 0 };
  
  try {
    const openPurchases = await OpenPurchase.find({ 
      jobSheetNumber: jobSheetNumber,
      status: { $in: ["received", "closed", "ordered", "in-progress"] } // Include all active statuses
    }).lean();
    
    let productCost = 0;
    let brandingCost = 0;
    
    openPurchases.forEach(purchase => {
      const quantity = Number(purchase.qtyRequired) || 0;
      const price = Number(purchase.productPrice) || 0;
      const totalCost = quantity * price;
      
      // Use category field to differentiate cost types
      if (purchase.category === "product") {
        productCost += totalCost;
      } else if (purchase.category === "branding") {
        brandingCost += totalCost;
      } else if (purchase.category === "logistics") {
        // Add to appropriate section if needed
      } else if (purchase.category === "packaging") {
        // Add to appropriate section if needed
      }
    });
    
    return { productCost, brandingCost };
  } catch (error) {
    console.error("Error calculating OpenPurchase totals:", error);
    return { productCost: 0, brandingCost: 0 };
  }
}

// CREATE
router.post("/expenses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      opportunityCode,
      clientCompanyName,
      clientName,
      eventName,
      crmName,
      expenses,
      orderConfirmed,
      jobSheets
    } = req.body;

    // Validate required fields
    if (!opportunityCode || !clientCompanyName || !clientName) {
      return res
        .status(400)
        .json({ message: "Missing required fields: opportunityCode, clientCompanyName, or clientName" });
    }
    if (
      opportunityCode.trim() === "" ||
      clientCompanyName.trim() === "" ||
      clientName.trim() === ""
    ) {
      return res.status(400).json({ message: "Required fields cannot be empty strings" });
    }

    // Validate expenses subdocuments
    if (Array.isArray(expenses) && expenses.length) {
      for (const item of expenses) {
        if (!item.section || item.amount == null || !item.expenseDate) {
          return res
            .status(400)
            .json({ message: "Invalid expense: section, amount, and expenseDate are required" });
        }
        if (item.section === "Damages") {
          if (!item.damagedBy || item.damagedBy.trim() === "") {
            return res
              .status(400)
              .json({ message: "For 'Damages' expense, 'damagedBy' is required." });
          }
        } else {
          item.damagedBy = item.damagedBy ? item.damagedBy : "";
        }
      }
    }

    // Validate jobSheets subdocuments
    if (orderConfirmed && Array.isArray(jobSheets) && jobSheets.length) {
      for (const js of jobSheets) {
        if (!js.jobSheetNumber || js.jobSheetNumber.trim() === "") {
          return res
            .status(400)
            .json({ message: "Invalid jobSheet: jobSheetNumber is required and cannot be empty" });
        }
        if (Array.isArray(js.orderExpenses) && js.orderExpenses.length) {
          for (const item of js.orderExpenses) {
            if (!item.section || item.amount == null || !item.expenseDate) {
              return res
                .status(400)
                .json({ message: "Invalid orderExpense: section, amount, and expenseDate are required" });
            }
            if (item.section === "Damages") {
              if (!item.damagedBy || item.damagedBy.trim() === "") {
                return res
                  .status(400)
                  .json({ message: "For 'Damages' order expense, 'damagedBy' is required." });
              }
            } else {
              item.damagedBy = item.damagedBy ? item.damagedBy : "";
            }
          }
        }
      }
    }

    const exp = new Expense({
      opportunityCode,
      clientCompanyName,
      clientName,
      eventName,
      crmName,
      expenses,
      orderConfirmed,
      jobSheets: orderConfirmed ? jobSheets : [],
      createdBy: req.user._id
    });

    await exp.save();
    res.status(201).json({ message: "Expense created", expense: exp });
  } catch (e) {
    console.error("Error creating expense:", e);
    res.status(500).json({ message: `Failed to create expense: ${e.message}` });
  }
});

// LIST & SEARCH (UPDATED with OpenPurchase data)
router.get("/expenses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { searchTerm } = req.query;

    const filter = {};
    if (searchTerm) {
      filter.$or = [
        { opportunityCode: new RegExp(searchTerm, "i") },
        { clientCompanyName: new RegExp(searchTerm, "i") },
        { clientName: new RegExp(searchTerm, "i") },
        { eventName: new RegExp(searchTerm, "i") },
        { crmName: new RegExp(searchTerm, "i") }
      ];
    }

    const list = await Expense.find(filter).sort({ createdAt: -1 });
    
    // Enhance each expense with OpenPurchase calculated totals
    const enhancedList = await Promise.all(list.map(async (expense) => {
      const expenseObj = expense.toObject();
      
      // Enhance jobSheets with calculated totals
      const enhancedJobSheets = await Promise.all(expenseObj.jobSheets.map(async (jobSheet) => {
        if (!jobSheet.jobSheetNumber) return jobSheet;
        
        // Calculate totals from OpenPurchase for this jobSheet
        const totals = await calculateOpenPurchaseTotals(jobSheet.jobSheetNumber);
        
        // Create a copy of orderExpenses with auto-filled values
        const enhancedOrderExpenses = jobSheet.orderExpenses ? [...jobSheet.orderExpenses] : [];
        
        // Auto-fill Product Cost from OpenPurchase
        const productCostIndex = enhancedOrderExpenses.findIndex(item => item.section === "Product Cost");
        if (productCostIndex >= 0) {
          enhancedOrderExpenses[productCostIndex] = {
            ...enhancedOrderExpenses[productCostIndex],
            amount: totals.productCost,
            // Keep existing expenseDate or set to today
            expenseDate: enhancedOrderExpenses[productCostIndex].expenseDate || new Date()
          };
        } else if (totals.productCost > 0) {
          // Add Product Cost if not exists but we have data
          enhancedOrderExpenses.push({
            section: "Product Cost",
            amount: totals.productCost,
            expenseDate: new Date(),
            remarks: "Auto-calculated from OpenPurchase",
            damagedBy: ""
          });
        }
        
        // Auto-fill Branding Cost from OpenPurchase
        const brandingCostIndex = enhancedOrderExpenses.findIndex(item => item.section === "Branding Cost");
        if (brandingCostIndex >= 0) {
          enhancedOrderExpenses[brandingCostIndex] = {
            ...enhancedOrderExpenses[brandingCostIndex],
            amount: totals.brandingCost,
            expenseDate: enhancedOrderExpenses[brandingCostIndex].expenseDate || new Date()
          };
        } else if (totals.brandingCost > 0) {
          // Add Branding Cost if not exists but we have data
          enhancedOrderExpenses.push({
            section: "Branding Cost",
            amount: totals.brandingCost,
            expenseDate: new Date(),
            remarks: "Auto-calculated from OpenPurchase",
            damagedBy: ""
          });
        }
        
        return {
          ...jobSheet,
          orderExpenses: enhancedOrderExpenses,
          calculatedProductCost: totals.productCost,
          calculatedBrandingCost: totals.brandingCost,
          openPurchaseTotals: totals
        };
      }));
      
      return {
        ...expenseObj,
        jobSheets: enhancedJobSheets
      };
    }));
    
    res.json(enhancedList);
  } catch (e) {
    console.error("Error fetching expenses:", e);
    res.status(500).json({ message: e.message });
  }
});

// GET ONE (UPDATED with OpenPurchase data)
router.get("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id);
    if (!exp) return res.status(404).json({ message: "Expense not found" });
    
    const expenseObj = exp.toObject();
    
    // Enhance jobSheets with calculated totals
    const enhancedJobSheets = await Promise.all(expenseObj.jobSheets.map(async (jobSheet) => {
      if (!jobSheet.jobSheetNumber) return jobSheet;
      
      const totals = await calculateOpenPurchaseTotals(jobSheet.jobSheetNumber);
      
      // Create a copy of orderExpenses with auto-filled values
      const enhancedOrderExpenses = jobSheet.orderExpenses ? [...jobSheet.orderExpenses] : [];
      
      // Auto-fill Product Cost
      const productCostIndex = enhancedOrderExpenses.findIndex(item => item.section === "Product Cost");
      if (productCostIndex >= 0) {
        enhancedOrderExpenses[productCostIndex] = {
          ...enhancedOrderExpenses[productCostIndex],
          amount: totals.productCost,
          expenseDate: enhancedOrderExpenses[productCostIndex].expenseDate || new Date()
        };
      } else if (totals.productCost > 0) {
        enhancedOrderExpenses.push({
          section: "Product Cost",
          amount: totals.productCost,
          expenseDate: new Date(),
          remarks: "Auto-calculated from OpenPurchase",
          damagedBy: ""
        });
      }
      
      // Auto-fill Branding Cost
      const brandingCostIndex = enhancedOrderExpenses.findIndex(item => item.section === "Branding Cost");
      if (brandingCostIndex >= 0) {
        enhancedOrderExpenses[brandingCostIndex] = {
          ...enhancedOrderExpenses[brandingCostIndex],
          amount: totals.brandingCost,
          expenseDate: enhancedOrderExpenses[brandingCostIndex].expenseDate || new Date()
        };
      } else if (totals.brandingCost > 0) {
        enhancedOrderExpenses.push({
          section: "Branding Cost",
          amount: totals.brandingCost,
          expenseDate: new Date(),
          remarks: "Auto-calculated from OpenPurchase",
          damagedBy: ""
        });
      }
      
      return {
        ...jobSheet,
        orderExpenses: enhancedOrderExpenses,
        calculatedProductCost: totals.productCost,
        calculatedBrandingCost: totals.brandingCost,
        openPurchaseTotals: totals
      };
    }));
    
    res.json({
      ...expenseObj,
      jobSheets: enhancedJobSheets
    });
  } catch (e) {
    console.error("Error fetching expense:", e);
    res.status(500).json({ message: e.message });
  }
});

// UPDATE (UPDATED to preserve auto-calculated values)
router.put("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      opportunityCode,
      clientCompanyName,
      clientName,
      eventName,
      crmName,
      expenses,
      orderConfirmed,
      jobSheets
    } = req.body;

    // Validate required fields
    if (!opportunityCode || !clientCompanyName || !clientName) {
      return res
        .status(400)
        .json({ message: "Missing required fields: opportunityCode, clientCompanyName, or clientName" });
    }
    if (
      opportunityCode.trim() === "" ||
      clientCompanyName.trim() === "" ||
      clientName.trim() === ""
    ) {
      return res.status(400).json({ message: "Required fields cannot be empty strings" });
    }

    // Validate expenses
    if (Array.isArray(expenses) && expenses.length) {
      for (const item of expenses) {
        if (!item.section || item.amount == null || !item.expenseDate) {
          return res
            .status(400)
            .json({ message: "Invalid expense: section, amount, and expenseDate are required" });
        }
        if (item.section === "Damages") {
          if (!item.damagedBy || item.damagedBy.trim() === "") {
            return res
              .status(400)
              .json({ message: "For 'Damages' expense, 'damagedBy' is required." });
          }
        } else {
          item.damagedBy = item.damagedBy ? item.damagedBy : "";
        }
      }
    }

    // Get existing expense to preserve auto-calculated values
    const existingExpense = await Expense.findById(req.params.id);
    if (!existingExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    let finalJobSheets = [];
    if (orderConfirmed && Array.isArray(jobSheets) && jobSheets.length) {
      for (const js of jobSheets) {
        if (!js.jobSheetNumber || js.jobSheetNumber.trim() === "") {
          return res
            .status(400)
            .json({ message: "Invalid jobSheet: jobSheetNumber is required and cannot be empty" });
        }
        
        // Find existing jobSheet to preserve auto-calculated values
        const existingJobSheet = existingExpense.jobSheets.find(
          item => item.jobSheetNumber === js.jobSheetNumber
        );
        
        let orderExpenses = js.orderExpenses || [];
        
        // If this jobSheet has OpenPurchase data, preserve auto-calculated values
        if (existingJobSheet?.calculatedProductCost || existingJobSheet?.calculatedBrandingCost) {
          const totals = await calculateOpenPurchaseTotals(js.jobSheetNumber);
          
          // Update Product Cost in orderExpenses
          const productCostIndex = orderExpenses.findIndex(item => item.section === "Product Cost");
          if (productCostIndex >= 0) {
            orderExpenses[productCostIndex] = {
              ...orderExpenses[productCostIndex],
              amount: totals.productCost,
              expenseDate: orderExpenses[productCostIndex].expenseDate || new Date()
            };
          } else if (totals.productCost > 0) {
            orderExpenses.push({
              section: "Product Cost",
              amount: totals.productCost,
              expenseDate: new Date(),
              remarks: "Auto-calculated from OpenPurchase",
              damagedBy: ""
            });
          }
          
          // Update Branding Cost in orderExpenses
          const brandingCostIndex = orderExpenses.findIndex(item => item.section === "Branding Cost");
          if (brandingCostIndex >= 0) {
            orderExpenses[brandingCostIndex] = {
              ...orderExpenses[brandingCostIndex],
              amount: totals.brandingCost,
              expenseDate: orderExpenses[brandingCostIndex].expenseDate || new Date()
            };
          } else if (totals.brandingCost > 0) {
            orderExpenses.push({
              section: "Branding Cost",
              amount: totals.brandingCost,
              expenseDate: new Date(),
              remarks: "Auto-calculated from OpenPurchase",
              damagedBy: ""
            });
          }
        }
        
        // Validate orderExpenses
        if (Array.isArray(orderExpenses) && orderExpenses.length) {
          for (const item of orderExpenses) {
            if (!item.section || item.amount == null || !item.expenseDate) {
              return res
                .status(400)
                .json({ message: "Invalid orderExpense: section, amount, and expenseDate are required" });
            }
            if (item.section === "Damages") {
              if (!item.damagedBy || item.damagedBy.trim() === "") {
                return res
                  .status(400)
                  .json({ message: "For 'Damages' order expense, 'damagedBy' is required." });
              }
            } else {
              item.damagedBy = item.damagedBy ? item.damagedBy : "";
            }
          }
        }
        
        finalJobSheets.push({
          ...js,
          orderExpenses
        });
      }
    }

    const filter = { _id: req.params.id };
    const exp = await Expense.findOneAndUpdate(
      filter,
      {
        opportunityCode,
        clientCompanyName,
        clientName,
        eventName,
        crmName,
        expenses,
        orderConfirmed,
        jobSheets: orderConfirmed ? finalJobSheets : []
      },
      { new: true }
    );

    if (!exp) return res.status(404).json({ message: "Expense not found" });
    
    // Return enhanced response with calculated totals
    const enhancedExp = exp.toObject();
    const enhancedJobSheets = await Promise.all(enhancedExp.jobSheets.map(async (jobSheet) => {
      if (!jobSheet.jobSheetNumber) return jobSheet;
      
      const totals = await calculateOpenPurchaseTotals(jobSheet.jobSheetNumber);
      
      return {
        ...jobSheet,
        calculatedProductCost: totals.productCost,
        calculatedBrandingCost: totals.brandingCost,
        openPurchaseTotals: totals
      };
    }));
    
    res.json({ 
      message: "Expense updated", 
      expense: {
        ...enhancedExp,
        jobSheets: enhancedJobSheets
      }
    });
  } catch (e) {
    console.error("Error updating expense:", e);
    res.status(500).json({ message: e.message });
  }
});

// DELETE
router.delete("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = await Expense.findOneAndDelete({ _id: req.params.id });
    if (!exp) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (e) {
    console.error("Error deleting expense:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;