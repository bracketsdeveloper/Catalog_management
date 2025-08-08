// routes/destinationRoutes.js

const express = require("express");
const axios   = require("axios");
const router  = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Destination = require("../models/Destination");

// Google APIs configuration
const GEOCODE_URL             = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const PLACES_DETAILS_URL      = "https://maps.googleapis.com/maps/api/place/details/json";
const API_KEY                 = process.env.GOOGLE_GEOCODING_API_KEY;
// Ensure this key has Geocoding, Places Autocomplete, and Places Details enabled and properly restricted

/**
 * Helper: Geocode a free-form address string
 */
async function geocodeAddress(address) {
  const resp = await axios.get(GEOCODE_URL, {
    params: { address, key: API_KEY },
    timeout: 5000,
  });
  if (resp.data.status !== "OK" || !resp.data.results.length) {
    throw new Error(`Geocoding failed: ${resp.data.status}`);
  }
  const loc = resp.data.results[0].geometry.location;
  return { latitude: loc.lat, longitude: loc.lng };
}

// ——————————————————————————————
// DESTINATION CRUD
// ——————————————————————————————

/**
 * POST /users/:userId/destinations
 * Admin only: replace a user's destinations
 *
 * Expects req.body.destinations = [
 *   { name, latitude, longitude, priority, date (ISO string) },
 *   ...
 * ]
 */
router.post(
  "/users/:userId/destinations",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const { userId }       = req.params;
    const { destinations } = req.body;

    if (!Array.isArray(destinations)) {
      return res.status(400).json({ message: "destinations must be an array" });
    }

    // Validate each entry
    const invalid = destinations.some(d =>
      !d.name ||
      typeof d.latitude !== "number" ||
      typeof d.longitude !== "number" ||
      !Number.isInteger(d.priority) ||
      d.priority < 1 ||
      d.priority > 6 ||
      !d.date ||
      isNaN(Date.parse(d.date))
    );
    if (invalid) {
      return res.status(400).json({
        message:
          "Each destination must have name (string), latitude (number)," +
          " longitude (number), priority (1–6), and date (valid ISO string)."
      });
    }

    try {
      // Remove existing
      await Destination.deleteMany({ user: userId });

      // Build new docs
      const docs = destinations.map(d => ({
        user:      userId,
        name:      d.name,
        latitude:  d.latitude,
        longitude: d.longitude,
        priority:  d.priority,
        date:      new Date(d.date),
        reached:   false
      }));

      const inserted = await Destination.insertMany(docs);
      res.status(201).json({ message: "Destinations set", count: inserted.length });
    } catch (err) {
      console.error("POST /users/:userId/destinations error:", err);
      res.status(500).json({ message: "Server error saving destinations" });
    }
  }
);

/**
 * GET /android/destinations
 * Android client: get own destinations, sorted by priority
 */
router.get("/android/destinations", authenticate, async (req, res) => {
  try {
    const dests = await Destination.find({ user: req.user._id })
      .sort({ priority: 1 })
      .lean();
    res.json({ destinations: dests });
  } catch (err) {
    console.error("GET /android/destinations error:", err);
    res.status(500).json({ message: "Server error fetching destinations" });
  }
});

/**
 * GET /users/:userId/destinations
 * Admin only: fetch any user's destinations, sorted by priority
 */
router.get(
  "/users/:userId/destinations",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const { userId } = req.params;
    try {
      const dests = await Destination.find({ user: userId })
        .sort({ priority: 1 })
        .lean();
      res.json({ destinations: dests });
    } catch (err) {
      console.error("GET /users/:userId/destinations error:", err);
      res.status(500).json({ message: "Server error fetching destinations" });
    }
  }
);

/**
 * PATCH /destinations/:destinationId/reached
 * Mark a destination as reached for the authenticated user
 */
router.patch(
  "/destinations/:destinationId/reached",
  authenticate,
  async (req, res) => {
    const { destinationId } = req.params;
    try {
      const dest = await Destination.findOne({
        _id: destinationId,
        user: req.user._id
      });
      if (!dest) {
        return res.status(404).json({ message: "Destination not found" });
      }
      dest.reached   = true;
      dest.reachedAt = new Date();
      await dest.save();
      res.json({ message: "Destination marked as reached", destination: dest });
    } catch (err) {
      console.error("PATCH /destinations/:destinationId/reached error:", err);
      res.status(500).json({ message: "Server error updating destination" });
    }
  }
);

// ——————————————————————————————
// PLACES: autocomplete & details (enhanced for accuracy & bias)
// ——————————————————————————————

/**
 * GET /places/autocomplete
 * Returns richer place suggestions (addresses, POIs, regions).
 * Optional query params: lat, lng to bias results.
 */
router.get("/places/autocomplete", authenticate, async (req, res) => {
  const { input, lat, lng } = req.query;
  if (!input) {
    return res.status(400).json({ message: "input parameter required" });
  }

  try {
    const params = {
      input,
      key: API_KEY,
      components: "country:in",
      sessiontoken: req.sessionID,
      ...(lat && lng ? { location: `${lat},${lng}`, radius: 50000 } : {})
    };

    const { data } = await axios.get(PLACES_AUTOCOMPLETE_URL, { params, timeout: 5000 });
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Autocomplete error: ${data.status}`);
    }

    const suggestions = (data.predictions || []).map(p => ({
      description: p.description,
      placeId:     p.place_id,
      types:       p.types
    }));

    res.json({ suggestions });
  } catch (err) {
    console.error("GET /places/autocomplete error:", err);
    res.status(502).json({ message: "Failed to fetch autocomplete suggestions" });
  }
});

/**
 * GET /places/details
 * Given a placeId, returns detailed info.
 */
router.get("/places/details", authenticate, async (req, res) => {
  const { placeId } = req.query;
  if (!placeId) {
    return res.status(400).json({ message: "placeId parameter required" });
  }

  try {
    const params = {
      place_id:      placeId,
      key:           API_KEY,
      fields:        "geometry,formatted_address,name,place_id,types,website,formatted_phone_number",
      sessiontoken:  req.sessionID
    };

    const { data } = await axios.get(PLACES_DETAILS_URL, { params, timeout: 5000 });
    if (data.status !== "OK") {
      throw new Error(`Place details error: ${data.status}`);
    }

    const r = data.result;
    res.json({
      placeId:     r.place_id,
      name:        r.name,
      address:     r.formatted_address,
      coords: {
        latitude:  r.geometry.location.lat,
        longitude: r.geometry.location.lng
      },
      types:       r.types,
      website:     r.website || null,
      phoneNumber: r.formatted_phone_number || null
    });
  } catch (err) {
    console.error("GET /places/details error:", err);
    res.status(502).json({ message: "Failed to fetch place details" });
  }
});

module.exports = router;
