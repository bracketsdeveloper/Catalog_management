const mongoose = require("mongoose");

const invoiceFollowUpSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      unique: true,
      sparse: true,
    },
    /* Reference data copied from DispatchSchedule and related JobSheet */
    orderDate: Date,
    jobSheetNumber: String,
    clientCompanyName: String,
    eventName: String,
    quotationNumber: String,
    crmName: String,
    product: String,
    dispatchedOn: Date,
    deliveredThrough: String,
    poStatus: String,
    /* Editable fields */
    partialQty: Number,
    invoiceGenerated: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    invoiceNumber: String,
    /* New field for Quotation total */
    quotationTotal: Number, // From Quotation.grandTotal
    /* Calculated field (not stored, computed on fetch) */
    // pendingFromDays: computed as (today - dispatchedOn)
    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvoiceFollowUp", invoiceFollowUpSchema);