const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const axios = require("axios");
const imghash = require("imghash");
const path = require("path");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");

// Use an environment variable for the upload directory; default to '/tmp/uploads'
const uploadDir = process.env.UPLOAD_DIR || "/tmp/uploads";
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
// For remote URLs, download the image as a buffer, save to a temporary file,
// compute its hash using imghash.hash, and then remove the temporary file.
async function getImageHash(source) {
  if (/^https?:\/\//i.test(source)) {
    try {
      const response = await axios.get(source, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      // Create a temporary file name in the upload directory
      const tempFile = path.join(uploadDir, `temp_${Date.now()}.jpg`);
      await fs.writeFile(tempFile, buffer);
      const hash = await imghash.hash(tempFile, 16);
      await fs.remove(tempFile);
      return hash;
    } catch (error) {
      console.error("Error fetching remote image:", error);
      return null;
    }
  } else {
    // For local file paths, simply compute hash directly
    return imghash.hash(source, 16);
  }
}

// POST /advanced-search
// Accepts an image file, computes its perceptual hash (pHash),
// and returns products with similar images based on Hamming distance.
// This route uses precomputed imageHashes if available, and falls back
// to computing hashes on the fly.
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
      // Compute the perceptual hash (pHash) for the uploaded image.
      const uploadedHash = await imghash.hash(uploadedPath, 16);

      // Set similarity threshold (adjust as needed)
      const SIMILARITY_THRESHOLD = 1;

      // Retrieve all products (pull minimal fields needed for search)
      const allProducts = await Product.find(
        {},
        { imageHashes: 1, images: 1, productTag: 1, name: 1 }
      ).lean();
      const matchedProducts = [];

      // Compare the uploaded hash with each product's stored hashes
      for (const product of allProducts) {
        if (product.imageHashes && product.imageHashes.length > 0) {
          const isSimilar = product.imageHashes.some(
            (storedHash) => hammingDistance(uploadedHash, storedHash) < SIMILARITY_THRESHOLD
          );
          if (isSimilar) {
            matchedProducts.push(product);
          }
        } else {
          // Fallback: if no precomputed hashes, compute hash for each image on the fly
          if (!product.images || product.images.length === 0) continue;
          let isSimilar = false;
          for (const imgUrl of product.images) {
            try {
              const productHash = await getImageHash(imgUrl);
              if (productHash && hammingDistance(uploadedHash, productHash) < SIMILARITY_THRESHOLD) {
                isSimilar = true;
                break;
              }
            } catch (err) {
              console.error("Fallback error for image:", imgUrl, err);
              continue;
            }
          }
          if (isSimilar) {
            matchedProducts.push(product);
          }
        }
      }

      res.json(matchedProducts);
    } catch (error) {
      console.error("Error performing advanced image search:", error);
      res.status(500).json({ message: "Error performing advanced image search" });
    } finally {
      // Clean up: remove the uploaded file after processing
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
