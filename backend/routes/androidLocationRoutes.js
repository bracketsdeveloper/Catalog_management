const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const AndroidLocation = require('../models/AndroidLocation');
const haversine = require('haversine-distance');

router.post(
  '/',
  authenticate,
  async (req, res) => {
    try {
      const { latitude, longitude, placeName, timestamp } = req.body;
      const loc = new AndroidLocation({
        user:      req.user._id,
        latitude,
        longitude,
        placeName,
        timestamp: timestamp ? new Date(timestamp) : Date.now()
      });
      await loc.save();
      return res.status(201).json({ message: 'Location saved', loc });
    } catch (err) {
      console.error('Error saving location:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);


router.get('/list', authenticate, async (req, res) => {
    const { date } = req.query;
    const dayStart = new Date(date);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
  
    try {
      const locs = await AndroidLocation.find({
        user: req.user._id,
        timestamp: { $gte: dayStart, $lt: dayEnd }
      }).sort('timestamp');
      return res.json({ locs });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/summary', authenticate, async (req, res) => {
    const { date } = req.query;
    const dayStart = new Date(date);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
  
    try {
      const locs = await AndroidLocation.find({
        user: req.user._id,
        timestamp: { $gte: dayStart, $lt: dayEnd }
      }).sort('timestamp');
  
      let totalDistance = 0;
      let totalTravelTime = 0;
      const locationTimeMap = {}; // { placeName: seconds }
  
      for (let i = 0; i < locs.length; i++) {
        const curr = locs[i];
        const next = locs[i + 1];
        const currTime = curr.timestamp;
        const nextTime = next ? next.timestamp : currTime;
        const duration = (nextTime - currTime) / 1000; // seconds
  
        const place = curr.placeName || 'Unknown';
        locationTimeMap[place] = (locationTimeMap[place] || 0) + duration;
  
        if (next) {
          const dist = haversine(
            { lat: curr.latitude, lon: curr.longitude },
            { lat: next.latitude, lon: next.longitude }
          );
          totalDistance += dist;
          totalTravelTime += duration;
        }
      }
  
      return res.json({
        totalDistance,
        totalTravelTime,
        locationTimeMap
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;
