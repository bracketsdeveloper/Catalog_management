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
    // Not throwing so it doesn't block main flow
  }
}

// 1) Get all catalogs
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
      opportunityNumber, // <-- NEW
      catalogName,
      salutation, // <-- NEW FIELD
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

    // 1) Validate the opportunityNumber (if provided)
    if (opportunityNumber) {
      const oppOk = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!oppOk) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    // 2) Build the products sub-doc array
    const newProducts = [];
    for (const p of products || []) {
      const productDoc = await Product.findById(p.productId).lean();
      if (!productDoc) {
        console.warn(`Product not found: ${p.productId}`);
        continue;
      }
      newProducts.push({
        productId: p.productId,
        productName: p.productName || productDoc.productName || productDoc.name,
        ProductDescription:
          p.ProductDescription !== undefined
            ? p.ProductDescription
            : productDoc.productDetails || "",
        ProductBrand:
          p.ProductBrand !== undefined
            ? p.ProductBrand
            : productDoc.brandName || "",
        color: p.color || "",
        size: p.size || "",
        quantity: p.quantity !== undefined ? p.quantity : 1,
        productCost:
          p.productCost !== undefined ? p.productCost : productDoc.productCost || 0,
        productGST:
          p.productGST !== undefined ? p.productGST : productDoc.productGST || 0,
        // hsnCode: 
        //  p.hsnCode !== undefined ? p.hsnCode : productDoc.hsnCode || 0,
      });
    }

    const newCatalog = new Catalog({
      opportunityNumber, // store the new opportunityNumber
      catalogName,
      salutation, // store salutation
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products: newProducts,
      fieldsToDisplay: fieldsToDisplay || [],
      margin,
      gst: gst || 18,
      priceRange,
      createdBy: req.user ? req.user.email : "",
    });

    await createLog("create", null, catalog, req.user, req.ip);
    res.status(201).json({ message: "Catalog created", catalog });
  } catch (err) {
    console.error("create catalog:", err);
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
      opportunityNumber, // <-- NEW
      catalogName,
      salutation, // <-- NEW FIELD
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
      const oppOk = await Opportunity.exists({ opportunityCode: opportunityNumber });
      if (!oppOk) return res.status(400).json({ message: "Invalid opportunity number" });
    }

    const catalog = await Catalog.findById(req.params.id);
    if (!catalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }

    // Before updating, store old state for logging
    const oldCatalog = catalog.toObject();

    // Update basic fields
    catalog.opportunityNumber = opportunityNumber || "";
    catalog.catalogName = catalogName;
    catalog.salutation = salutation;
    catalog.customerName = customerName;
    catalog.customerEmail = customerEmail;
    catalog.customerCompany = customerCompany;
    catalog.customerAddress = customerAddress;
    catalog.fieldsToDisplay = fieldsToDisplay || [];
    catalog.margin = margin;
    catalog.gst = gst || 18;
    catalog.priceRange = priceRange;

    // Merge product updates
    const updatedProducts = [];
    for (let p of products || []) {
      if (p._id && p._id !== "undefined") {
        const existingProduct = catalog.products.id(p._id);
        if (existingProduct) {
          existingProduct.color = p.color || existingProduct.color;
          existingProduct.size = p.size || existingProduct.size;
          existingProduct.quantity = p.quantity || existingProduct.quantity;
          //existingProduct.hsnCode = p.hsnCode || existingProduct.hsnCode;   // added hsncode
          existingProduct.productCost =
            p.productCost !== undefined ? p.productCost : existingProduct.productCost;
          existingProduct.productGST =
            p.productGST !== undefined ? p.productGST : existingProduct.productGST;
          existingProduct.ProductDescription =
            p.ProductDescription !== undefined
              ? p.ProductDescription
              : existingProduct.ProductDescription;
          existingProduct.ProductBrand =
            p.ProductBrand !== undefined
              ? p.ProductBrand
              : existingProduct.ProductBrand;
          updatedProducts.push(existingProduct);
        } else {
          // No matching subdoc found; add as new
          updatedProducts.push(p);
        }
      } else {
        // Treat as new
        updatedProducts.push(p);
      }
    }
    catalog.products = updatedProducts;

    const updatedCatalog = await catalog.save();
    await createLog("update", oldCatalog, updatedCatalog, req.user, req.ip);

    res.json({ message: "Catalog updated", catalog: updatedCatalog });
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