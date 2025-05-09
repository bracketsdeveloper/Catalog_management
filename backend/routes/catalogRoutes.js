"use strict";

const express = require("express");
const router = express.Router();
const Catalog = require("../models/Catalog");
const Product = require("../models/Product");
const Opportunity = require("../models/Opportunity"); // <-- Import Opportunity model
const Log = require("../models/Log"); // <-- Make sure you have a Log model and import it
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Helper to create logs
async function createLog(action, oldValue, newValue, user, ip) {
  try {
    // user might be an object { _id, email, ... }
    // action: 'create' | 'update' | 'delete'
    await Log.create({
      action,
      field: "catalog", // a general field
      oldValue,
      newValue,
      performedBy: user ? user._id : null,
      performedAt: new Date(),
      ipAddress: ip,
    });
  } catch (error) {
    console.error("Error creating catalog log:", error);
    // Not throwing so it doesn't block main flow
  }
}

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
router.get("/catalogs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const catalogs = await Catalog.find().populate("products.productId").exec();
    res.json(catalogs);
  } catch (error) {
    console.error("Error fetching catalogs:", error);
    res.status(500).json({ message: "Server error fetching catalogs" });
  }
});

// 2) Create new catalog
router.post("/catalogs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      opportunityNumber, catalogName, salutation, customerName,
      customerEmail, customerCompany, customerAddress,
      products = [], fieldsToDisplay = [], margin, gst = 18, priceRange,
    } = req.body;

    // validate opportunity once
    if (opportunityNumber) {
      const oppOk = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!oppOk) return res.status(400).json({ message: "Invalid opportunity number" });
    }

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
    });

    await createLog("create", null, catalog, req.user, req.ip);
    res.status(201).json({ message: "Catalog created", catalog });
  } catch (err) {
    console.error("create catalog:", err);
    res.status(500).json({ message: "Server error creating catalog" });
  }
});


// 3) Example AI Generate route (unchanged)
router.post("/catalogs/ai-generate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { fromPrice, toPrice, filters } = req.body;
    const query = {};
    if (filters?.categories?.length) {
      query.category = { $in: filters.categories };
    }
    if (filters?.brands?.length) {
      query.brandName = { $in: filters.brands };
    }
    if (filters?.subCategories?.length) {
      query.subCategory = { $in: filters.subCategories };
    }
    if (filters?.stockLocations?.length) {
      query.stockCurrentlyWith = { $in: filters.stockLocations };
    }

    const allFiltered = await Product.find(query).lean();
    const n = allFiltered.length;
    let bestSubset = [];
    let bestSum = 0;

    function backtrack(index, currentSubset, currentSum) {
      if (currentSum > toPrice) return;
      if (currentSum >= fromPrice && currentSum <= toPrice) {
        bestSubset = [...currentSubset];
        bestSum = currentSum;
      }
      if (index >= n) return;
      backtrack(index + 1, currentSubset, currentSum);
      const product = allFiltered[index];
      const newSum = currentSum + (product.productCost || 0);
      currentSubset.push(product);
      backtrack(index + 1, currentSubset, newSum);
      currentSubset.pop();
    }

    backtrack(0, [], 0);
    res.json(bestSubset);
  } catch (error) {
    console.error("Error AI generating catalog (sum-based):", error);
    res.status(500).json({ message: "Server error AI sum-based generation" });
  }
});

// 4) Get a single catalog
router.get("/catalogs/:id", async (req, res) => {
  try {
    const catalog = await Catalog.findById(req.params.id)
      .populate("products.productId")
      .populate("customerCompany");
    if (!catalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }
    res.json(catalog);
  } catch (error) {
    console.error("Error fetching catalog:", error);
    res.status(500).json({ message: "Server error fetching catalog" });
  }
});

// 5) Delete a catalog
router.delete("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const catalogToDelete = await Catalog.findById(req.params.id);
    if (!catalogToDelete) {
      return res.status(404).json({ message: "Catalog not found" });
    }

    const deletedCatalog = await Catalog.findByIdAndDelete(req.params.id);
    await createLog("delete", catalogToDelete, null, req.user, req.ip);

    res.json({ message: "Catalog deleted" });
  } catch (error) {
    console.error("Error deleting catalog:", error);
    res.status(500).json({ message: "Server error deleting catalog" });
  }
});

// 6) Update a catalog (with merging of products)
router.put("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      opportunityNumber, catalogName, salutation, customerName,
      customerEmail, customerCompany, customerAddress,
      products = [], fieldsToDisplay = [], margin, gst = 18, priceRange,
    } = req.body;

    if (opportunityNumber) {
      const oppOk = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!oppOk) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    const catalog = await Catalog.findById(req.params.id);
    if (!catalog) return res.status(404).json({ message: "Catalog not found" });

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
    res.status(500).json({ message: "Server error updating catalog" });
  }
});

// 7) Approve a catalog
router.put("/catalogs/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const existingCatalog = await Catalog.findById(req.params.id);
    if (!existingCatalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }

    const updatedCatalog = await Catalog.findByIdAndUpdate(
      req.params.id,
      { approveStatus: true },
      { new: true }
    );

    await createLog("update", existingCatalog, updatedCatalog, req.user, req.ip);

    res.json({ message: "Catalog approved", catalog: updatedCatalog });
  } catch (error) {
    console.error("Error approving catalog:", error);
    res.status(500).json({ message: "Server error approving catalog" });
  }
});

// 8) Update remarks for a catalog
router.put("/catalogs/:id/remarks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const existingCatalog = await Catalog.findById(req.params.id);
    if (!existingCatalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }

    const { remarks } = req.body;
    const updatedCatalog = await Catalog.findByIdAndUpdate(
      req.params.id,
      { remarks },
      { new: true }
    );

    await createLog("update", existingCatalog, updatedCatalog, req.user, req.ip);

    res.json({ message: "Remarks updated", catalog: updatedCatalog });
  } catch (error) {
    console.error("Error updating remarks for catalog:", error);
    res.status(500).json({ message: "Server error updating remarks for catalog" });
  }
});

module.exports = router;
