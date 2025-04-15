// models/ProductionJobSheet.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  followUpDate: { type: String, required: true },
  note: { type: String, required: true },
  updatedBy: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

const productionJobSheetSchema = new mongoose.Schema({
  jobSheetCreatedDate: { type: Date, required: true },
  jobSheetNumber: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  eventName: { type: String, required: true },
  product: { type: String, required: true },
  deliveryDateTime: { type: Date, required: true },
  expectedReceiveDate: { type: Date },
  brandingType: { type: String },
  brandingVendor: { type: String },
  expectedPostBranding: { type: Date }, // Updated field type
  schedulePickUp: { type: Date },
  followUp: { type: [followUpSchema], default: [] },
  remarks: { type: String },
  status: {
    type: String,
    enum: ["pending", "received", "alert"],
    required: true,
  },
  openPurchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "OpenPurchase" },
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProductionJobSheet", productionJobSheetSchema);
