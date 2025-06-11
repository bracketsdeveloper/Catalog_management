const mongoose = require("mongoose");

const purchaseInvoiceSchema = new mongoose.Schema(
  {
    orderConfirmationDate: { type: Date, required: true },
    deliveryDateTime: { type: Date }, // Already present
    jobSheetNumber: { type: String, required: true },
    clientName: { type: String, required: true },
    eventName: { type: String, required: true },
    product: { type: String, required: true },
    sourcingFrom: { type: String, required: true },
    cost: { type: Number, required: true },
    negotiatedCost: { type: Number, default: 0 },
    paymentMade: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Not Paid", "Partially Paid", "Fully Paid"],
      default: "Not Paid",
    },
    vendorInvoiceNumber: {
      type: String,
      required: true,
      set: (v) => (v ? v.toUpperCase() : v),
    },
    vendorInvoiceReceived: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    qtyRequired: { type: Number },
    qtyOrdered: { type: Number },
    size: { type: String, default: "" }, // Add size explicitly
  },
  { timestamps: true }
);

purchaseInvoiceSchema.index(
  { jobSheetNumber: 1, product: 1, size: 1 },
  { unique: true }
);

module.exports = mongoose.model("PurchaseInvoice", purchaseInvoiceSchema);