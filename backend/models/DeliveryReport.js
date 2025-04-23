// models/DeliveryReport.js
const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
  {
    followUpDate: { type: Date, required: true },
    note: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const excelRowSchema = new mongoose.Schema({}, { strict: false, _id: false });

const deliveryReportSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DispatchSchedule",
      required: true,
      unique: true,
    },

    /* reference info copied from DispatchSchedule */
    batchType: String, // Batch / Full Dispatch
    jobSheetNumber: String,
    clientCompanyName: String,
    eventName: String,
    product: String,
    dispatchQty: Number,
    deliveredSentThrough: String, // Mode of Delivery
    dcNumber: String, // New DC# field

    /* report-specific fields */
    deliveredOn: Date,
    status: {
      type: String,
      enum: ["none", "Delivered", "Pending", "Alert"],
      default: "none",
    },

    followUp: { type: [followUpSchema], default: [] },

    /* excel */
    excelFileName: String,
    excelData: [excelRowSchema], // parsed JSON rows

    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryReport", deliveryReportSchema);