const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// CREATE
router.post("/expenses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = new Expense({
      ...req.body,
      createdBy: req.user._id
    });
    await exp.save();
    res.status(201).json({ message: "Expense created", expense: exp });
  } catch (e) {
    res.status(500).json({ message: e.message });
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

    // Normalize data for backward compatibility
    const normalizedList = list.map(exp => {
      if (!exp.jobSheets && (exp.jobSheetNumber || exp.orderExpenses)) {
        exp.jobSheets = [{ jobSheetNumber: exp.jobSheetNumber || "", orderExpenses: exp.orderExpenses || [] }];
      }
      return exp;
    });

    res.json(normalizedList);
  } catch (e) {
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
        { createdBy: userId },
        { crmName: userName }
      ];
    }

    const exp = await Expense.findOne(filter);
    if (!exp) return res.status(404).json({ message: "Not found" });

    // Normalize data for backward compatibility
    if (!exp.jobSheets && (exp.jobSheetNumber || exp.orderExpenses)) {
      exp.jobSheets = [{ jobSheetNumber: exp.jobSheetNumber || "", orderExpenses: exp.orderExpenses || [] }];
    }

    res.json(exp);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// UPDATE
router.put("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    const exp = await Expense.findOneAndUpdate(filter, req.body, { new: true });
    if (!exp) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Expense updated", expense: exp });
  } catch (e) {
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
    if (!exp) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Expense deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;