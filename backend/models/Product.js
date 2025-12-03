const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productTag: { type: String, required: true },
    productId: { type: String, required: true, unique: true },
    variantId: String,
    category: { type: String, required: true },
    subCategory: String,
    variationHinge: String,
    name: { type: String, required: true },
    brandName: String,
    images: [String],
    imageHashes: [String],
    productDetails: { type: String, default: "" },
    qty: { type: Number, default: 0 },
    MRP_Currency: { type: String, default: "" },
    MRP: { type: Number, default: 0 },
    MRP_Unit: { type: String, default: "" },
    deliveryTime: { type: String, default: "" },
    size: { type: String, default: "" },
    color: { type: String, default: "" },
    material: { type: String, default: "" },
    priceRange: { type: String, default: "" },
    weight: { type: String, default: "" },
    hsnCode: { type: String, default: "" },
    productCost_Currency: { type: String, default: "" },
    productCost: { type: Number, default: 0 },
    productCost_Unit: { type: String, default: "" },
    productGST: { type: Number, default: 0 },
    preferredVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vendor" }],
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
