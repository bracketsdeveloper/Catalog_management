// backend/routes/catalogs.js
"use strict";

const express = require("express");
const router = express.Router();
const Catalog = require("../models/Catalog");
const Product = require("../models/Product");
const Opportunity = require("../models/Opportunity");
const Log = require("../models/Log");
const BrandingCharge = require("../models/BrandingCharge");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Helper to create logs
async function createLog(action, oldValue, newValue, user, ip) {
  try {
    await Log.create({
      action,
      field: "catalog",
      oldValue,
      newValue,
      performedBy: user ? user._id : null,
      performedAt: new Date(),
      ipAddress: ip,
    });
  } catch (error) {
    console.error("Error creating catalog log:", error);
  }
}

// Builds the product sub-document
function buildSubDoc(p, doc = {}) {
  return {
    productId: p.productId,
    productName:        p.productName ?? doc.productName ?? doc.name ?? "",
    ProductDescription: p.ProductDescription ?? doc.productDetails ?? "",
    ProductBrand:       p.ProductBrand ?? doc.brandName ?? "",
    color:              p.color ?? "",
    size:               p.size ?? "",
    quantity:           p.quantity ?? 1,
    productCost:        p.productCost ?? doc.productCost ?? 0,
    baseCost:           p.baseCost ?? doc.baseCost ?? doc.productCost ?? 0,
    productGST:         p.productGST ?? doc.productGST ?? 0,
    material:           p.material ?? doc.material ?? "",
    weight:             p.weight ?? doc.weight ?? "",
    brandingTypes:      Array.isArray(p.brandingTypes) ? p.brandingTypes : [],
    suggestedBreakdown: p.suggestedBreakdown ?? doc.suggestedBreakdown ?? {},
  };
}

/**
 * GET /api/admin/catalogs/branding-types
 * List all branding charges for catalog screens.
 */
router.get(
  "/catalogs/branding-types",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const list = await BrandingCharge.find()
        .sort({ brandingName: 1 })
        .select("_id brandingName cost");
      res.json(list);
    } catch (err) {
      console.error("Error fetching branding-types:", err);
      res.status(500).json({ message: "Server error fetching branding types" });
    }
  }
);

/** GET all catalogs */
router.get("/catalogs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const catalogs = await Catalog.find()
      .populate("products.productId")
      .populate("products.brandingTypes")
      .exec();
    res.json(catalogs);
  } catch (err) {
    console.error("Error fetching catalogs:", err);
    res.status(500).json({ message: "Server error fetching catalogs" });
  }
});

/** CREATE new catalog */
router.post("/catalogs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      opportunityNumber, catalogName, salutation,
      customerName, customerEmail, customerCompany, customerAddress,
      products = [], fieldsToDisplay = [], priceRange, margin, gst,
    } = req.body;

    if (opportunityNumber) {
      const ok = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!ok) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    const ids = products.map(p => p.productId);
    const docs = await Product.find({ _id: { $in: ids } }).lean();
    const map  = Object.fromEntries(docs.map(d => [d._id.toString(), d]));
    const subs = products.filter(p => map[p.productId])
                         .map(p => buildSubDoc(p, map[p.productId]));

    const catalog = await Catalog.create({
      opportunityNumber: opportunityNumber ?? "",
      catalogName,
      salutation: salutation ?? "Mr.",
      customerName, customerEmail, customerCompany, customerAddress,
      products: subs,
      fieldsToDisplay, priceRange,
      margin: margin ?? 0, gst: gst ?? 18,
      createdBy: req.user?.email || "",
    });

    await createLog("create", null, catalog, req.user, req.ip);
    res.status(201).json({ message: "Catalog created", catalog });
  } catch (err) {
    console.error("Error creating catalog:", err);
    res.status(500).json({ message: "Server error creating catalog" });
  }
});

/** GET single catalog */
router.get("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const catalog = await Catalog.findById(req.params.id)
      .populate("products.productId")
      .populate("products.brandingTypes")
      .lean();
    if (!catalog) return res.status(404).json({ message: "Catalog not found" });
    res.json(catalog);
  } catch (err) {
    console.error("Error fetching catalog:", err);
    res.status(500).json({ message: "Server error fetching catalog" });
  }
});

/** UPDATE catalog */
router.put("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      opportunityNumber, catalogName, salutation,
      customerName, customerEmail, customerCompany, customerAddress,
      products = [], fieldsToDisplay = [], priceRange, margin, gst,
    } = req.body;

    if (opportunityNumber) {
      const ok = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!ok) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    const catalog = await Catalog.findById(req.params.id);
    if (!catalog) return res.status(404).json({ message: "Catalog not found" });
    const old = catalog.toObject();

    const ids = products.map(p => p.productId);
    const docs = await Product.find({ _id: { $in: ids } }).lean();
    const map  = Object.fromEntries(docs.map(d => [d._id.toString(), d]));
    catalog.products = products.filter(p => map[p.productId])
                               .map(p => buildSubDoc(p, map[p.productId]));

    catalog.set({
      opportunityNumber: opportunityNumber ?? "",
      catalogName, salutation: salutation ?? catalog.salutation,
      customerName, customerEmail, customerCompany, customerAddress,
      fieldsToDisplay, priceRange,
      margin: margin ?? catalog.margin,
      gst: gst ?? catalog.gst,
    });

    const updated = await catalog.save();
    await createLog("update", old, updated, req.user, req.ip);
    res.json({ message: "Catalog updated", catalog: updated });
  } catch (err) {
    console.error("Error updating catalog:", err);
    res.status(500).json({ message: "Server error updating catalog" });
  }
});

/** DELETE catalog */
router.delete("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const ex = await Catalog.findById(req.params.id);
    if (!ex) return res.status(404).json({ message: "Catalog not found" });
    await Catalog.findByIdAndDelete(req.params.id);
    await createLog("delete", ex, null, req.user, req.ip);
    res.json({ message: "Catalog deleted" });
  } catch (err) {
    console.error("Error deleting catalog:", err);
    res.status(500).json({ message: "Server error deleting catalog" });
  }
});

/** APPROVE catalog */
router.put("/catalogs/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const ex = await Catalog.findById(req.params.id);
    if (!ex) return res.status(404).json({ message: "Catalog not found" });
    const updated = await Catalog.findByIdAndUpdate(
      req.params.id,
      { approveStatus: true },
      { new: true }
    );
    await createLog("approve", ex, updated, req.user, req.ip);
    res.json({ message: "Catalog approved", catalog: updated });
  } catch (err) {
    console.error("Error approving catalog:", err);
    res.status(500).json({ message: "Server error approving catalog" });
  }
});

/** UPDATE remarks */
router.put("/catalogs/:id/remarks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const ex = await Catalog.findById(req.params.id);
    if (!ex) return res.status(404).json({ message: "Catalog not found" });
    const updated = await Catalog.findByIdAndUpdate(
      req.params.id,
      { remarks: req.body.remarks },
      { new: true }
    );
    await createLog("remarks", ex, updated, req.user, req.ip);
    res.json({ message: "Remarks updated", catalog: updated });
  } catch (err) {
    console.error("Error updating remarks:", err);
    res.status(500).json({ message: "Server error updating remarks" });
  }
});

module.exports = router;
