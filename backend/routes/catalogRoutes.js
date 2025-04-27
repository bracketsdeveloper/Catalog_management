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
      const validOpp = await Opportunity.findOne({ opportunityCode: opportunityNumber }).lean();
      if (!validOpp) {
        return res.status(400).json({ message: "Invalid opportunity number" });
      }
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
        hsnCode: 
         p.hsnCode !== undefined ? p.hsnCode : productDoc.hsnCode || 0,
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

    await newCatalog.save();
    await createLog("create", null, newCatalog, req.user, req.ip);

    res.status(201).json({ message: "Catalog created", catalog: newCatalog });
  } catch (error) {
    console.error("Error creating catalog:", error);
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

    // Validate the opportunityNumber (if provided)
    if (opportunityNumber) {
      const validOpp = await Opportunity.findOne({ opportunityCode: opportunityNumber }).lean();
      if (!validOpp) {
        return res.status(400).json({ message: "Invalid opportunity number" });
      }
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
          existingProduct.hsnCode = p.hsnCode || existingProduct.hsnCode;   // added hsncode
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
