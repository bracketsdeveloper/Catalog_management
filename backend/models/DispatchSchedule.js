// models/DispatchSchedule.js
const mongoose = require("mongoose");

const dispatchScheduleSchema = new mongoose.Schema(
  {
    /* link back to the Packing row that was Completed */
    pendingPackingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PendingPacking",
      required: true,
      unique: true, // 1-to-1
    },

    /* immutable reference data (copied for quick table render) */
    jobSheetCreatedDate: Date,
    jobSheetNumber: String,
    expectedDeliveryDate: Date,
    clientCompanyName: String,
    eventName: String,
    product: String,

    /* dispatch-workspace fields */
    batchType: { type: String, enum: ["Batch", "Full Dispatch"], default: "Batch" },
    jobSheetValidated: { type: String, enum: ["Yes", "No"], default: "No" },

    dispatchQty: Number,
    sentOn: Date,
    modeOfDelivery: String,
    remarks: String,
    dcNumber: String, // New DC# field
    status: { type: String, enum: ["none", "sent", "pending", "alert"], default: "none" },

    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DispatchSchedule", dispatchScheduleSchema);