// routes/adminLocationRoutes.js

const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const AndroidLocation = require("../models/AndroidLocation.js");
const User = require("../models/User");

/**
 * GET /api/admin/users
 * Returns list of all users (id + name) for the dropdown.
 */
router.get(
  "/admin/users",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const users = await User.find({}, "_id name").lean();
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * GET /api/admin/location/live?userId={userId}
 * Returns the most-recent location record for that user.
 */
router.get(
  "/admin/location/live",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId required" });

    try {
      const loc = await AndroidLocation.findOne({ user: userId })
        .sort({ timestamp: -1 })
        .lean();
      res.json({ location: loc });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * GET /api/admin/location/history?userId={userId}&date={YYYY-MM-DD}
 * Returns all location records for that user on the given date, sorted by time.
 */
router.get(
  "/admin/location/history",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const { userId, date } = req.query;
    if (!userId || !date)
      return res
        .status(400)
        .json({ message: "userId and date (YYYY-MM-DD) required" });

    const day = new Date(date);
    const start = new Date(day.setHours(0, 0, 0, 0));
    const end = new Date(day.setHours(23, 59, 59, 999));

    try {
      const locs = await AndroidLocation.find({
        user: userId,
        timestamp: { $gte: start, $lte: end },
      })
        .sort({ timestamp: 1 })
        .lean();
      res.json({ locations: locs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
