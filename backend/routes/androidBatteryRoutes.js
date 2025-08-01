const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const BatteryEvent = require('../models/BatteryEvent');

router.post(
  '/',
  authenticate,
  async (req, res) => {
    try {
      const { level } = req.body;
      console.log('Battery level received:', level); // Log the battery level
      const ev = new BatteryEvent({
        user: req.user._id,
        level,
        timestamp: new Date()
      });
      await ev.save();

      // TODO: trigger push/SMS/email from here if you like

      return res.status(201).json({ message: 'Battery event recorded', ev });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
