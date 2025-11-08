const mongoose = require("mongoose");

/**
 * OpenPurchase model
 * - Includes editable `productPrice`
 * - `poId` link to generated PO
 * - `invoiceRemarks` added (prints on PO / carries to Closed)
 * - `strict: false` to coexist with any extra fields you already store
 */
const openPurchaseSchema = new mongoose.Schema(
  {
    // Links
    jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
    jobSheetNumber: String,

    // Client/event context
    clientCompanyName: String,
    eventName: String,

    // Item basics
    product: { type: String, required: true },
    size: String,
    color: String,
    hsnCode: String,

    // Quantities
    qtyRequired: { type: Number, default: 0 },
    qtyOrdered: { type: Number, default: 0 },

    // Pricing (editable at row; fetched initially from Product)
    productPrice: { type: Number, default: 0 },
    targetTotal: { type: Number, default: 0 },

    // Vendor selection
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },

    // Dates
    createdDate: { type: Date, default: Date.now },
    deliveryDateTime: { type: Date },

    // Status
    status: {
      type: String,
      enum: ["open", "ordered", "in-progress", "received", "closed", "cancelled", "pending", "alert"],
      default: "open",
    },

    // Attached PO
    poId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", index: true },

    // Remarks
    remarks: { type: String, default: "" },           // general notes
    invoiceRemarks: { type: String, default: "" },    // NEW: prints on PO / flows to Closed

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("OpenPurchase", openPurchaseSchema);
