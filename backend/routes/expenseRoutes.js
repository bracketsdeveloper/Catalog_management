const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// CREATE
router.post("/expenses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exp = new Expense({
      ...req.body,
      createdBy: req.user._id // Set createdBy to the authenticated user's ID
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
    const userName = req.user.name; // Assuming req.user.name holds the user's name (crmName)

    let filter = {};

    // Apply search term filter if provided
    if (searchTerm) {
      filter.$or = [
        { opportunityCode: new RegExp(searchTerm, "i") },
        { clientCompanyName: new RegExp(searchTerm, "i") }
      ];
    }

    // Restrict to user's own expenses or expenses where they are crmName for non-super admins with manage-expenses permission
    // if (!isSuperAdmin && permissions.includes("manage-expenses")) {
    //   filter.$or = [
    //     { createdBy: userId },
    //     { crmName: userName }
    //   ];
    // }

    const list = await Expense.find(filter).sort({ createdAt: -1 });
    res.json(list);
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

    // Restrict to user's own expense or expenses where they are crmName for non-super admins with manage-expenses permission
    if (!isSuperAdmin && permissions.includes("manage-expenses")) {
      filter.$or = [
        { createdBy: userId },
        { crmName: userName }
      ];
    }

    const exp = await Expense.findOne(filter);
    if (!exp) return res.status(404).json({ message: "Not found" });
    res.json(exp);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// UPDATE
router.put("/expenses/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const permissions = req.user.permissions || [];
    const userId = req.user._id;
    const userName = req.user.name;
    const filter = { _id: req.params.id };

    // Restrict to user's own expense or expenses where they are crmName for non-super admins with manage-expenses permiss

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

    // Restrict to user's own expense or expenses where they are crmName for non-super admins with manage-expenses permission
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