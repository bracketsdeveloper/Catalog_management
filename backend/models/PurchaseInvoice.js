// models/PurchaseInvoice.js
const mongoose = require("mongoose");

const purchaseInvoiceItemSchema = new mongoose.Schema({
  product: { type: String, required: true },
  sourcingFrom: { type: String, required: true },
  cost: { type: Number, required: true },
  negotiatedCost: { type: Number },
  paymentMode: { type: String },
  paymentRef: { type: String },
  vendorInvoiceNumber: { type: String, uppercase: true, trim: true },
  vendorInvoiceReceived: { type: Boolean, default: false },
});

const purchaseInvoiceSchema = new mongoose.Schema({
  referenceJobSheetNo: { type: String, required: true },
  orderConfirmationDate: { type: Date, required: true },
  jobSheet: { type: String, required: true },
  clientName: { type: String, required: true },
  eventName: { type: String, required: true },
  items: [purchaseInvoiceItemSchema],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PurchaseInvoice", purchaseInvoiceSchema); 
