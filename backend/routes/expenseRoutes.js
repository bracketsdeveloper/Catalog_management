// routes/expenseRoutes.js
const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// CREATE
router.post("/expenses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = new Expense(req.body);
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
    const filter = searchTerm
      ? {
          $or: [
            { opportunityCode: new RegExp(searchTerm, "i") },
            { clientCompanyName: new RegExp(searchTerm, "i") }
          ]
        }
      : {};
    const list = await Expense.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET ONE
router.get("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = await Expense.findById(req.params.id);
    if (!exp) return res.status(404).json({ message: "Not found" });
    res.json(exp);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// UPDATE
router.put("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exp) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Expense updated", expense: exp });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE
router.delete("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
