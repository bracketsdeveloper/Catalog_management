// models/ProductionJobsheet.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
    note: { type: String, required: true },
    enteredAt: { type: Date, default: Date.now },
    createdBy: { type: String, required: true }
  });

const productionJobsheetItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  // Expected In Hand comes from the open purchase's expectedReceiveDate field
  expectedInHand: { type: Date, required: true },
  brandingType: { type: String },
  brandingVendor: { type: String },
  // Manually entered production fields:
  expectedPostBrandingInAce: { type: Date, required: true },
  schedulePickup: { type: Date, required: true },
  // FollowUps: An array that uses the followUpSchema for multiple entries
  followUps: [followUpSchema],
  remarks: { type: String },
  // Production-specific status (e.g., "In Production", "Completed", etc.)
  status: { type: String, required: true }
});

const productionJobsheetSchema = new mongoose.Schema({
  // Reference jobsheet number from closed purchases
  referenceJobsheet: { type: String, required: true },
  orderDate: { type: Date, required: true },
  jobSheetNumber: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  eventName: { type: String, required: true },
  items: [productionJobsheetItemSchema],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProductionJobsheet", productionJobsheetSchema);
