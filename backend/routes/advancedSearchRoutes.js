const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const imghash = require("imghash");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");

// Use an environment variable for the upload directory; default to '/tmp/uploads'
const uploadDir = process.env.UPLOAD_DIR || "/tmp/uploads";

// Ensure the upload directory exists
fs.ensureDirSync(uploadDir);

// Configure multer storage with custom destination and filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Helper: Compute Hamming distance between two hash strings
function hammingDistance(hash1, hash2) {
  let distance = 0;
  for (let i = 0; i < hash1.length && i < hash2.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

// Helper: Get image hash from a source (URL or local file)
async function getImageHash(source) {
  if (/^https?:\/\//i.test(source)) {
    try {
      const response = await axios.get(source, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      const hash = await imghash.hash(buffer, 16);
      return hash;
    } catch (error) {
      console.error("Error fetching remote image:", error);
      return null;
    }
  } else {
    return imghash.hash(source, 16);
  }
}

// POST /advanced-search
// Accepts a single image file, computes its perceptual hash (pHash),
// and returns products with similar images based on Hamming distance.
router.post(
  "/advanced-search",
  authenticate,
  authorizeAdmin,
  upload.single("image"),
  async (req, res) => {
    let uploadedPath;
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      uploadedPath = req.file.path;
      // Compute hash for the uploaded image (local file)
      const uploadedHash = await imghash.hash(uploadedPath, 16);

      // Set similarity threshold (adjust as needed)
      const SIMILARITY_THRESHOLD = 10;
      const allProducts = await Product.find().lean();
      const matchedProducts = [];

      // Compare each product image's hash with the uploaded image's hash
      for (const product of allProducts) {
        if (!product.images || product.images.length === 0) continue;
        let foundMatch = false;
        for (const imgUrl of product.images) {
          const productHash = await getImageHash(imgUrl);
          if (!productHash) continue;
          const distance = hammingDistance(uploadedHash, productHash);
          if (distance < SIMILARITY_THRESHOLD) {
            foundMatch = true;
            break;
          }
        }
        if (foundMatch) {
          matchedProducts.push(product);
        }
      }

      res.json(matchedProducts);
    } catch (error) {
      console.error("Error performing advanced image search with pHash:", error);
      res.status(500).json({ message: "Error performing advanced image search with pHash" });
    } finally {
      // Clean up: delete the uploaded file after processing
      if (uploadedPath) {
        try {
          await fs.remove(uploadedPath);
        } catch (err) {
          console.error("Error removing uploaded file:", err);
        }
      }
    }
  }
);

module.exports = router;
