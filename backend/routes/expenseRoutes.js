const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Helper to validate no duplicate sections - REMOVED since we now allow duplicates
// const validateNoDuplicateSections = (items, type) => {
//   const sections = items.map(item => item.section);
//   const duplicates = sections.filter((item, index) => sections.indexOf(item) !== index);
//   if (duplicates.length > 0) {
//     return `Duplicate ${type} sections found: ${duplicates.join(", ")}`;
//   }
//   return null;
// };

// CREATE
router.post("/expenses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { opportunityCode, clientCompanyName, clientName, eventName, crmName, expenses, orderConfirmed, jobSheets } = req.body;

    // Validate required fields
    if (!opportunityCode || !clientCompanyName || !clientName) {
      return res.status(400).json({ message: "Missing required fields: opportunityCode, clientCompanyName, or clientName" });
    }
    if (opportunityCode.trim() === "" || clientCompanyName.trim() === "" || clientName.trim() === "") {
      return res.status(400).json({ message: "Required fields cannot be empty strings" });
    }

    // Validate expenses subdocuments
    if (expenses && expenses.length) {
      for (const item of expenses) {
        if (!item.section || item.amount == null || !item.expenseDate) {
          return res.status(400).json({ message: "Invalid expense: section, amount, and expenseDate are required" });
        }
      }
      // Removed duplicate validation - now allows multiple entries of same section
    }

    // Validate jobSheets subdocuments
    if (orderConfirmed && jobSheets && jobSheets.length) {
      for (const js of jobSheets) {
        if (!js.jobSheetNumber || js.jobSheetNumber.trim() === "") {
          return res.status(400).json({ message: "Invalid jobSheet: jobSheetNumber is required and cannot be empty" });
        }
        if (js.orderExpenses && js.orderExpenses.length) {
          for (const item of js.orderExpenses) {
            if (!item.section || item.amount == null || !item.expenseDate) {
              return res.status(400).json({ message: "Invalid orderExpense: section, amount, and expenseDate are required" });
            }
          }
          // Removed duplicate validation - now allows multiple entries of same section
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

// LIST & SEARCH
router.get("/expenses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const isSuperAdmin = req.user.isSuperAdmin;
    const permissions = req.user.permissions || [];
    const userId = req.user._id;
    const userName = req.user.name;

    let filter = {};

    if (searchTerm) {
      filter.$or = [
        { opportunityCode: new RegExp(searchTerm, "i") },
        { clientCompanyName: new RegExp(searchTerm, "i") }
      ];
    }

   

    const list = await Expense.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    console.error("Error fetching expenses:", e);
    res.status(500).json({ message: e.message });
  }
});

// GET ONE
router.get("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.isSuperAdmin;
    const permissions = req.user.permissions || [];
    const userId = req.user._id;
    const userName = req.user.name;

    const filter = { _id: req.params.id };

    if (!isSuperAdmin && permissions.includes("manage-expenses")) {
      filter.$or = [
        
      ];
    }

    const exp = await Expense.findAll();
    if (!exp) return res.status(404).json({ message: "Expense not found" });

    res.json(exp);
  } catch (e) {
    console.error("Error fetching expense:", e);
    res.status(500).json({ message: e.message });
  }
});

// UPDATE
router.put("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { opportunityCode, clientCompanyName, clientName, eventName, crmName, expenses, orderConfirmed, jobSheets } = req.body;

    // Validate required fields
    if (!opportunityCode || !clientCompanyName || !clientName) {
      return res.status(400).json({ message: "Missing required fields: opportunityCode, clientCompanyName, or clientName" });
    }
    if (opportunityCode.trim() === "" || clientCompanyName.trim() === "" || clientName.trim() === "") {
      return res.status(400).json({ message: "Required fields cannot be empty strings" });
    }

    // Validate expenses subdocuments
    if (expenses && expenses.length) {
      for (const item of expenses) {
        if (!item.section || item.amount == null || !item.expenseDate) {
          return res.status(400).json({ message: "Invalid expense: section, amount, and expenseDate are required" });
        }
      }
      // Removed duplicate validation - now allows multiple entries of same section
    }

    // Validate jobSheets subdocuments
    if (orderConfirmed && jobSheets && jobSheets.length) {
      for (const js of jobSheets) {
        if (!js.jobSheetNumber || js.jobSheetNumber.trim() === "") {
          return res.status(400).json({ message: "Invalid jobSheet: jobSheetNumber is required and cannot be empty" });
        }
        if (js.orderExpenses && js.orderExpenses.length) {
          for (const item of js.orderExpenses) {
            if (!item.section || item.amount == null || !item.expenseDate) {
              return res.status(400).json({ message: "Invalid orderExpense: section, amount, and expenseDate are required" });
            }
          }
          // Removed duplicate validation - now allows multiple entries of same section
        }
      }
    }

    const filter = { _id: req.params.id };
    const exp = await Expense.findOneAndUpdate(
      filter,
      { ...req.body, jobSheets: orderConfirmed ? jobSheets : [] },
      { new: true }
    );
    if (!exp) return res.status(404).json({ message: "Expense not found" });

    res.json({ message: "Expense updated", expense: exp });
  } catch (e) {
    console.error("Error updating expense:", e);
    res.status(500).json({ message: e.message });
  }
});

// DELETE
router.delete("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const isSuperAdmin = req.user.isSuperAdmin;
    const permissions = req.user.permissions || [];
    const userId = req.user._id;
    const userName = req.user.name;

    const filter = { _id: req.params.id };

    if (!isSuperAdmin && permissions.includes("manage-expenses")) {
      filter.$or = [
        { createdBy: userId },
        { crmName: userName }
      ];
    }

    const exp = await Expense.findOneAndDelete(filter);
    if (!exp) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (e) {
    console.error("Error deleting expense:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;