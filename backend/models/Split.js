const mongoose = require("mongoose");

const splitSchema = new mongoose.Schema({
  closedPurchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "ClosedPurchase", required: true },
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet", required: true },
  product: { type: String, required: true },
  size: { type: String, default: "" },
  qtyOrdered: { type: Number, required: true },
  qtyReceived: { type: Number, required: true },
  status: { type: String, enum: ["received"], default: "received" },
  splitAt: { type: Date, default: Date.now },
});

// Unique index to prevent duplicate splits
splitSchema.index({ closedPurchaseId: 1, splitAt: 1 }, { unique: true });

module.exports = mongoose.model("Split", splitSchema);