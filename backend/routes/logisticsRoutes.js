// backend/routes/logisticsRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// cost constants
const BASE_FARE = 50;      // ₹50 flat
const RATE_PER_KM = 10;    // ₹10 per km
const RATE_PER_KG = 45;    // ₹45 per kg

/**
 * Geocode a freeform query via Nominatim → returns { lat, lon }
 */

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search`;
  const res = await axios.get(url, {
    params: { q: query, format: "json", limit: 1 },
    headers: { "User-Agent": "YourAppName/1.0" }
  });
  if (!res.data.length) {
    throw new Error(`Could not geocode "${query}"`);
  }
  return {
    lat: parseFloat(res.data[0].lat),
    lon: parseFloat(res.data[0].lon),
  };
}

/**
 * GET /api/logistics/calculate
 *
 * Accepts either:
 *   • originPlace & destPlace
 *   • originPincode & destPincode
 *   • originLat/originLon & destLat/destLon
 *
 * plus:
 *   • weight  (kg)
 *
 * Returns: { distanceKm, cost }
 */
router.get(
  "/calculate",
//   authenticate,
//   authorizeAdmin,
  async (req, res) => {
    try {
      let {
        originPlace, destPlace,
        originPincode, destPincode,
        originLat, originLon,
        destLat, destLon,
        weight
      } = req.query;

      // validate weight
      const pkgWeight = parseFloat(weight);
      if (isNaN(pkgWeight) || pkgWeight < 0) {
        return res.status(400).json({ message: "Invalid or missing weight" });
      }

      // geocode by pincode if provided
      if (originPincode) {
        const geo = await geocode(`${originPincode}, India`);
        originLat = geo.lat; originLon = geo.lon;
      }
      if (destPincode) {
        const geo = await geocode(`${destPincode}, India`);
        destLat = geo.lat; destLon = geo.lon;
      }

      // geocode by place name if provided
      if (originPlace) {
        const geo = await geocode(originPlace);
        originLat = geo.lat; originLon = geo.lon;
      }
      if (destPlace) {
        const geo = await geocode(destPlace);
        destLat = geo.lat; destLon = geo.lon;
      }

      // ensure we have coords
      if (!originLat || !originLon || !destLat || !destLon) {
        return res.status(400).json({
          message:
            "You must supply either originPincode/destPincode, originPlace/destPlace, or originLat+originLon/destLat+destLon"
        });
      }

      // call OSRM for route distance
      const osrmUrl =
        `http://router.project-osrm.org/route/v1/driving/` +
        `${originLon},${originLat};${destLon},${destLat}` +
        `?overview=false`;
      const osrmRes = await axios.get(osrmUrl);
      if (!osrmRes.data.routes?.length) {
        return res.status(502).json({ message: "Routing error from OSRM" });
      }
      const distanceKm = osrmRes.data.routes[0].distance / 1000;

      // compute cost
      const cost =
        BASE_FARE +
        RATE_PER_KM * distanceKm +
        RATE_PER_KG * pkgWeight;

      return res.json({
        distanceKm: Number(distanceKm.toFixed(2)),
        cost: Number(cost.toFixed(2)),
      });
    } catch (err) {
      console.error("Error in /calculate:", err);
      return res
        .status(500)
        .json({ message: err.message || "Server error calculating cost" });
    }
  }
);

module.exports = router;
