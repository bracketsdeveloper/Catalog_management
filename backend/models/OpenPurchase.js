// models/OpenPurchase.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String },           // no longer required
  followUpDate: { type: String },        // no longer required
  note: { type: String },                // no longer required
  done: { type: Boolean, default: false }
});

const openPurchaseSchema = new mongoose.Schema({
  // Data coming from the job sheet (all now optional):
  jobSheetCreatedDate: { type: Date },
  jobSheetNumber: { type: String },
  clientCompanyName: { type: String },
  eventName: { type: String },
  product: { type: String },
  sourcingFrom: { type: String },

  // NEW: Quantity fields
  qtyRequired: { type: Number },      // no longer required
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
