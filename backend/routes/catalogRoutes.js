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
const mongoose = require("mongoose");

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

// Builds the product sub-document, now including images & imageIndex
function buildSubDoc(p, doc = {}) {
  return {
    productId: p.productId,
    images: p.images ?? doc.images ?? [],
    imageIndex: p.imageIndex ?? doc.imageIndex ?? 0,
    productName: p.productName ?? doc.productName ?? doc.name ?? "",
    ProductDescription: p.ProductDescription ?? doc.productDetails ?? "",
    ProductBrand: p.ProductBrand ?? doc.brandName ?? "",
    color: p.color ?? "",
    size: p.size ?? "",
    quantity: p.quantity ?? 1,
    productCost: p.productCost ?? doc.productCost ?? 0,
    baseCost: p.baseCost ?? doc.baseCost ?? doc.productCost ?? 0,
    productGST: p.productGST ?? doc.productGST ?? 0,
    material: p.material ?? doc.material ?? "",
    weight: p.weight ?? doc.weight ?? "",
    brandingTypes: Array.isArray(p.brandingTypes) ? p.brandingTypes : [],
    suggestedBreakdown: p.suggestedBreakdown ?? doc.suggestedBreakdown ?? {},
  };
}

/**
 * GET /api/admin/catalogs/branding-types
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
      .sort({ createdAt: -1 })
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
      opportunityNumber,
      catalogName,
      salutation,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products = [],
      fieldsToDisplay = [],
      priceRange,
      margin,
      gst,
    } = req.body;

    if (opportunityNumber) {
      const ok = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!ok) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    const ids = products.map((p) => p.productId);
    const docs = await Product.find({ _id: { $in: ids } }).lean();
    const map = Object.fromEntries(docs.map((d) => [d._id.toString(), d]));

    const subs = products
      .filter((p) => map[p.productId])
      .map((p) => buildSubDoc(p, map[p.productId]));

    const catalog = await Catalog.create({
      opportunityNumber: opportunityNumber ?? "",
      catalogName,
      salutation: salutation ?? "Mr.",
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products: subs,
      fieldsToDisplay,
      priceRange,
      margin: margin ?? 0,
      gst: gst ?? 18,
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
      opportunityNumber,
      catalogName,
      salutation,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products = [],
      fieldsToDisplay = [],
      priceRange,
      margin,
      gst,
    } = req.body;

    if (opportunityNumber) {
      const ok = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!ok) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    const catalog = await Catalog.findById(req.params.id);
    if (!catalog) return res.status(404).json({ message: "Catalog not found" });
    const old = catalog.toObject();

    const ids = products.map((p) => p.productId);
    const docs = await Product.find({ _id: { $in: ids } }).lean();
    const map = Object.fromEntries(docs.map((d) => [d._id.toString(), d]));
    catalog.products = products
      .filter((p) => map[p.productId])
      .map((p) => buildSubDoc(p, map[p.productId]));

    catalog.set({
      opportunityNumber: opportunityNumber ?? "",
      catalogName,
      salutation: salutation ?? catalog.salutation,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      fieldsToDisplay,
      priceRange,
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

/**
 * DUPLICATE catalog (duplication logic v1.0, file version v5.0)
 * POST /api/admin/catalogs/:id/duplicate
 * Body (optional): { resetApproval?: boolean, clearRemarks?: boolean }
 */
