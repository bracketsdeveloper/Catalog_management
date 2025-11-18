// models/PurchaseOrder.js
const mongoose = require("mongoose");

const poItemSchema = new mongoose.Schema({
  itemNo: Number,
  productName: String,
  productDescription: String,
  quantity: Number,
  unitPrice: Number, // from Product.productCost (fallback MRP)
  total: Number,     // qty * unitPrice
  hsnCode: String,
  gstPercent: Number,
  // optional: line-level remarks from invoiceRemarks
  itemRemarks: String,
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true }, // PO-APP-YYYY-SEQ
    issueDate: { type: Date, default: Date.now },
    requiredDeliveryDate: { type: Date },
    deliveryAddress: { type: String, default: "" },

    vendor: {
      vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
      vendorCompany: String,
      vendorName: String,
      address: String,
      phone: String,
      email: String,
      // NEW: captured GST of the vendor at time of PO
      gstNumber: String,
    },

    // one row = one item
    items: { type: [poItemSchema], default: [] },

    // refs back to the open purchase row for traceability
    openPurchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OpenPurchase",
      index: true,
    },
    jobSheetId: { type: mongoose.Schema.Types.ObjectId, ref: "JobSheet" },
    jobSheetNumber: String,
    clientCompanyName: String,
    eventName: String,

    // money
    subTotal: Number,
    gstTotal: Number, // sum of line GSTs
    grandTotal: Number,

    remarks: { type: String, default: "" },
    terms: { type: String, default: "" },

    // simple status (draft/issued/etc.) if you want
    status: { type: String, default: "draft" },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
