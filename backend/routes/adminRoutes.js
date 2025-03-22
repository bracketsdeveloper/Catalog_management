const express = require("express");
const User = require("../models/User");
const Product = require("../models/Product");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

const router = express.Router();

// --------------------------------------
// Fetch all users
// --------------------------------------
router.get("/users", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "name dateOfBirth address phone email role");
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

// --------------------------------------
// Update user role
// --------------------------------------
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

// --------------------------------------
// Get all products
// --------------------------------------
router.get("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error fetching products" });
  }
});

// --------------------------------------
// Create single product
// --------------------------------------
router.post("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const newProduct = new Product({
      productTag: req.body.productTag,
      productId: req.body.productId,
      variantId: req.body.variantId || "",
      category: req.body.category,
      subCategory: req.body.subCategory || "",
      variationHinge: req.body.variationHinge || "",
      name: req.body.name,
      brandName: req.body.brandName || "",
      stockInHand: req.body.stockInHand,
      stockCurrentlyWith: req.body.stockCurrentlyWith || "",
      images: req.body.images || [],
      // NEW FIELDS
      price: req.body.price || 0,
      productDetails: req.body.productDetails || ""
    });

    await newProduct.save();
    res.status(201).json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error creating product" });
  }
});

// --------------------------------------
// Update single product
// --------------------------------------
router.put("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const updatedData = {
      productTag: req.body.productTag,
      productId: req.body.productId,
      variantId: req.body.variantId,
      category: req.body.category,
      subCategory: req.body.subCategory,
      variationHinge: req.body.variationHinge,
      name: req.body.name,
      brandName: req.body.brandName,
      stockInHand: req.body.stockInHand,
      stockCurrentlyWith: req.body.stockCurrentlyWith,
      images: req.body.images || [],
      // NEW FIELDS
      price: req.body.price,
      productDetails: req.body.productDetails
    };

    const updatedProduct = await Product.findByIdAndUpdate(productId, updatedData, {
      new: true
    });
    res.json({ message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error updating product" });
  }
});

// --------------------------------------
// Delete single product
// --------------------------------------
router.delete("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    await Product.findByIdAndDelete(productId);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error deleting product" });
  }
});

// --------------------------------------
// Bulk Upload (Updated to check required fields)
// --------------------------------------
router.post("/products/bulk", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Each item in req.body is an object representing a product
    const products = req.body.map((p) => ({
      productTag: p.productTag,
      productId: p.productId,
      variantId: p.variantId,
      category: p.category,
      subCategory: p.subCategory,
      variationHinge: p.variationHinge,
      name: p.name,
      brandName: p.brandName,
      stockInHand: p.stockInHand,
      stockCurrentlyWith: p.stockCurrentlyWith,
      images: p.images,
      // NEW FIELDS
      price: p.price || 0,
      productDetails: p.productDetails || ""
    }));

    await Product.insertMany(products);
    res.status(201).json({ message: "Products created successfully" });
  } catch (error) {
    console.error("Error bulk uploading products:", error);
    res.status(500).json({ message: "Server error during bulk upload" });
  }
});
module.exports = router;
