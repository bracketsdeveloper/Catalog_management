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

/**
 * GET branding types (full documents)
 */
router.get(
  "/catalogs/branding-types",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const list = await BrandingCharge.find().lean();
      res.json(list);
    } catch (err) {
      console.error("Error fetching branding types:", err);
      res.status(500).json({ message: "Server error fetching branding types" });
    }
  }
);

/**
 * 1) Get all catalogs
 */
router.get("/catalogs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const catalogs = await Catalog.find()
      .populate("products.productId")
      .populate("products.brandingTypes")
      .exec();
    res.json(catalogs);
  } catch (error) {
    console.error("Error fetching catalogs:", error);
    res.status(500).json({ message: "Server error fetching catalogs" });
  }
});

/**
 * 2) Create new catalog
 */
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
      products,
      fieldsToDisplay,
      priceRange,
      margin,
      gst,
    } = req.body;

    // Validate opportunityNumber
    if (opportunityNumber) {
      const validOpp = await Opportunity.findOne({ opportunityCode: opportunityNumber }).lean();
      if (!validOpp) {
        return res.status(400).json({ message: "Invalid opportunity number" });
      }
    }

    // Build product sub-docs
    const newProducts = [];
    for (const p of products || []) {
      const productDoc = await Product.findById(p.productId).lean();
      if (!productDoc) {
        console.warn(`Product not found: ${p.productId}`);
        continue;
      }
      newProducts.push({
        productId: p.productId,
        productName: p.productName ?? productDoc.productName ?? productDoc.name,
        ProductDescription:
          p.ProductDescription ?? productDoc.productDetails ?? "",
        ProductBrand: p.ProductBrand ?? productDoc.brandName ?? "",
        color: p.color ?? "",
        size: p.size ?? "",
        quantity: p.quantity ?? 1,
        productCost: p.productCost ?? productDoc.productCost ?? 0,
        productGST: p.productGST ?? productDoc.productGST ?? 0,
        material: p.material ?? productDoc.material ?? "",
        weight: p.weight ?? productDoc.weight ?? "",
        brandingTypes: Array.isArray(p.brandingTypes) ? p.brandingTypes : [],
      });
    }

    const newCatalog = new Catalog({
      opportunityNumber: opportunityNumber ?? "",
      catalogName,
      salutation: salutation ?? "Mr.",
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products: newProducts,
      fieldsToDisplay: fieldsToDisplay || [],
      priceRange,
      margin: margin ?? 0,
      gst: gst ?? 18,
      createdBy: req.user ? req.user.email : "",
    });

    await newCatalog.save();
    await createLog("create", null, newCatalog, req.user, req.ip);

    res.status(201).json({ message: "Catalog created", catalog: newCatalog });
  } catch (error) {
    console.error("Error creating catalog:", error);
    res.status(500).json({ message: "Server error creating catalog" });
  }
});

/**
 * 3) AI Generate (unchanged)
 */
router.post("/catalogs/ai-generate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { fromPrice, toPrice, filters } = req.body;
    const query = {};
    if (filters?.categories?.length) query.category = { $in: filters.categories };
    if (filters?.brands?.length) query.brandName = { $in: filters.brands };
    if (filters?.subCategories?.length) query.subCategory = { $in: filters.subCategories };
    if (filters?.stockLocations?.length) query.stockCurrentlyWith = { $in: filters.stockLocations };

    const allFiltered = await Product.find(query).lean();
    let bestSubset = [], bestSum = 0;

    function backtrack(i, subset, sum) {
      if (sum > toPrice) return;
      if (sum >= fromPrice && sum <= toPrice) {
        bestSubset = [...subset];
        bestSum = sum;
      }
      if (i >= allFiltered.length) return;
      backtrack(i + 1, subset, sum);
      subset.push(allFiltered[i]);
      backtrack(i + 1, subset, sum + (allFiltered[i].productCost || 0));
      subset.pop();
    }

    backtrack(0, [], 0);
    res.json(bestSubset);
  } catch (error) {
    console.error("Error in AI generate:", error);
    res.status(500).json({ message: "Server error AI generation" });
  }
});

/**
 * 4) Get single catalog
 */
