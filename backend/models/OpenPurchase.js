// models/OpenPurchase.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true },
  followUpDate: { type: String, required: true }, // Stored as string to match frontend date input (YYYY-MM-DD)
  note: { type: String, required: true },
  done: { type: Boolean, default: false }
});

const openPurchaseSchema = new mongoose.Schema({
  // Data coming from the job sheet:
  jobSheetCreatedDate: { type: Date, required: true },
  jobSheetNumber: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  eventName: { type: String, required: true },
  product: { type: String, required: true },
  sourcingFrom: { type: String, required: true },

  // NEW: Quantity fields
  qtyRequired: { type: Number, required: true },
  qtyOrdered: { type: Number, default: 0 },

  // Manually entered fields:
  vendorContactNumber: { type: String },
  orderConfirmedDate: { type: Date },
  expectedReceiveDate: { type: Date },
  schedulePickUp: { type: Date },
  followUp: { type: [followUpSchema], default: [] },
  remarks: { type: String },
  status: { type: String, enum: ["pending", "received", "alert"] },

  // Optional reference to the original jobsheet
  jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },

  // Combined delivery date and time from JobSheet.
  deliveryDateTime: { type: Date },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OpenPurchase", openPurchaseSchema);
