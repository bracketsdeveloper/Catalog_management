const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    slNo: { type: Number, required: true },
    description: { type: String, required: true },
    hsnCode: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "NOS" },
    rate: { type: Number, required: true },
    taxableAmount: { type: Number, required: true },
    cgstAmount: { type: Number, required: true },
    cgstPercent: { type: Number, required: true },
    sgstAmount: { type: Number, required: true },
    sgstPercent: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
  },
  { _id: false }
);

const invoiceDetailsSchema = new mongoose.Schema(
  {
    refJobSheetNumber: { type: String, default: "" },
    quotationRefNumber: { type: String, required: true },
    quotationDate: { type: Date, required: true },
    clientOrderIdentification: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    otherReference: { type: String, default: "" },
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceNumberFormat: { type: String, required: true },
    date: { type: Date, required: true },
    placeOfSupply: { type: String, default: "" },
    dueDate: { type: Date },
    poDate: { type: Date },
    poNumber: { type: String, default: "" },
    eWayBillNumber: { type: String, default: "" },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", required: true },
    billTo: { type: String, default: "" },
    shipTo: { type: String, default: "" },
    clientCompanyName: { type: String, default: "" },
    clientName: { type: String, default: "" },
    items: { type: [invoiceItemSchema], default: [] },
    invoiceDetails: { type: invoiceDetailsSchema, required: true },

    // Totals snapshot
    subtotalTaxable: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // NEW: Delivery Challan linkage
    deliveryChallanId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryChallan" },
    deliveryChallanNumber: { type: String, default: "" },

    createdBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
