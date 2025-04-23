// models/PendingPacking.js
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

const pendingPackingSchema = new mongoose.Schema(
  {
    productionJobSheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionJobSheet",
      required: true,
      unique: true,            // one‑to‑one with ProductionJobSheet
    },

    /* immutable reference fields ------------------------------ */
    jobSheetCreatedDate: Date,
    jobSheetNumber: String,
    expectedDeliveryDate: Date,
    clientCompanyName: String,
    eventName: String,
    product: String,

    /* worksheet / QC fields ----------------------------------- */
    jobSheetValidated: { type: String, enum: ["Yes", "No"], default: "No" },
    brandedProductExpectedOn: { type: Date }, // auto‑prefill but editable
    followUp: { type: [followUpSchema], default: [] },

    qtyOrdered: Number,
    qtyToBeDelivered: Number,
    qtyRejected: { type: Number, default: 0 },
    qcDoneBy: String,
    remarks: String,

    status: {
      type: String,
      enum: ["None", "Completed", "Pending", "Alert"],
      default: "None",
    },

    /* meta */
    createdBy: String,
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


module.exports = mongoose.model("PendingPacking", pendingPackingSchema);
