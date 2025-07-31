const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/authenticate');
const User = require('../models/User');
const AndroidLocation = require('../models/AndroidLocation');

// 1️⃣ List all users (id + name)
router.get(
  '/users',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const users = await User.find({}, '_id name').lean();
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// 2️⃣ Live location: latest AndroidLocation for a user
router.get(
  '/user/:userId/live-location',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const latest = await AndroidLocation
        .findOne({ user: userId })
        .sort({ timestamp: -1 })
        .lean();
      if (!latest) return res.status(404).json({ message: 'No location found' });
      res.json({ location: latest });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// 3️⃣ Location history: all points for a user on a given date (yyyy-MM-dd)
router.get(
  '/user/:userId/location-history',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { date } = req.query;
      if (!date) return res.status(400).json({ message: 'date=YYYY-MM-DD required' });

      const from = new Date(date + 'T00:00:00Z');
      const to   = new Date(date + 'T23:59:59Z');

      const history = await AndroidLocation
        .find({
          user: userId,
          timestamp: { $gte: from, $lte: to }
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
