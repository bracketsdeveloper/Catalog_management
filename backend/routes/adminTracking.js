// routes/adminTracking.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorizeAdmin } = require('../middleware/authenticate');
const AndroidLocation = require('../models/AndroidLocation');
const User = require('../models/User');

/**
 * GET /api/admin/tracking/users
 * Returns an array of all users who have reported at least one location.
 */
router.get(
  '/tracking/users',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      // find distinct user IDs in the locations collection
      const ids = await AndroidLocation.distinct('user');
      // fetch their names
      const users = await User.find({ _id: { $in: ids } })
        .select('name')
        .lean();
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * GET /api/admin/tracking/user/:userId/live-location
 * Returns the very latest location for that user.
 */
router.get(
  '/tracking/user/:userId/live-location',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const loc = await AndroidLocation.findOne({ user: req.params.userId })
        .sort({ timestamp: -1 })
        .lean();
      if (!loc) return res.status(404).json({ message: 'No location found' });
      res.json({ location: loc });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * GET /api/admin/tracking/user/:userId/location-history?date=YYYY-MM-DD
 * Returns that user’s recorded locations for the given date.
 */
router.get(
  '/tracking/user/:userId/location-history',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ message: 'date query param required' });
      }
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const history = await AndroidLocation.find({
        user: mongoose.Types.ObjectId(req.params.userId),
        timestamp: { $gte: dayStart, $lt: dayEnd }
      })
        .sort({ timestamp: 1 })
        .lean();

      res.json({ history });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
