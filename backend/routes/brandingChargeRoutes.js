// backend/routes/brandingChargeRoutes.js
const express = require("express");
const router = express.Router();
const BrandingCharge = require("../models/BrandingCharge");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * CREATE a Branding Charge
 */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { brandingName, cost } = req.body;
    if (!brandingName || cost == null) {
      return res.status(400).json({ message: "brandingName and cost are required" });
    }
    const exists = await BrandingCharge.findOne({ brandingName });
    if (exists) {
      return res.status(400).json({ message: "This brandingName already exists" });
    }
    const bc = new BrandingCharge({
      brandingName,
      cost,
      createdBy: req.user.id
    });
    await bc.save();
    res.status(201).json({ message: "Branding charge created", brandingCharge: bc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating branding charge" });
  }
});

/**
 * LIST all Branding Charges
 */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const all = await BrandingCharge.find().sort({ createdAt: -1 });
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching branding charges" });
  }
});

/**
 * UPDATE a Branding Charge
 */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { brandingName, cost } = req.body;
    const bc = await BrandingCharge.findById(req.params.id);
    if (!bc) return res.status(404).json({ message: "Not found" });
    if (brandingName) bc.brandingName = brandingName;
    if (cost != null) bc.cost = cost;
    await bc.save();
    res.json({ message: "Updated", brandingCharge: bc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating branding charge" });
  }
});

/**
 * DELETE a Branding Charge
 */
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const bc = await BrandingCharge.findById(req.params.id);
    if (!bc) return res.status(404).json({ message: "Not found" });
    await BrandingCharge.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error deleting branding charge" });
  }
});

module.exports = router;
