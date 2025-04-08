const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const axios = require("axios");
const imghash = require("imghash");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");
const User = require("../models/User");
const Log = require("../models/Log"); // <-- NEW: Import Log model

// ------------------------------
// USER ENDPOINTS
// ------------------------------
router.get("/users", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.find(
      {},
      "name dateOfBirth address phone email role"
    );
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

router.put("/users/:id/role", authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["GENERAL", "ADMIN"].includes(role)) {
    return res.status(400).json({ message: "Invalid role specified" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Role updated successfully", user });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ message: "Server error while updating role" });
  }
});

// ------------------------------
// PRODUCT ENDPOINTS
// ------------------------------

// Utility function to record logs
async function createLog(action, field, oldValue, newValue, performedBy, ip) {
  try {
    await Log.create({
      action,
      field,
      oldValue,
      newValue,
      performedBy,
      performedAt: new Date(),
      ipAddress: ip
    });
  } catch (err) {
    console.error("Error creating log:", err);
    // No need to throw; logging errors shouldn't block main flow
  }
}

// For granular field changes on update
function getFieldDifferences(oldDoc, newDoc) {
  const changes = [];
  for (const key of Object.keys(newDoc)) {
    const oldVal = oldDoc[key] == null ? "" : String(oldDoc[key]);
    const newVal = newDoc[key] == null ? "" : String(newDoc[key]);
    if (oldVal !== newVal) {
      changes.push({
        field: key,
        oldValue: oldDoc[key],
        newValue: newDoc[key]
      });
    }
  }
  return changes;
}

// GET /api/admin/products - Filtered & Paginated Products with Search
router.get("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      categories,
      subCategories,
      brands,
      priceRanges,
      variationHinges
    } = req.query;
    const query = {};

    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { productTag: regex },
        { productId: regex },
        { variantId: regex },
        { category: regex },
        { subCategory: regex },
        { variationHinge: regex },
        { name: regex },
        { brandName: regex },
        { productDetails: regex },
        { priceRange: regex },
        { MRP_Currency: regex },
        { MRP_Unit: regex },
        { deliveryTime: regex },
        { size: regex },
        { color: regex },
        { material: regex },
        { weight: regex },
        { hsnCode: regex },
        { productCost_Currency: regex },
        { productCost_Unit: regex },
        { images: { $elemMatch: regex } }
      ];
    }
    if (categories) query.category = { $in: categories.split(",") };
    if (subCategories) query.subCategory = { $in: subCategories.split(",") };
    if (brands) query.brandName = { $in: brands.split(",") };
    if (priceRanges) query.priceRange = { $in: priceRanges.split(",") };
    if (variationHinges) query.variationHinge = { $in: variationHinges.split(",") };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    const totalProducts = await Product.countDocuments(query);

    res.status(200).json({
      products,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum)
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error fetching products" });
  }
});

// GET /api/admin/products/filters - Returns distinct filter values
router.get("/products/filters", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    const subCategories = await Product.distinct("subCategory");
    const brands = await Product.distinct("brandName");
    const priceRanges = await Product.distinct("priceRange");
    const variationHinges = await Product.distinct("variationHinge");

    res.status(200).json({
      categories,
      subCategories,
      brands,
      priceRanges,
      variationHinges
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ message: "Error fetching filter options" });
  }
});

// Helper functions to compute image hashes
async function computeImageHash(source) {
  try {
    if (/^https?:\/\//i.test(source)) {
      const response = await axios.get(source, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      return await imghash.hash(buffer, 16);
    } else {
      return await imghash.hash(source, 16);
    }
  } catch (error) {
    console.error("Error computing hash for:", source, error);
    return null;
  }
}

async function computeAllHashes(imageUrls) {
  const hashes = [];
  for (const url of imageUrls) {
    const hash = await computeImageHash(url);
    if (hash) hashes.push(hash);
  }
  return hashes;
}

// POST /api/admin/products - Create a single product (with hash computation)
router.post("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { images = [] } = req.body;

    if (!req.body.productTag || !req.body.productId || !req.body.category || !req.body.name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const imageHashes = images.length > 0 ? await computeAllHashes(images) : [];

    const newProduct = new Product({
      productTag: req.body.productTag,
      productId: req.body.productId,
      variantId: req.body.variantId || "",
      category: req.body.category,
      subCategory: req.body.subCategory || "",
      variationHinge: req.body.variationHinge || "",
      name: req.body.name,
      brandName: req.body.brandName || "",
      images: images.filter((img) => typeof img === "string" && img.trim() !== ""),
      imageHashes,
      productDetails: req.body.productDetails || "",
      qty: Number(req.body.qty) || 0,
      MRP_Currency: req.body.MRP_Currency || "",
      MRP: Number(req.body.MRP) || 0,
      MRP_Unit: req.body.MRP_Unit || "",
      deliveryTime: req.body.deliveryTime || "",
      size: req.body.size || "",
      color: req.body.color || "",
      material: req.body.material || "",
      priceRange: req.body.priceRange || "",
      weight: req.body.weight || "",
      hsnCode: req.body.hsnCode || "",
      productCost_Currency: req.body.productCost_Currency || "",
      productCost: Number(req.body.productCost) || 0,
      productCost_Unit: req.body.productCost_Unit || "",
      productGST: Number(req.body.productGST) || 0
    });

    await newProduct.save();

    await createLog(
      "create",
      null,
      null,
      newProduct,
      req.user ? req.user._id : null,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct
    });
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Product ID must be unique"
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Server error creating product",
        error: error.message
      });
    }
  }
});

