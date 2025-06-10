const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true },
  followUpDate: { type: Date },
  note: { type: String },
  done: { type: Boolean, default: false },
});

const closedPurchaseSchema = new mongoose.Schema({
  jobSheetCreatedDate: { type: Date, required: true },
  deliveryDateTime: { type: Date }, // Ensure deliveryDateTime is included
  jobSheetNumber: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  eventName: { type: String, required: true },
  product: { type: String, required: true },
  size: { type: String, default: "" },
  sourcingFrom: { type: String, required: true },
  qtyRequired: { type: Number, required: true },
  qtyOrdered: { type: Number, required: true },
  vendorContactNumber: { type: String },
  orderConfirmedDate: { type: Date },
  expectedReceiveDate: { type: Date },
  schedulePickUp: { type: Date },
  followUp: { type: [followUpSchema], default: [] },
  remarks: { type: String },
  status: { type: String, enum: ["pending", "received", "alert"], default: "pending" },
  splitId: { type: mongoose.Schema.Types.ObjectId }, // Remove default to control assignment
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: Date.now },
});

closedPurchaseSchema.index(
  { jobSheetId: 1, product: 1, size: 1, splitId: 1 },
  { unique: true, partialFilterExpression: { splitId: { $exists: true } } } // Unique only when splitId exists
);

module.exports = mongoose.model("ClosedPurchase", closedPurchaseSchema);