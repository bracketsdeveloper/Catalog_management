const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true }
});

const closedPurchaseSchema = new mongoose.Schema({
  // Data coming from the JobSheet:
  jobSheetCreatedDate: { type: Date, required: true },
  jobSheetNumber: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  eventName: { type: String, required: true },
  product: { type: String, required: true },
  sourcingFrom: { type: String, required: true },
  // Manually entered fields:
  vendorContactNumber: { type: String },
  orderConfirmedDate: { type: Date },
  expectedReceiveDate: { type: Date },
  schedulePickUp: { type: Date },
  followUp: { type: [followUpSchema], default: [] },
  remarks: { type: String },
  status: { type: String, enum: ["pending", "received", "alert"], default: "pending" },
  // Optional reference to the original JobSheet:
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ClosedPurchase", closedPurchaseSchema);
