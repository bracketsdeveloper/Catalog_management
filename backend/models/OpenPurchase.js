const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String },
  followUpDate: { type: String },
  note: { type: String },
  done: { type: Boolean, default: false }
});

const openPurchaseSchema = new mongoose.Schema({
  jobSheetCreatedDate: { type: Date },
  jobSheetNumber: { type: String },
  clientCompanyName: { type: String },
  eventName: { type: String },
  product: { type: String },
  size: { type: String, default: "" }, // Added size field
  sourcedBy: {type: String, default: ""},
  sourcingFrom: { type: String },
  qtyRequired: { type: Number },
  qtyOrdered: { type: Number, default: 0 },
  vendorContactNumber: { type: String },
  orderConfirmedDate: { type: Date },
  expectedReceiveDate: { type: Date },
  schedulePickUp: { type: Date },
  followUp: { type: [followUpSchema], default: [] },
  remarks: { type: String },
  status: { type: String, enum: ["pending", "received", "alert"] },
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
  deliveryDateTime: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OpenPurchase", openPurchaseSchema);