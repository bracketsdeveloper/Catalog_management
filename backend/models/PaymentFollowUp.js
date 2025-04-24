// models/PaymentFollowUp.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  date: Date,
  note: String,
  by: String,
  updatedOn: { type: Date, default: Date.now },
});

const paymentFollowUpSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      required: true,
      unique: true, // 1-to-1 with DispatchSchedule
    },

    /* Reference data copied from InvoiceFollowUp and InvoicesSummary */
    invoiceNumber: String, // From InvoiceFollowUp
    invoiceDate: Date, // Manually entered
    invoiceAmount: Number, // Manually entered
    invoiceMailed: String, // From InvoicesSummary (Yes/No)
    dueDate: Date, // Manually entered

    /* Calculated field (not stored, computed on fetch) */
    // overDueSince: computed as (today - dueDate)

    /* Follow-up history */
    followUps: [followUpSchema], // Array of follow-up entries

    /* Editable field */
    paymentReceived: Number, // Manually entered

    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentFollowUp", paymentFollowUpSchema);