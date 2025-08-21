const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");

const IMAGE_DIR = "../../frontend/public/images";
const PUBLIC_URL_BASE = "http://localhost:3000/images/";
const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/ACE_CATALOG", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import Product model
const Product = require("../models/Product"); // adjust path if needed

const downloadImage = async (url, filename) => {
  const filepath = path.join(IMAGE_DIR, filename);
  const writer = fs.createWriteStream(filepath);

  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(filename));
    writer.on("error", reject);
  });
};

const migrateImages = async () => {
  const products = await Product.find({ images: { $exists: true, $ne: [] } });

  for (const product of products) {
    let updated = false;
    const newImageUrls = [];

    for (let i = 0; i < product.images.length; i++) {
      const imgUrl = product.images[i];

      if (imgUrl.startsWith(CLOUDINARY_PREFIX)) {
        const ext = path.extname(new URL(imgUrl).pathname).split("?")[0] || ".jpg";
        const filename = `${product._id}_${i}${ext}`;

        try {
          await downloadImage(imgUrl, filename);
          const newUrl = `${PUBLIC_URL_BASE}${filename}`;
          newImageUrls.push(newUrl);
          updated = true;
        } catch (err) {
          console.error(`❌ Failed to download ${imgUrl}:`, err.message);
          newImageUrls.push(imgUrl); // fallback to original
        }
      } else {
        newImageUrls.push(imgUrl); // keep original for non-Cloudinary
      }
    }

    if (updated) {
      product.images = newImageUrls;
      await product.save();
      console.log(`✅ Updated product ${product._id}`);
    } else {
      console.log(`↩️ Skipped product ${product._id} (no Cloudinary images)`);
    }
  }

  mongoose.disconnect();
  console.log("🏁 Migration completed.");
};

migrateImages();
