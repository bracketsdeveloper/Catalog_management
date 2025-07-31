// routes/adminDestinations.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/authenticate');
const Destination = require('../models/Destination');

/**
 * GET  /api/admin/users/:userId/destinations
 * — returns this user’s destinations, ordered by priority
 */
router.get(
  '/admin/users/:userId/destinations',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const { userId } = req.params;
    try {
      const dests = await Destination.find({ user: userId })
        .sort('priority')
        .lean();
      res.json({ destinations: dests });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/admin/users/:userId/destinations
 * Body: { destinations: [ { name, latitude, longitude, priority }, … ] }
 * — replaces all of that user’s destinations in one go
 */
router.post(
  '/admin/users/:userId/destinations',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const { userId } = req.params;
    const { destinations } = req.body;
    if (!Array.isArray(destinations)) {
      return res.status(400).json({ message: 'destinations must be an array' });
    }
    try {
      // 1) delete old
      await Destination.deleteMany({ user: userId });

      // 2) insert new, preserving priority
      const docs = destinations.map(d => ({
        user:      userId,
        name:      d.name,
        latitude:  d.latitude,
        longitude: d.longitude,
        priority:  d.priority
      }));
      await Destination.insertMany(docs);

      res.status(201).json({ message: 'Destinations saved', count: docs.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
