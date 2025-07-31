// routes/adminMapRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AndroidLocation = require('../models/AndroidLocation');
const { authenticate, authorizeAdmin } = require('../middleware/authenticate');

// List all users (id + name)
router.get('/admin/users', authenticate, authorizeAdmin, async (req, res) => {
  const users = await User.find({}, 'name').lean();
  res.json({ users });
});

// Live location
router.get('/admin/android/location/live', authenticate, authorizeAdmin, async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const loc = await AndroidLocation.findOne({ user: userId })
    .sort({ timestamp: -1 })
    .lean();
  res.json({ location: loc || null });
});

// History for a given date
router.get('/admin/android/location/history', authenticate, authorizeAdmin, async (req, res) => {
  const { userId, date } = req.query;
  if (!userId || !date) 
    return res.status(400).json({ message: 'userId & date required' });

  const dayStart = new Date(date);
  dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const locs = await AndroidLocation.find({
    user: userId,
    timestamp: { $gte: dayStart, $lt: dayEnd }
  })
    .sort('timestamp')
    .lean();

  res.json({ locations: locs });
});

module.exports = router;