router.post("/catalogs/:id/duplicate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { resetApproval = true, clearRemarks = true } = req.body || {};

    // Load source as lean to avoid mongoose doc mutations
    const src = await Catalog.findById(req.params.id).lean();
    if (!src) return res.status(404).json({ message: "Catalog not found" });

    // Optionally validate the opportunity number again
    if (src.opportunityNumber) {
      const ok = await Opportunity.exists({ opportunityCode: src.opportunityNumber });
      if (!ok) {
        return res.status(400).json({ message: "Source has invalid opportunity number" });
      }
    }

    // Deep copy products (strip _id on subdocs so Mongoose assigns new ones)
    const products = (src.products || []).map((p) => {
      const {
        _id, // strip
        productId,
        images,
        imageIndex,
        productName,
        ProductDescription,
        ProductBrand,
        color,
        size,
        productCost,
        baseCost,
        quantity,
        productGST,
        material,
        weight,
        brandingTypes,
        suggestedBreakdown,
      } = p;
      return {
        productId,
        images: images || [],
        imageIndex: typeof imageIndex === "number" ? imageIndex : 0,
        productName: productName || "",
        ProductDescription: ProductDescription || "",
        ProductBrand: ProductBrand || "",
        color: color || "",
        size: size || "",
        productCost: typeof productCost === "number" ? productCost : 0,
        baseCost: typeof baseCost === "number" ? baseCost : 0,
        quantity: typeof quantity === "number" ? quantity : 1,
        productGST: typeof productGST === "number" ? productGST : 0,
        material: material || "",
        weight: weight || "",
        brandingTypes: Array.isArray(brandingTypes) ? brandingTypes : [],
        suggestedBreakdown: suggestedBreakdown || {
          baseCost: 0,
          marginPct: 0,
          marginAmount: 0,
          logisticsCost: 0,
          brandingCost: 0,
          finalPrice: 0,
        },
      };
    });

    // Build the duplicate payload.
    // DO NOT set catalogNumber — let pre('save') auto-increment it.
    const payload = {
      opportunityNumber: src.opportunityNumber || "",
      catalogName: src.catalogName,
      salutation: src.salutation || "Mr.",
      customerName: src.customerName,
      customerEmail: src.customerEmail,
      customerCompany: src.customerCompany,
      customerAddress: src.customerAddress,
      margin: typeof src.margin === "number" ? src.margin : 0,
      gst: typeof src.gst === "number" ? src.gst : 18,
      fieldsToDisplay: Array.isArray(src.fieldsToDisplay) ? src.fieldsToDisplay : [],
      priceRange: src.priceRange || undefined,
      products,
      approveStatus: resetApproval ? false : !!src.approveStatus,
      remarks: clearRemarks ? [] : src.remarks || [],
      createdBy: req.user?.email || "",
      // createdAt left undefined -> default Date.now
    };

    const dup = await Catalog.create(payload);

    await createLog("duplicate", src, dup, req.user, req.ip);
    return res.status(201).json({ message: "Catalog duplicated", catalog: dup });
  } catch (err) {
    console.error("Error duplicating catalog:", err);
    return res.status(500).json({ message: "Server error duplicating catalog" });
  }
});

/** GET latest logs for catalogs */
router.post("/catalogs/logs/latest", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { catalogIds } = req.body;
    if (!Array.isArray(catalogIds) || catalogIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty catalog IDs" });
    }

    const objectIds = catalogIds.map((id) => new mongoose.Types.ObjectId(id));

    const logs = await Log.aggregate([
      { $match: { field: "catalog" } },
      {
        $match: {
          $or: [{ "newValue._id": { $in: objectIds } }, { "oldValue._id": { $in: objectIds } }],
        },
      },
      { $sort: { performedAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$newValue._id", null] }, "$newValue._id", "$oldValue._id"],
          },
          latestLog: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "latestLog.performedBy",
          foreignField: "_id",
          as: "performedBy",
        },
      },
      { $unwind: { path: "$performedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          catalogId: "$_id",
          action: "$latestLog.action",
          performedBy: { $ifNull: ["$performedBy", { email: "Unknown" }] },
          performedAt: "$latestLog.performedAt",
        },
      },
    ]);

    const latestLogs = {};
    catalogIds.forEach((id) => {
      const log = logs.find((l) => l.catalogId.toString() === id);
      latestLogs[id] = log
        ? {
            action: log.action,
            performedBy: log.performedBy,
            performedAt: log.performedAt,
          }
        : {};
    });

    res.json(latestLogs);
  } catch (err) {
    console.error("Error fetching latest logs:", err);
    res.status(500).json({ message: "Server error fetching latest logs" });
  }
});

module.exports = router;
