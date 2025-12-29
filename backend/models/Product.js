const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'create', 'update', 'delete'
  field: { type: String },                  // which field was changed (for 'update')
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  performedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  performedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

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
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },
    createdAt: { type: Date, default: Date.now },
    logs: { 
      type: [logSchema], 
      default: [],
      validate: {
        validator: function(v) {
          // Ensure all logs have a performedBy field
          return v.every(log => log.performedBy);
        },
        message: 'All logs must have a performedBy field'
      }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);