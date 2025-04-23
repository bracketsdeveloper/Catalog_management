const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  followUpDate: { type: String }, // Removed required: true
  note: { type: String }, // Removed required: true
  updatedBy: { type: String }, // Removed required: true
  updatedAt: { type: Date, default: Date.now },
});

const productionJobSheetSchema = new mongoose.Schema({
  jobSheetCreatedDate: { type: Date }, // Removed required: true
  jobSheetNumber: { type: String }, // Removed required: true
  clientCompanyName: { type: String }, // Removed required: true
  eventName: { type: String }, // Removed required: true
  product: { type: String }, // Removed required: true
  qtyRequired: { type: Number, default: 0 },
  qtyOrdered: { type: Number, default: 0 },
  deliveryDateTime: { type: Date }, // Removed required: true
  expectedReceiveDate: { type: Date },
  brandingType: { type: String },
  brandingVendor: { type: String },
  expectedPostBranding: { type: Date },
  schedulePickUp: { type: Date },
  followUp: { type: [followUpSchema], default: [] },
  remarks: { type: String },
  status: { type: String, enum: ["pending", "received", "alert"] }, // Removed required: true
  openPurchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "OpenPurchase" },
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProductionJobSheet", productionJobSheetSchema);