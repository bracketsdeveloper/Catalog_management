// models/ProductionJobSheetInvoice.js
const mongoose = require("mongoose");

const PaymentModeSchema = new mongoose.Schema({
  mode: { type: String, required: true },
});

const productionJobSheetInvoiceSchema = new mongoose.Schema({
  productionJobSheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductionJobSheet",
    required: true,
  },
  orderConfirmationDate: { type: Date, required: true },
  jobSheetNumber: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  eventName: { type: String, required: true },
  product: { type: String, required: true },
  qtyRequired: { type: Number, default: 0 }, // NEW
  qtyOrdered: { type: Number, default: 0 },  // NEW
  sourceFrom: { type: String, required: true },
  cost: { type: Number, required: true },
  negotiatedCost: { type: Number, required: true },
  paymentModes: { type: [PaymentModeSchema], default: [] },
  vendorInvoiceNumber: { type: String, required: true },
  vendorInvoiceReceived: {
    type: String,
    enum: ["Yes", "No"],
    default: "No",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

productionJobSheetInvoiceSchema.pre("save", function (next) {
  if (this.vendorInvoiceNumber) {
    this.vendorInvoiceNumber = this.vendorInvoiceNumber.toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model(
  "ProductionJobSheetInvoice",
  productionJobSheetInvoiceSchema
);
