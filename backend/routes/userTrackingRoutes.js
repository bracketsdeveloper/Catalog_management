// routes/userTrackingRoutes.js

const express = require("express");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const User = require("../models/User");
const AndroidLocation = require("../models/AndroidLocation");
const AndroidActivity = require("../models/AndroidActivity");

// 1) List all users (for dropdown)
router.get(
  "/users",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const users = await User.find({}, "_id name").lean();
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// 2) “All users” locations (live or history)
router.get(
  "/tracking/all/locations",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { date } = req.query;
      let locs;
      const userStatus = {};

      if (date) {
        // History: all users on a specific date
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        locs = await AndroidLocation.find({
          timestamp: { $gte: dayStart, $lt: dayEnd },
        })
          .populate("user", "name")
          .sort({ timestamp: 1 })
          .lean();
      } else {
        // Live: latest location per user
        locs = await AndroidLocation.aggregate([
          { $sort: { user: 1, timestamp: -1 } },
          {
            $group: {
              _id: "$user",
              latitude: { $first: "$latitude" },
              longitude: { $first: "$longitude" },
              placeName: { $first: "$placeName" },
              timestamp: { $first: "$timestamp" },
              user: { $first: "$user" },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              latitude: 1,
              longitude: 1,
              placeName: 1,
              timestamp: 1,
              "user._id": 1,
              "user.name": 1,
            },
          },
        ]);
      }

      // Build online/offline status
      const activities = await AndroidActivity.find({ end: null })
        .sort({ start: -1 })
        .lean();
      activities.forEach((act) => {
        userStatus[act.user.toString()] = { isOnline: true };
      });
      locs.forEach((loc) => {
        const uid = loc.user?._id?.toString();
        if (uid && !userStatus[uid]) {
          userStatus[uid] = { isOnline: false };
        }
      });

      res.json({ locs, userStatus });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// 3) Single-user locations (live or history)
router.get(
  "/tracking/:userId/locations",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { date } = req.query;
      const query = { user: userId };

      if (date) {
        // History for one user
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        query.timestamp = { $gte: dayStart, $lt: dayEnd };
      }

      // For live: limit to 1; for history: get all
      const locs = await AndroidLocation.find(query)
        .sort({ timestamp: date ? 1 : -1 })
        .limit(date ? 0 : 1)
        .lean();

      // Online status for that user
      const activity = await AndroidActivity.findOne({
        user: userId,
        end: null,
      })
        .sort({ start: -1 })
        .lean();
      const isOnline = !!activity;

      res.json({ locs, userStatus: { [userId]: { isOnline } } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
