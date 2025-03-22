// routes/advancedSearchPhash.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const axios = require("axios");
const imghash = require("imghash");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");

const upload = multer({ dest: "uploads/" });

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
      // Ensure the uploaded file is deleted after processing
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
