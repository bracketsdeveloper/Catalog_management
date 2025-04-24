// models/InvoicesSummary.js
const mongoose = require("mongoose");

const invoicesSummarySchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      required: true,
      unique: true, // 1-to-1 with DispatchSchedule
    },
    invoiceFollowUpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvoiceFollowUp",
      required: true,
    },
    /* Copied fields */
    jobSheetNumber: { type: String, required: true }, // From InvoiceFollowUp
    clientCompanyName: { type: String, required: true }, // From InvoiceFollowUp
    eventName: { type: String, required: true }, // From InvoiceFollowUp
    invoiceNumber: { type: String }, // From InvoiceFollowUp
    /* Manually entered fields */
    invoiceDate: { type: Date }, // Manually entered
    invoiceAmount: { type: Number }, // Manually entered
    invoiceMailed: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    invoiceUploadedOnPortal: { type: String }, // Manually entered
    createdBy: { type: String },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvoicesSummary", invoicesSummarySchema);