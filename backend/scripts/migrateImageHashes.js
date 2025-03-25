require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const imghash = require("imghash");
const axios = require("axios");
const fs = require("fs-extra");

// Use the MONGO_URI from your .env file
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function computeImageHash(url) {
  try {
    if (/^https?:\/\//i.test(url)) {
      // Set a timeout and validate status to accept only 2xx responses.
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const buffer = Buffer.from(response.data, "binary");
      return await imghash.hash(buffer, 16);
    } else {
      return await imghash.hash(url, 16);
    }
  } catch (err) {
    // If error status is 502, log a warning and skip this image.
    if (err.response && err.response.status === 502) {
      console.warn(`Warning: Received 502 for ${url}. Skipping this image.`);
      return null;
    }
    console.error("Error hashing", url, err);
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

(async function runMigration() {
  try {
    const products = await Product.find({});
    for (const product of products) {
      // Skip if imageHashes already exist and contain at least one hash.
      if (product.imageHashes && product.imageHashes.length > 0) {
        console.log(`Skipping product ${product._id} as it already has hashes.`);
        continue;
      }
      if (!product.images || product.images.length === 0) continue;
      const imageHashes = await computeAllHashes(product.images);
      // Update only the imageHashes field without triggering validations.
      await Product.updateOne(
        { _id: product._id },
        { $set: { imageHashes } },
        { runValidators: false }
      );
      console.log(`Updated product ${product._id} with ${imageHashes.length} hashes`);
    }
    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
})();
