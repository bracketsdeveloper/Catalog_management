// routes/adminPlaces.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/authenticate');

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Autocomplete suggestions
router.get(
  '/admin/places/autocomplete',
  async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ message: 'q required' });

    const api = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const { data } = await axios.get(api, { params: { input: q, key: GOOGLE_KEY } });
    res.json(data);
  }
);

// Place details (to get lat/lng)
router.get(
  '/admin/places/details',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const pid = req.query.place_id;
    if (!pid) return res.status(400).json({ message: 'place_id required' });

    const api = 'https://maps.googleapis.com/maps/api/place/details/json';
    const { data } = await axios.get(api, {
      params: { place_id: pid, key: GOOGLE_KEY, fields: 'geometry,name,formatted_address' }
    });
    res.json(data);
  }
);

module.exports = router;
