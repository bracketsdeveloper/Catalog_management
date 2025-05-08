// backend/models/BrandingCharge.js
const mongoose = require("mongoose");

const brandingChargeSchema = new mongoose.Schema({
  brandingName: { type: String, required: true, unique: true },
  cost: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

brandingChargeSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("BrandingCharge", brandingChargeSchema);
    