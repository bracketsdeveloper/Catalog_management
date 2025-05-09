const express = require("express");
const router = express.Router();
const axios = require("axios");
// const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Cost constants (inspired by Shiprocket/DTDC)
const ZONES = {
  LOCAL: { maxDistanceKm: 50, surfaceBase: 40 }, // Within city
  REGIONAL: { maxDistanceKm: 500, surfaceBase: 60 }, // Same state
  NATIONAL: { maxDistanceKm: Infinity, airBase: 100 }, // Different state
};

const RATE_PER_KG = {
  SURFACE: { LOCAL: 30, REGIONAL: 50 }, // ₹/kg
  AIR: { NATIONAL: 120 }, // ₹/kg
};

const FUEL_SURCHARGE = 0.15; // 15% of base + weight cost
const GST_RATE = 0.18; // 18% GST
const MIN_CHARGEABLE_WEIGHT = 0.5; // Minimum 0.5kg

/**
 * Geocode a pincode or freeform query via Nominatim → returns { lat, lon, state, city }
 */
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search`;
  try {
    const res = await axios.get(url, {
      params: { q: query, format: "json", limit: 1, addressdetails: 1 },
      headers: { "User-Agent": "YourAppName/1.0" },
    });
    if (!res.data.length) {
      throw new Error(`Could not geocode "${query}"`);
    }
    const { lat, lon, address } = res.data[0];
    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      state: address.state || address.state_district || "",
      city: address.city || address.town || address.village || address.county || "",
    };
  } catch (err) {
    throw new Error(`Geocoding failed for "${query}": ${err.message}`);
  }
}

/**
 * Determine zone and service type based on pincode or distance
 */
async function getZoneAndServiceType(originPincode, destPincode, distanceKm) {
  let zone;
  if (originPincode && destPincode) {
    // Fetch state and city for both pincodes in real-time
    const originGeo = await geocode(`${originPincode}, India`);
    const destGeo = await geocode(`${destPincode}, India`);

    const originCity = originGeo.city;
    const destCity = destGeo.city;
    const originState = originGeo.state;
    const destState = destGeo.state;

    if (originCity && destCity && originCity.toLowerCase() === destCity.toLowerCase()) {
      zone = "LOCAL";
    } else if (originState && destState && originState.toLowerCase() === destState.toLowerCase()) {
      zone = "REGIONAL";
    } else {
      zone = "NATIONAL";
    }
  } else {
    // Fallback to distance-based zoning
    if (distanceKm <= ZONES.LOCAL.maxDistanceKm) zone = "LOCAL";
    else if (distanceKm <= ZONES.REGIONAL.maxDistanceKm) zone = "REGIONAL";
    else zone = "NATIONAL";
  }

  // Auto-choose service type
  const serviceType = zone === "NATIONAL" ? "air" : "surface";
  return { zone, serviceType };
}

/**
 * GET /api/logistics/calculate
 *
 * Query params:
 *   - originPincode, destPincode: Indian pincodes
 *   - originPlace, destPlace: Freeform addresses
 *   - originLat, originLon, destLat, destLon: Coordinates
 *   - weight: Package weight in kg
 *
 * Returns: { distanceKm, cost, breakdown }
 */
router.get("/calculate", async (req, res) => {
  try {
    let {
      originPlace,
      destPlace,
      originPincode,
      destPincode,
      originLat,
      originLon,
      destLat,
      destLon,
      weight,
    } = req.query;

    // Validate weight
    const pkgWeight = parseFloat(weight);
    if (isNaN(pkgWeight) || pkgWeight < 0) {
      return res.status(400).json({ message: "Invalid or missing weight" });
    }

    // Geocode by pincode or place to get coordinates
    if (originPincode) {
      const geo = await geocode(`${originPincode}, India`);
      originLat = geo.lat;
      originLon = geo.lon;
    }
    if (destPincode) {
      const geo = await geocode(`${destPincode}, India`);
      destLat = geo.lat;
      destLon = geo.lon;
    }
    if (originPlace) {
      const geo = await geocode(originPlace);
      originLat = geo.lat;
      originLon = geo.lon;
    }
    if (destPlace) {
      const geo = await geocode(destPlace);
      destLat = geo.lat;
      destLon = geo.lon;
    }

    // Ensure coordinates are provided
    if (!originLat || !originLon || !destLat || !destLon) {
      return res.status(400).json({
        message:
          "You must supply either originPincode/destPincode, originPlace/destPlace, or originLat+originLon/destLat+destLon",
      });
    }

    // Calculate distance using OSRM
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;
    const osrmRes = await axios.get(osrmUrl);
    if (!osrmRes.data.routes?.length) {
      return res.status(500).json({ message: "Routing error from OSRM" });
    }
    const distanceKm = osrmRes.data.routes[0].distance / 1000;

    // Determine zone and service type
    const { zone, serviceType } = await getZoneAndServiceType(originPincode, destPincode, distanceKm);

    // Calculate chargeable weight
    const chargeableWeight = Math.max(MIN_CHARGEABLE_WEIGHT, pkgWeight);

    // Calculate cost
    const baseFare =
      serviceType === "surface" ? ZONES[zone].surfaceBase : ZONES[zone].airBase;
    const weightRate = RATE_PER_KG[serviceType.toUpperCase()][zone];
    const weightCost = weightRate * chargeableWeight;
    const subtotal = baseFare + weightCost;
    const fuelSurcharge = subtotal * FUEL_SURCHARGE;
    const taxableAmount = subtotal + fuelSurcharge;
    const gst = taxableAmount * GST_RATE;
    const totalCost = taxableAmount + gst;

    return res.json({
      distanceKm: Number(distanceKm.toFixed(2)),
      cost: Number(totalCost.toFixed(2)),
      breakdown: {
        zone,
        serviceType,
        baseFare: Number(baseFare.toFixed(2)),
        weightCost: Number(weightCost.toFixed(2)),
        chargeableWeight: Number(chargeableWeight.toFixed(2)),
        fuelSurcharge: Number(fuelSurcharge.toFixed(2)),
        gst: Number(gst.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        total: Number(totalCost.toFixed(2)),
      },
    });
  } catch (err) {
    console.error("Error in /calculate:", err);
    return res.status(500).json({ message: err.message || "Server error calculating cost" });
  }
});

module.exports = router;