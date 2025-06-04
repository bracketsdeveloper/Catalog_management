const mongoose = require("mongoose");

const invoiceFollowUpSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      unique: true,
      sparse: true,
    },
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
    partialQty: Number,
    invoiceGenerated: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    invoiceNumber: String,
    remarks: String, // New field
    quotationTotal: Number,
    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InvoiceFollowUp", invoiceFollowUpSchema);