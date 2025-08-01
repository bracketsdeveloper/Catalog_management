// routes/arrivalRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const Destination = require('../models/Destination');
const DestinationArrival = require('../models/DestinationArrival');

/**
 * POST /api/android/destination/:destId/arrival
 *  - save an arrival record
 *  - mark the Destination.reached = true, reachedAt = timestamp
 */
router.post(
  '/android/destination/:destId/arrival',
  authenticate,
  async (req, res) => {
    try {
      const { destId } = req.params;
      const dest = await Destination.findOne({
        _id: destId,
        user: req.user._id
      });
      if (!dest) {
        return res.status(404).json({ message: 'Destination not found' });
      }

      // build/s and save the arrival
      const ts = req.body.timestamp ? new Date(req.body.timestamp) : new Date();
      const arrival = new DestinationArrival({
        user: req.user._id,
        destination: destId,
        timestamp: ts
      });
      await arrival.save();

      // flip the reached flag
      dest.reached = true;
      dest.reachedAt = ts;
      await dest.save();

      res.status(201).json({ message: 'Arrival recorded', arrival, dest });
    } catch (err) {
      console.error('Error in arrival route:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