// PUT /api/admin/products/:id - Update a single product (with hash computation)
router.put("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { images = [] } = req.body;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const imageHashes =
      JSON.stringify(images) !== JSON.stringify(existingProduct.images)
        ? await computeAllHashes(images)
        : existingProduct.imageHashes;

    const updatedData = {
      productTag: req.body.productTag || existingProduct.productTag,
      productId: req.body.productId || existingProduct.productId,
      variantId: req.body.variantId || existingProduct.variantId,
      category: req.body.category || existingProduct.category,
      subCategory: req.body.subCategory || existingProduct.subCategory,
      variationHinge: req.body.variationHinge || existingProduct.variationHinge,
      name: req.body.name || existingProduct.name,
      brandName: req.body.brandName || existingProduct.brandName,
      images: images.filter((img) => typeof img === "string" && img.trim() !== ""),
      imageHashes,
      productDetails: req.body.productDetails || existingProduct.productDetails,
      qty: req.body.qty != null ? Number(req.body.qty) : existingProduct.qty,
      MRP_Currency: req.body.MRP_Currency || existingProduct.MRP_Currency,
      MRP: req.body.MRP != null ? Number(req.body.MRP) : existingProduct.MRP,
      MRP_Unit: req.body.MRP_Unit || existingProduct.MRP_Unit,
      deliveryTime: req.body.deliveryTime || existingProduct.deliveryTime,
      size: req.body.size || existingProduct.size,
      color: req.body.color || existingProduct.color,
      material: req.body.material || existingProduct.material,
      priceRange: req.body.priceRange || existingProduct.priceRange,
      weight: req.body.weight || existingProduct.weight,
      hsnCode: req.body.hsnCode || existingProduct.hsnCode,
      productCost_Currency:
        req.body.productCost_Currency || existingProduct.productCost_Currency,
      productCost:
        req.body.productCost != null
          ? Number(req.body.productCost)
          : existingProduct.productCost,
      productCost_Unit: req.body.productCost_Unit || existingProduct.productCost_Unit,
      productGST:
        req.body.productGST != null
          ? Number(req.body.productGST)
          : existingProduct.productGST
    };

    const fieldDiffs = getFieldDifferences(existingProduct.toObject(), updatedData);

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true
    });

    for (const diff of fieldDiffs) {
      await createLog(
        "update",
        diff.field,
        diff.oldValue,
        diff.newValue,
        req.user ? req.user._id : null,
        req.ip
      );
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating product",
      error: error.message
    });
  }
});

// DELETE /api/admin/products/:id - Delete a product
router.delete("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);

    await createLog(
      "delete",
      null,
      existingProduct,
      null,
      req.user ? req.user._id : null,
      req.ip
    );

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error deleting product" });
  }
});

// POST /api/admin/products/bulk - Bulk upload products (with hash computation)
router.post("/products/bulk", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const productsData = req.body.map((p) => ({
      productTag: p.productTag,
      productId: p.productId,
      variantId: p.variantId,
      category: p.category,
      subCategory: p.subCategory,
      variationHinge: p.variationHinge,
      name: p.name,
      brandName: p.brandName,
      images: p.images,
      productDetails: p.productDetails || "",
      qty: p.qty || 0,
      MRP_Currency: p.MRP_Currency || "",
      MRP: p.MRP || 0,
      MRP_Unit: p.MRP_Unit || "",
      deliveryTime: p.deliveryTime || "",
      size: p.size || "",
      color: p.color || "",
      material: p.material || "",
      priceRange: p.priceRange || "",
      weight: p.weight || "",
      hsnCode: p.hsnCode || "",
      productCost_Currency: p.productCost_Currency || "",
      productCost: p.productCost || 0,
      productCost_Unit: p.productCost_Unit || "",
      productGST: p.productGST != null ? Number(p.productGST) : 0
    }));

    for (const prodData of productsData) {
      prodData.imageHashes = await computeAllHashes(prodData.images || []);
    }

    const insertedProducts = await Product.insertMany(productsData);

    for (const prod of insertedProducts) {
      await createLog(
        "create",
        null,
        null,
        prod,
        req.user ? req.user._id : null,
        req.ip
      );
    }

    res.status(201).json({ message: "Products created successfully" });
  } catch (error) {
    console.error("Error bulk uploading products:", error);
    res.status(500).json({ message: "Server error during bulk upload" });
  }
});

// Advanced Image Search endpoint (optional)
router.get("/products/:id", async (req, res) => {
  try {
    // Check for a query parameter ?full=true to decide which fields to return.
    const full = req.query.full === "true";
    let product;
    if (full) {
      product = await Product.findById(req.params.id).lean();
    } else {
      product = await Product.findById(req.params.id)
        .select("name productDetails brandName category subCategory images productCost productGST")
        .lean();
    }
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server error fetching product" });
  }
});

// Export the router
module.exports = router;
