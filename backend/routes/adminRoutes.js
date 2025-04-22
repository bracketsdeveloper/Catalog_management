const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const axios = require("axios");
const imghash = require("imghash");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");
const User = require("../models/User");
const Log = require("../models/Log");

// ------------------------------
// UTILITY FUNCTIONS
// ------------------------------

async function createLog(action, field, oldValue, newValue, performedBy, ip) {
  try {
    await Log.create({
      action,
      field,
      oldValue,
      newValue,
      performedBy,
      performedAt: new Date(),
      ipAddress: ip,
    });
  } catch (err) {
    console.error("Error creating log:", err);
  }
}

function getFieldDifferences(oldDoc, newDoc) {
  const changes = [];
  for (const key of Object.keys(newDoc)) {
    const oldVal = oldDoc[key] == null ? "" : String(oldDoc[key]);
    const newVal = newDoc[key] == null ? "" : String(newDoc[key]);
    if (oldVal !== newVal) {
      changes.push({
        field: key,
        oldValue: oldDoc[key],
        newValue: newDoc[key],
      });
    }
  }
  return changes;
}

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
  for (const url of imageUrls || []) {
    const hash = await computeImageHash(url);
    if (hash) hashes.push(hash);
  }
  return hashes;
}

// ------------------------------
// USER ENDPOINTS
// ------------------------------

router.get("/users", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "name dateOfBirth address phone email role");
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

// GET /api/admin/products - Filtered & Paginated Products with Enhanced Search
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
      variationHinges,
    } = req.query;
    const query = {};

    if (search) {
      const searchTerms = search.split(",").map((term) => term.trim().toLowerCase());
      query.$or = searchTerms.flatMap((term) => [
        { productTag: { $regex: term, $options: "i" } },
        { productId: { $regex: term, $options: "i" } },
        { variantId: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
        { subCategory: { $regex: term, $options: "i" } },
        { variationHinge: { $regex: term, $options: "i" } },
        { name: { $regex: term, $options: "i" } },
        { brandName: { $regex: term, $options: "i" } },
        { productDetails: { $regex: term, $options: "i" } },
        { priceRange: { $regex: term, $options: "i" } },
        { MRP_Currency: { $regex: term, $options: "i" } },
        { MRP_Unit: { $regex: term, $options: "i" } },
        { deliveryTime: { $regex: term, $options: "i" } },
        { size: { $regex: term, $options: "i" } },
        { color: { $regex: term, $options: "i" } },
        { material: { $regex: term, $options: "i" } },
        { weight: { $regex: term, $options: "i" } },
        { hsnCode: { $regex: term, $options: "i" } },
        { productCost_Currency: { $regex: term, $options: "i" } },
        { productCost_Unit: { $regex: term, $options: "i" } },
        { images: { $elemMatch: { $regex: term, $options: "i" } } },
      ]);
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
      totalPages: Math.ceil(totalProducts / limitNum),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error fetching products" });
  }
});

// GET /api/admin/products/filters - Returns distinct filter values with counts
router.get("/products/filters", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const [
      categories,
      subCategories,
      brands,
      priceRanges,
      variationHinges,
    ] = await Promise.all([
      Product.aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, _id: 0 } },
      ]),
      Product.aggregate([
        { $match: { subCategory: { $ne: null } } },
        { $group: { _id: "$subCategory", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, _id: 0 } },
      ]),
      Product.aggregate([
        { $match: { brandName: { $ne: null } } },
        { $group: { _id: "$brandName", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, _id: 0 } },
      ]),
      Product.aggregate([
        { $match: { priceRange: { $ne: null } } },
        { $group: { _id: "$priceRange", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, _id: 0 } },
      ]),
      Product.aggregate([
        { $match: { variationHinge: { $ne: null } } },
        { $group: { _id: "$variationHinge", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, _id: 0 } },
      ]),
    ]);

    res.status(200).json({
      categories: categories.filter((c) => c.name && c.count > 0),
      subCategories: subCategories.filter((c) => c.name && c.count > 0),
      brands: brands.filter((c) => c.name && c.count > 0),
      priceRanges: priceRanges.filter((c) => c.name && c.count > 0),
      variationHinges: variationHinges.filter((c) => c.name && c.count > 0),
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ message: "Error fetching filter options" });
  }
});

// POST /api/admin/products - Create a single product (with hash computation)
router.post("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { images = [] } = req.body;

    if (!req.body.productTag || !req.body.productId || !req.body.category || !req.body.name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
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
      productGST: Number(req.body.productGST) || 0,
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
      product: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Product ID must be unique",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Server error creating product",
        error: error.message,
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
        message: "Product not found",
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
          : existingProduct.productGST,
    };

    const fieldDiffs = getFieldDifferences(existingProduct.toObject(), updatedData);

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
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
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating product",
      error: error.message,
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
      variantId: p.variantId || "",
      category: p.category,
      subCategory: p.subCategory || "",
      variationHinge: p.variationHinge || "",
      name: p.name,
      brandName: p.brandName || "",
      images: p.images || [],
      productDetails: p.productDetails || "",
      qty: Number(p.qty) || 0,
      MRP_Currency: p.MRP_Currency || "",
      MRP: Number(p.MRP) || 0,
      MRP_Unit: p.MRP_Unit || "",
      deliveryTime: p.deliveryTime || "",
      size: p.size || "",
      color: p.color || "",
      material: p.material || "",
      priceRange: p.priceRange || "",
      weight: p.weight || "",
      hsnCode: p.hsnCode || "",
      productCost_Currency: p.productCost_Currency || "",
      productCost: Number(p.productCost) || 0,
      productCost_Unit: p.productCost_Unit || "",
      productGST: p.productGST != null ? Number(p.productGST) : 0,
    }));

    for (const prodData of productsData) {
      prodData.imageHashes = await computeAllHashes(prodData.images);
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
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Duplicate product ID detected",
      });
    } else {
      res.status(500).json({ message: "Server error during bulk upload" });
    }
  }
});

// GET /api/admin/products/:id - Fetch a single product
router.get("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
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

// POST /api/products/advanced-search - Advanced Image Search (to be implemented)
router.post("/products/advanced-search", authenticate, authorizeAdmin, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const imageFile = req.files.image;
    const hash = await computeImageHash(imageFile.data);

    if (!hash) {
      return res.status(500).json({ message: "Failed to compute image hash" });
    }

    // Simple hash-based search (to be enhanced with a proper image similarity algorithm)
    const products = await Product.find({
      imageHashes: { $in: [hash] },
    }).lean();

    res.status(200).json(products);
  } catch (error) {
    console.error("Error in advanced search:", error);
    res.status(500).json({ message: "Server error during advanced search" });
  }
});

module.exports = router;