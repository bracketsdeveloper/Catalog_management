const mongoose = require("mongoose");

const invoicesSummarySchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      // required: true,
    },
    jobSheetNumber: String,
    clientCompanyName: String,
    clientName: String,
    eventName: String,
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: Date,
    invoiceAmount: Number,
    invoiceMailed: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    invoiceMailedOn: Date, // New field
    invoiceUploadedOnPortal: String,
    crmName: String,
    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    indexes: [{ key: { invoiceNumber: 1 }, unique: true }],
  }
);

module.exports = mongoose.model("InvoicesSummary", invoicesSummarySchema);