const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// GET all viewers
router.get("/viewers", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const viewers = await User.find({ role: "VIEWER" }).lean();
    res.json(viewers);
  } catch (error) {
    console.error("Error fetching viewers:", error);
    res.status(500).json({ message: "Server error fetching viewers" });
  }
});

// GET products for viewer or admin (with pagination for admin)
router.get("/products", authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    if (req.user.role === "VIEWER") {
      // Return only accessible products for this viewer
      const viewer = await User.findById(req.user._id).lean();
      if (!viewer) {
        return res.status(404).json({ message: "Viewer not found" });
      }
      const productIds = viewer.accessibleProducts || [];
      // For a viewer, we might not strictly do pagination, but you can if you wish:
      const products = await Product.find({ _id: { $in: productIds } })
        .skip(skip)
        .limit(limit)
        .lean();

      // Return total count as well for front-end pagination if needed
      const totalCount = await Product.countDocuments({ _id: { $in: productIds } });

      res.json({
        products,
        total: totalCount,
        visibleAttributes: viewer.visibleAttributes || [],
      });
    } else if (req.user.role === "ADMIN") {
      // Admin can see all products with pagination
      const [totalCount, products] = await Promise.all([
        Product.countDocuments(),
        Product.find().skip(skip).limit(limit).lean(),
      ]);

      res.json({
        products,
        total: totalCount,
        visibleAttributes: [],
      });
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error fetching products" });
  }
});

// GET product details for viewer or admin
router.get("/products/:id", authenticate, async (req, res) => {
  try {
    const productId = req.params.id;
    if (req.user.role === "VIEWER") {
      const viewer = await User.findById(req.user._id).lean();
      if (!viewer) {
        return res.status(404).json({ message: "Viewer not found" });
      }
      const accessibleIds = (viewer.accessibleProducts || []).map((id) => id.toString());
      if (!accessibleIds.includes(productId)) {
        return res.status(403).json({ message: "Not authorized to view this product" });
      }
      const product = await Product.findById(productId).lean();
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ product, visibleAttributes: viewer.visibleAttributes || [] });
    } else if (req.user.role === "ADMIN") {
      const product = await Product.findById(productId).lean();
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ product, visibleAttributes: [] });
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }
  } catch (error) {
    console.error("Error fetching product details for viewer/admin:", error);
    res.status(500).json({ message: "Server error fetching product details" });
  }
});

// POST create new viewer
router.post("/viewers", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      accessibleProducts,
      visibleAttributes,
      singleSession,
      maxLogins,
    } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newViewer = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "VIEWER",
      isVerified: true,
      accessibleProducts: accessibleProducts || [],
      visibleAttributes: visibleAttributes || [],
      singleSession: !!singleSession,
      maxLogins: maxLogins || 1,
      loginCount: 0,
    });
    await newViewer.save();
    res.status(201).json(newViewer);
  } catch (error) {
    console.error("Error creating viewer:", error);
    res.status(500).json({ message: "Server error creating viewer" });
  }
});

// PUT update viewer
router.put("/viewers/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      accessibleProducts,
      visibleAttributes,
      singleSession,
      maxLogins,
    } = req.body;
    const updateData = {
      name,
      email,
      phone,
      accessibleProducts,
      visibleAttributes,
      singleSession: !!singleSession,
    };
    if (maxLogins !== undefined) {
      updateData.maxLogins = maxLogins;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    const updatedViewer = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedViewer) {
      return res.status(404).json({ message: "Viewer not found" });
    }
    res.json(updatedViewer);
  } catch (error) {
    console.error("Error updating viewer:", error);
    res.status(500).json({ message: "Server error updating viewer" });
  }
});

// PUT reactivate viewer (reset loginCount)
router.put("/viewers/:id/reactivate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedViewer = await User.findByIdAndUpdate(
      req.params.id,
      { loginCount: 0 },
      { new: true }
    );
    if (!updatedViewer) {
      return res.status(404).json({ message: "Viewer not found" });
    }
    res.json({ message: "Viewer reactivated successfully", viewer: updatedViewer });
  } catch (error) {
    console.error("Error reactivating viewer:", error);
    res.status(500).json({ message: "Server error reactivating viewer" });
  }
});

// DELETE viewer
router.delete("/viewers/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Viewer not found" });
    }
    res.json({ message: "Viewer deleted successfully" });
  } catch (error) {
    console.error("Error deleting viewer:", error);
    res.status(500).json({ message: "Server error deleting viewer" });
  }
});

module.exports = router;
