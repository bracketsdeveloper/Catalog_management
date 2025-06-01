const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  paymentDate: { type: Date, required: true },
  referenceNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  amount: { type: Number, required: true },
  updatedOn: { type: Date, default: Date.now },
});

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
    },
    jobSheetNumber: String, // New field
    clientCompanyName: String, // New field
    clientName: String, // New field
    invoiceNumber: String, // From InvoiceFollowUp
    invoiceDate: Date, // Manually entered
    invoiceAmount: Number, // Manually entered
    invoiceMailed: String, // From InvoicesSummary (Yes/No)
    invoiceMailedOn: Date, // From InvoicesSummary
    dueDate: Date, // Calculated or manually entered
    followUps: [followUpSchema], // Array of follow-up entries
    paymentReceived: [paymentSchema], // New sub-schema for payments
    discountAllowed: Number, // New field
    TDS: Number, // New field
    remarks: String, // New field
    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentFollowUp", paymentFollowUpSchema);