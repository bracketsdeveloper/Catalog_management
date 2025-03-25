const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const axios = require("axios");
const imghash = require("imghash");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");
const User = require("../models/User");

// ------------------------------
// USER ENDPOINTS
// ------------------------------

// Fetch all users (only selected fields)
router.get("/users", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "name dateOfBirth address phone email role");
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

// Update user role
router.put("/users/:id/role", authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["GENERAL", "ADMIN"].includes(role)) {
    return res.status(400).json({ message: "Invalid role specified" });
  }

  try {
    const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });
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

    // Global search using regex on multiple fields
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

    // Additional filtering using $in operator on comma-separated values
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
      .limit(limitNum);
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
    const images = req.body.images || [];
    const imageHashes = await computeAllHashes(images);

    const newProduct = new Product({
      productTag: req.body.productTag,
      productId: req.body.productId,
      variantId: req.body.variantId || "",
      category: req.body.category,
      subCategory: req.body.subCategory || "",
      variationHinge: req.body.variationHinge || "",
      name: req.body.name,
      brandName: req.body.brandName || "",
      images,
      imageHashes,
      productDetails: req.body.productDetails || "",
      qty: req.body.qty || 0,
      MRP_Currency: req.body.MRP_Currency || "",
      MRP: req.body.MRP || 0,
      MRP_Unit: req.body.MRP_Unit || "",
      deliveryTime: req.body.deliveryTime || "",
      size: req.body.size || "",
      color: req.body.color || "",
      material: req.body.material || "",
      priceRange: req.body.priceRange || "",
      weight: req.body.weight || "",
      hsnCode: req.body.hsnCode || "",
      productCost_Currency: req.body.productCost_Currency || "",
      productCost: req.body.productCost || 0,
      productCost_Unit: req.body.productCost_Unit || ""
    });
    await newProduct.save();
    res.status(201).json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error creating product" });
  }
});

// PUT /api/admin/products/:id - Update a single product (with hash computation)
router.put("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const images = req.body.images || [];
    const imageHashes = await computeAllHashes(images);

    const updatedData = {
      productTag: req.body.productTag,
      productId: req.body.productId,
      variantId: req.body.variantId,
      category: req.body.category,
      subCategory: req.body.subCategory,
      variationHinge: req.body.variationHinge,
      name: req.body.name,
      brandName: req.body.brandName,
      images,
      imageHashes,
      productDetails: req.body.productDetails,
      qty: req.body.qty,
      MRP_Currency: req.body.MRP_Currency,
      MRP: req.body.MRP,
      MRP_Unit: req.body.MRP_Unit,
      deliveryTime: req.body.deliveryTime,
      size: req.body.size,
      color: req.body.color,
      material: req.body.material,
      priceRange: req.body.priceRange,
      weight: req.body.weight,
      hsnCode: req.body.hsnCode,
      productCost_Currency: req.body.productCost_Currency,
      productCost: req.body.productCost,
      productCost_Unit: req.body.productCost_Unit
    };

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error updating product" });
  }
});

// DELETE /api/admin/products/:id - Delete a product
router.delete("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
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
      productCost_Unit: p.productCost_Unit || ""
    }));

    // Compute and assign image hashes for each product
    for (const prodData of productsData) {
      prodData.imageHashes = await computeAllHashes(prodData.images || []);
    }

    await Product.insertMany(productsData);
    res.status(201).json({ message: "Products created successfully" });
  } catch (error) {
    console.error("Error bulk uploading products:", error);
    res.status(500).json({ message: "Server error during bulk upload" });
  }
});

// ------------------------------
// Advanced Image Search Endpoint
// ------------------------------
// Accepts a single image, computes its hash, and returns products with similar images


module.exports = router;
