const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

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
        // NEW: If section is Damages, damagedBy is required
        if (item.section === "Damages") {
          if (!item.damagedBy || item.damagedBy.trim() === "") {
            return res
              .status(400)
              .json({ message: "For 'Damages' expense, 'damagedBy' is required." });
          }
        } else {
          // normalize non-damage items
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
            // NEW: If section is Damages, damagedBy is required
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

// LIST & SEARCH
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
    res.json(list);
  } catch (e) {
    console.error("Error fetching expenses:", e);
    res.status(500).json({ message: e.message });
  }
});

// GET ONE (FIXED: was using findAll incorrectly)
router.get("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id);
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

    // Validate jobSheets
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
        jobSheets: orderConfirmed ? jobSheets : []
      },
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
    const exp = await Expense.findOneAndDelete({ _id: req.params.id });
    if (!exp) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (e) {
    console.error("Error deleting expense:", e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;