const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Use an environment variable for the upload directory, defaulting to '/tmp/uploads'
const uploadDir = process.env.UPLOAD_DIR || "/tmp/uploads";

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage with custom destination and filename to avoid collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// POST /api/products/advanced-search
// This route accepts a single image file and returns matching products.
// For demonstration purposes, it simply returns the first 5 products.
// Replace this with your actual image matching algorithm.
router.post(
  "/advanced-search",
  authenticate,
  authorizeAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      // In a real scenario, process req.file to analyze the image.
      // Here we return the first 5 products as a dummy response.
      const products = await Product.find().limit(5);
      res.json(products);
    } catch (error) {
      console.error("Advanced search error:", error);
      res.status(500).json({ message: "Error performing advanced search" });
    }
  }
);

module.exports = router;
