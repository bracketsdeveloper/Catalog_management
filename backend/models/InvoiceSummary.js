const mongoose = require("mongoose");

const invoicesSummarySchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      required: true,
    },
    jobSheetNumber: String,
    clientCompanyName: String,
    eventName: String,
    invoiceNumber: { type: String, required: true },
    invoiceDate: Date,
    invoiceAmount: Number,
    invoiceMailed: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    invoiceUploadedOnPortal: String,
    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    indexes: [{ key: { dispatchId: 1, invoiceNumber: 1 }, unique: true }],
  }
);

module.exports = mongoose.model("InvoicesSummary", invoicesSummarySchema);