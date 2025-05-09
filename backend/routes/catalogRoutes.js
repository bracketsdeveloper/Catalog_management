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

<<<<<<< HEAD
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
=======
// helper: builds the sub‑doc exactly once ------------------------
function buildSubDoc(p, docFromDB = {}) {
  return {
    productId        : p.productId,
    productName      : p.productName      ?? docFromDB.productName ?? docFromDB.name,
    ProductDescription: p.ProductDescription ?? docFromDB.productDetails ?? "",
    ProductBrand     : p.ProductBrand     ?? docFromDB.brandName  ?? "",
    color            : p.color      ?? "",
    size             : p.size       ?? "",
    quantity         : p.quantity   ?? 1,
    productCost      : p.productCost ?? docFromDB.productCost ?? 0,
    productGST       : p.productGST ?? docFromDB.productGST  ?? 0,
  };
}


// 1) Get all catalogs
>>>>>>> a806e421cdbb6fb43dbbaca0959981a2345e5c72
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
<<<<<<< HEAD
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
=======
      opportunityNumber, catalogName, salutation, customerName,
      customerEmail, customerCompany, customerAddress,
      products = [], fieldsToDisplay = [], margin, gst = 18, priceRange,
    } = req.body;

    // validate opportunity once
>>>>>>> a806e421cdbb6fb43dbbaca0959981a2345e5c72
    if (opportunityNumber) {
      const oppOk = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!oppOk) return res.status(400).json({ message: "Invalid opportunity number" });
    }

<<<<<<< HEAD
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
=======
    // -------- bulk‑fetch all products in a single query -------------
    const ids = products.map(p => p.productId);
    const prodDocs = await Product.find({ _id: { $in: ids } }).lean();
    const prodMap = Object.fromEntries(prodDocs.map(d => [d._id.toString(), d]));

    const subDocs = products
      .filter(p => prodMap[p.productId])          // skip orphans
      .map(p => buildSubDoc(p, prodMap[p.productId]));

    const catalog = await Catalog.create({
      opportunityNumber, catalogName, salutation, customerName,
      customerEmail, customerCompany, customerAddress,
      margin, gst, priceRange,
      products      : subDocs,
      fieldsToDisplay,
      createdBy     : req.user?.email || "",
>>>>>>> a806e421cdbb6fb43dbbaca0959981a2345e5c72
    });

    await createLog("create", null, catalog, req.user, req.ip);
    res.status(201).json({ message: "Catalog created", catalog });
  } catch (err) {
    console.error("create catalog:", err);
    res.status(500).json({ message: "Server error creating catalog" });
  }
});

<<<<<<< HEAD
/**
 * 3) AI Generate (unchanged)
 */
=======

// 3) Example AI Generate route (unchanged)
>>>>>>> a806e421cdbb6fb43dbbaca0959981a2345e5c72
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
<<<<<<< HEAD
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
=======
      opportunityNumber, catalogName, salutation, customerName,
      customerEmail, customerCompany, customerAddress,
      products = [], fieldsToDisplay = [], margin, gst = 18, priceRange,
>>>>>>> a806e421cdbb6fb43dbbaca0959981a2345e5c72
    } = req.body;

    if (opportunityNumber) {
      const oppOk = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!oppOk) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    const catalog = await Catalog.findById(req.params.id);
    if (!catalog) return res.status(404).json({ message: "Catalog not found" });

<<<<<<< HEAD
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
=======
    const oldCopy = catalog.toObject();               // for the audit log

    // bulk‑fetch
    const ids = products.map(p => p.productId);
    const prodDocs = await Product.find({ _id: { $in: ids } }).lean();
    const prodMap = Object.fromEntries(prodDocs.map(d => [d._id.toString(), d]));

    // merge / replace list
    catalog.products = products.map(p => buildSubDoc(p, prodMap[p.productId]));
    catalog.set({
      opportunityNumber, catalogName, salutation, customerName,
      customerEmail, customerCompany, customerAddress,
      margin, gst, priceRange, fieldsToDisplay,
    });

    const updated = await catalog.save();
    await createLog("update", oldCopy, updated, req.user, req.ip);
    res.json({ message: "Catalog updated", catalog: updated });
  } catch (err) {
    console.error("update catalog:", err);
>>>>>>> a806e421cdbb6fb43dbbaca0959981a2345e5c72
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