// models/InvoiceFollowUp.js
const mongoose = require("mongoose");

const invoiceFollowUpSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      required: true,
      unique: true, // 1-to-1 with DispatchSchedule
    },

    /* Reference data copied from DispatchSchedule and related JobSheet */
    orderDate: Date, // From JobSheet
    jobSheetNumber: String, // From DispatchSchedule
    clientCompanyName: String, // From DispatchSchedule
    eventName: String, // From DispatchSchedule
    quotationNumber: String, // From JobSheet's referenceQuotation
    crmName: String, // From JobSheet's crmIncharge
    product: String, // From DispatchSchedule
    dispatchedOn: Date, // From DispatchSchedule's sentOn
    deliveredThrough: String, // From DeliveryReport's deliveredSentThrough
    poStatus: String, // From JobSheet

    /* Editable fields */
    partialQty: Number, // Manually entered
    invoiceGenerated: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    invoiceNumber: String, // Manually entered

    /* Calculated field (not stored, computed on fetch) */
    // pendingFromDays: computed as (today - dispatchedOn)

    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvoiceFollowUp", invoiceFollowUpSchema);
