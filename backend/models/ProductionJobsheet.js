// backend/models/ProductionJobSheet.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  followUpDate: { type: String },
  note: { type: String },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

const productionJobSheetSchema = new mongoose.Schema({
  jobSheetCreatedDate: { type: Date },
  jobSheetNumber: { type: String },
  clientCompanyName: { type: String },
  eventName: { type: String },
  product: { type: String },
  qtyRequired: { type: Number, default: 0 },
  qtyOrdered: { type: Number, default: 0 },
  deliveryDateTime: { type: Date },
  expectedReceiveDate: { type: Date },
  brandingType: { type: [String], default: [] },
  brandingVendor: { type: String },
  expectedPostBranding: { type: Date },
  schedulePickUp: { type: Date },
  followUp: { type: [followUpSchema], default: [] },
  remarks: { type: String },
  status: { type: String, enum: ["pending", "received", "alert"] },
  openPurchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "OpenPurchase" },
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProductionJobSheet", productionJobSheetSchema);
