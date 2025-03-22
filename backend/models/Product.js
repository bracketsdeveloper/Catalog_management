const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productTag: { type: String, required: true },
  productId: { type: String, required: true },
  variantId: String,
  category: { type: String, required: true },
  subCategory: String,
  variationHinge: String,
  name: { type: String, required: true },
  brandName: String,
  stockInHand: { type: Number, required: true },
  stockCurrentlyWith: String,
  images: [String],
  // NEW FIELDS
  price: { type: Number, default: 0 }, // or required: true if you prefer
  productDetails: { type: String, default: "" }, // or required: false
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);
