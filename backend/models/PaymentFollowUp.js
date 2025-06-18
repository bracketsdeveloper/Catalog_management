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
    jobSheetNumber: { type: String, required: true }, // Make required
    clientCompanyName: String,
    clientName: String,
    invoiceNumber: { type: String, required: true }, // Make required
    invoiceDate: Date,
    invoiceAmount: Number,
    invoiceMailed: String,
    invoiceMailedOn: Date,
    dueDate: Date,
    followUps: [followUpSchema],
    paymentReceived: [paymentSchema],
    discountAllowed: Number,
    TDS: Number,
    remarks: String,
    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    indexes: [
      // Composite unique index
      {
        key: { dispatchId: 1, jobSheetNumber: 1, invoiceNumber: 1 },
        unique: true,
      },
    ],
  }
);

module.exports = mongoose.model("PaymentFollowUp", paymentFollowUpSchema);