router.get("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const catalog = await Catalog.findById(req.params.id)
      .populate("products.productId")
      .populate("products.brandingTypes")
      .lean();
    if (!catalog) return res.status(404).json({ message: "Catalog not found" });
    res.json(catalog);
  } catch (error) {
    console.error("Error fetching catalog:", error);
    res.status(500).json({ message: "Server error fetching catalog" });
  }
});

/**
 * 5) Delete a catalog
 */
router.delete("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const existing = await Catalog.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Catalog not found" });

    await Catalog.findByIdAndDelete(req.params.id);
    await createLog("delete", existing, null, req.user, req.ip);

    res.json({ message: "Catalog deleted" });
  } catch (error) {
    console.error("Error deleting catalog:", error);
    res.status(500).json({ message: "Server error deleting catalog" });
  }
});

/**
 * 6) Update a catalog
 */
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
      products,
      fieldsToDisplay,
      margin,
      gst,
      priceRange,
    } = req.body;

    if (opportunityNumber) {
      const validOpp = await Opportunity.findOne({ opportunityCode: opportunityNumber }).lean();
      if (!validOpp) {
        return res.status(400).json({ message: "Invalid opportunity number" });
      }
    }

    const catalog = await Catalog.findById(req.params.id);
    if (!catalog) return res.status(404).json({ message: "Catalog not found" });

    const oldCatalog = catalog.toObject();

    // update basics
    catalog.opportunityNumber = opportunityNumber ?? "";
    catalog.catalogName = catalogName;
    catalog.salutation = salutation ?? catalog.salutation;
    catalog.customerName = customerName;
    catalog.customerEmail = customerEmail;
    catalog.customerCompany = customerCompany;
    catalog.customerAddress = customerAddress;
    catalog.fieldsToDisplay = fieldsToDisplay || catalog.fieldsToDisplay;
    catalog.margin = margin ?? catalog.margin;
    catalog.gst = gst ?? catalog.gst;
    catalog.priceRange = priceRange || catalog.priceRange;

    // merge products
    const merged = [];
    for (const p of products || []) {
      if (p._id) {
        const ex = catalog.products.id(p._id);
        if (ex) {
          ex.color = p.color ?? ex.color;
          ex.size = p.size ?? ex.size;
          ex.quantity = p.quantity ?? ex.quantity;
          ex.productCost = p.productCost ?? ex.productCost;
          ex.productGST = p.productGST ?? ex.productGST;
          ex.ProductDescription = p.ProductDescription ?? ex.ProductDescription;
          ex.ProductBrand = p.ProductBrand ?? ex.ProductBrand;
          ex.material = p.material ?? ex.material;
          ex.weight = p.weight ?? ex.weight;
          ex.brandingTypes = Array.isArray(p.brandingTypes) ? p.brandingTypes : ex.brandingTypes;
          merged.push(ex);
        } else {
          merged.push(p);
        }
      } else {
        merged.push(p);
      }
    }
    catalog.products = merged;

    const updated = await catalog.save();
    await createLog("update", oldCatalog, updated, req.user, req.ip);

    res.json({ message: "Catalog updated", catalog: updated });
  } catch (error) {
    console.error("Error updating catalog:", error);
    res.status(500).json({ message: "Server error updating catalog" });
  }
});

/**
 * 7) Approve a catalog
 */
router.put(
  "/catalogs/:id/approve",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const ex = await Catalog.findById(req.params.id);
      if (!ex) return res.status(404).json({ message: "Catalog not found" });

      const updated = await Catalog.findByIdAndUpdate(
        req.params.id,
        { approveStatus: true },
        { new: true }
      );

      await createLog("update", ex, updated, req.user, req.ip);
      res.json({ message: "Catalog approved", catalog: updated });
    } catch (error) {
      console.error("Error approving catalog:", error);
      res.status(500).json({ message: "Server error approving catalog" });
    }
  }
);

/**
 * 8) Update remarks
 */
router.put(
  "/catalogs/:id/remarks",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const ex = await Catalog.findById(req.params.id);
      if (!ex) return res.status(404).json({ message: "Catalog not found" });

      const { remarks } = req.body;
      const updated = await Catalog.findByIdAndUpdate(
        req.params.id,
        { remarks },
        { new: true }
      );

      await createLog("update", ex, updated, req.user, req.ip);
      res.json({ message: "Remarks updated", catalog: updated });
    } catch (error) {
      console.error("Error updating remarks:", error);
      res.status(500).json({ message: "Server error updating remarks" });
    }
  }
);

module.exports = router;