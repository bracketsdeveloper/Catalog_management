const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/authenticate');
const AndroidActivity = require('../models/AndroidActivity');

/**
 * POST /api/android/activity/online
 * Starts a new “online” session for the authenticated user,
 * unless one is already open.
 */
router.post('/online', authenticate, async (req, res) => {
  try {
    // If there’s already an open session, skip creation
    const open = await AndroidActivity.findOne({
      user: req.user._id,
      end: null
    });
    if (open) {
      console.log(`${req.user.name} is already online`);
      return res
        .status(200)
        .json({ message: 'Session already in progress', session: open });
    }

    const session = new AndroidActivity({ user: req.user._id });
    await session.save();

    console.log(`${req.user.name} is now online`);
    res.status(201).json({ message: 'Started online session', session });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/android/activity/offline
 * Closes the currently open session by setting its `end` timestamp.
 */
router.post('/offline', authenticate, async (req, res) => {
  try {
    const session = await AndroidActivity.findOne({
      user: req.user._id,
      end: null
    }).sort({ start: -1 });

    if (!session) {
      console.log(`No active session to close for ${req.user.name}`);
      return res
        .status(400)
        .json({ message: 'No active session to close' });
    }

    session.end = new Date();
    await session.save();

    console.log(`${req.user.name} is now offline`);
    res.status(200).json({ message: 'Session closed', session });
  } catch (err) {
    console.error('Error closing session:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/sessions', authenticate, async (req, res) => {
    try {
      const sessions = await AndroidActivity.find({ user: req.user._id })
        .sort('-start');
      return res.json({ sessions });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  
module.exports = router;
