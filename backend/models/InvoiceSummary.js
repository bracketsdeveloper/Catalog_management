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

    /* Reference data copied from InvoiceFollowUp */
    jobSheetNumber: String, // From InvoiceFollowUp
    clientCompanyName: String, // From InvoiceFollowUp
    eventName: String, // From InvoiceFollowUp
    invoiceNumber: String, // From InvoiceFollowUp

    /* Editable fields */
    invoiceDate: Date, // Manually entered
    invoiceAmount: Number, // Manually entered
    invoiceMailed: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    invoiceUploadedOnPortal: String, // Manually entered

    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvoicesSummary", invoicesSummarySchema);