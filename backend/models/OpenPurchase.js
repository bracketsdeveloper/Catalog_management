// models/OpenPurchase.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  note: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true }
});

const openPurchaseItemSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  product: { type: String, required: true },
  color: { type: String },
  size: { type: String },
  quantity: { type: Number, required: true },
  sourcingFrom: { type: String },
  brandingType: { type: String },
  brandingVendor: { type: String },
  vendorContactNumber: { type: String },
  orderConfirmedDate: { type: Date },
  expectedReceiveDate: { type: Date },
  scheduledPickup: { type: Date },
  followUps: [followUpSchema],
  remarks: { type: String },
  status: { type: String, enum: ["Pending", "Received", "Alert"], default: "Pending" }
});

const openPurchaseSchema = new mongoose.Schema({
  jobSheetNumber: { type: String, required: true },
  // New Field: openPurchaseNumber, automatically set to jobSheetNumber if not provided
  openPurchaseNumber: { type: String, required: true },
  jobSheetCreatedDate: { type: Date, required: true },
  clientCompanyName: { type: String, required: true },
  eventName: { type: String, required: true },
  items: [openPurchaseItemSchema],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Use a pre-validate hook so the required validator will see the value
openPurchaseSchema.pre("validate", function (next) {
  if (!this.openPurchaseNumber) {
    this.openPurchaseNumber = this.jobSheetNumber;
  }
  next();
});

module.exports = mongoose.model("OpenPurchase", openPurchaseSchema);
