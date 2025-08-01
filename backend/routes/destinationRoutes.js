// routes/destinationRoutes.js

const express = require("express");
const axios = require("axios");
const router = express.Router();
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Destination = require("../models/Destination");

// Google APIs configuration
const GEOCODE_URL              = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_AUTOCOMPLETE_URL  = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const PLACES_DETAILS_URL       = "https://maps.googleapis.com/maps/api/place/details/json";
const API_KEY                  = process.env.GOOGLE_GEOCODING_API_KEY; 
// Ensure this key has Geocoding **and** Places API enabled, and is properly restricted

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
 */
router.post(
  "/users/:userId/destinations",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    const { userId } = req.params;
    const { destinations } = req.body;

    if (!Array.isArray(destinations)) {
      return res.status(400).json({ message: "destinations must be an array" });
    }
    if (
      destinations.some(
        (d) =>
          !d.name ||
          typeof d.latitude !== "number" ||
          typeof d.longitude !== "number" ||
          !Number.isInteger(d.priority) ||
          d.priority < 1 ||
          d.priority > 6
      )
    ) {
      return res.status(400).json({
        message:
          "Each destination must have name, latitude, longitude, and priority (1-6)",
      });
    }

    try {
      await Destination.deleteMany({ user: userId });
      const docs = destinations.map((d) => ({
        user: userId,
        name: d.name,
        latitude: d.latitude,
        longitude: d.longitude,
        priority: d.priority,
        reached: false,
      }));
      await Destination.insertMany(docs);
      res.status(201).json({ message: "Destinations set", count: docs.length });
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
        user: req.user._id,
      });
      if (!dest) {
        return res.status(404).json({ message: "Destination not found" });
      }
      dest.reached = true;
      dest.reachedAt = new Date();
      await dest.save();
      res.json({ message: "Destination marked as reached", destination: dest });
    } catch (err) {
      console.error(
        "PATCH /destinations/:destinationId/reached error:",
        err
      );
      res.status(500).json({ message: "Server error updating destination" });
    }
  }
);

// ——————————————————————————————
// PLACES: Google-backed search & geocode
// ——————————————————————————————

/**
 * GET /places/suggestions
 * Alias for autocomplete, kept for backward compatibility.
 * Client passes `?query=…`.
 */
router.get("/places/suggestions", authenticate, async (req, res) => {
  const { query: input } = req.query;
  if (!input) {
    return res.status(400).json({ message: "query parameter required" });
  }
  try {
    const resp = await axios.get(PLACES_AUTOCOMPLETE_URL, {
      params: {
        input,
        key: API_KEY,
        components: "country:in",
        types: "geocode",
      },
      timeout: 5000,
    });

    if (resp.data.status !== "OK" && resp.data.status !== "ZERO_RESULTS") {
      throw new Error(`Autocomplete error: ${resp.data.status}`);
    }

    const suggestions = (resp.data.predictions || []).map((p) => ({
      description: p.description,
      placeId: p.place_id,
    }));
    res.json({ suggestions });
  } catch (err) {
    console.error("GET /places/suggestions error:", err);
    res
      .status(502)
      .json({ message: "Failed to fetch suggestions from autocomplete API" });
  }
});

/**
 * GET /places/autocomplete
 * More REST-y name for the same functionality.
 */
router.get("/places/autocomplete", authenticate, async (req, res) => {
  const { input } = req.query;
  if (!input) {
    return res.status(400).json({ message: "input parameter required" });
  }
  try {
    const resp = await axios.get(PLACES_AUTOCOMPLETE_URL, {
      params: {
        input,
        key: API_KEY,
        components: "country:in",
        types: "geocode",
      },
      timeout: 5000,
    });

    if (resp.data.status !== "OK" && resp.data.status !== "ZERO_RESULTS") {
      throw new Error(`Autocomplete error: ${resp.data.status}`);
    }

    const suggestions = (resp.data.predictions || []).map((p) => ({
      description: p.description,
      placeId: p.place_id,
    }));
    res.json({ suggestions });
  } catch (err) {
    console.error("GET /places/autocomplete error:", err);
    res
      .status(502)
      .json({ message: "Failed to fetch suggestions from autocomplete API" });
  }
});

/**
 * GET /places/details
 * Given a Google placeId, return its precise coords and name/address.
 */
router.get("/places/details", authenticate, async (req, res) => {
  const { placeId } = req.query;
  if (!placeId) {
    return res.status(400).json({ message: "placeId parameter required" });
  }
  try {
    const resp = await axios.get(PLACES_DETAILS_URL, {
      params: {
        place_id: placeId,
        key: API_KEY,
        fields: "geometry,formatted_address,name",
      },
      timeout: 5000,
    });

    if (resp.data.status !== "OK") {
      throw new Error(`Place details error: ${resp.data.status}`);
    }

    const { geometry, formatted_address, name } = resp.data.result;
    res.json({
      name,
      address: formatted_address,
      coords: {
        latitude: geometry.location.lat,
        longitude: geometry.location.lng,
      },
    });
  } catch (err) {
    console.error("GET /places/details error:", err);
    res.status(502).json({ message: "Failed to fetch place details" });
  }
});

module.exports = router;
