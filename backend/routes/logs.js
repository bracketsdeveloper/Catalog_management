const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const User = require("../models/User");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// GET all logs with filters and pagination
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { action, field, performedBy, startDate, endDate, page = 1, limit = 10 } = req.query;

    let filter = {};
    if (action) filter.action = action;
    if (field) filter.field = field;
    if (performedBy) filter.performedBy = performedBy;
    if (startDate || endDate) {
      filter.performedAt = {};
      if (startDate) filter.performedAt.$gte = new Date(startDate);
      if (endDate) filter.performedAt.$lte = new Date(endDate);
    }

    const logs = await Log.find(filter)
      .populate("performedBy", "email name") // Populate email and name
      .sort({ performedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Map logs to ensure performedBy always has a string value
    const formattedLogs = logs.map(log => ({
      ...log._doc,
      performedBy: log.performedBy
        ? { email: log.performedBy.email, name: log.performedBy.name }
        : log.performedBy // Fallback to raw ID if user not found
    }));

    const totalLogs = await Log.countDocuments(filter);

    res.json({
      logs: formattedLogs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: Number(page),
      totalLogs,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Server error fetching logs" });
  }
});

// GET single log by ID
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const log = await Log.findById(req.params.id).populate("performedBy", "email name");
    if (!log) return res.status(404).json({ message: "Log not found" });

    const formattedLog = {
      ...log._doc,
      performedBy: log.performedBy
        ? { email: log.performedBy.email, name: log.performedBy.name }
        : log.performedBy
    };

    res.json(formattedLog);
  } catch (error) {
    console.error("Error fetching log:", error);
    res.status(500).json({ message: "Server error fetching log" });
  }
});

module.exports = router;