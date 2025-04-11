// models/ProductionInvoice.js
const mongoose = require("mongoose");

const productionInvoiceItemSchema = new mongoose.Schema({
  product: { type: String, required: true },
  sourcingFrom: { type: String, required: true },
  cost: { type: Number, required: true },
  negotiatedCost: { type: Number },
  paymentMode: { type: String },
  paymentRef: { type: String },
  vendorInvoiceNumber: { type: String, required: true, uppercase: true, trim: true },
  vendorInvoiceReceived: { type: Boolean, default: false },
});

const productionInvoiceSchema = new mongoose.Schema({
  // Reference production jobsheet number
  referenceJobsheetNo: { type: String, required: true },
  orderConfirmationDate: { type: Date, required: true },
  jobSheet: { type: String, required: true },
  clientName: { type: String, required: true },
  eventName: { type: String, required: true },
  items: [productionInvoiceItemSchema],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProductionInvoice", productionInvoiceSchema);
