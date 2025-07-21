// backend/models/EInvoice.js
const mongoose = require("mongoose");

const eInvoiceSchema = new mongoose.Schema({
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", required: true, unique: true },
  authToken: { type: String },
  tokenExpiry: { type: Date },
  sek: { type: String },
  clientId: { type: String },

  // Customer details fetched from Whitebooks
  customerDetails: {
    gstin: { type: String },
    legalName: { type: String },
    tradeName: { type: String },
    address1: { type: String },
    address2: { type: String },
    location: { type: String },
    pincode: { type: String },
    stateCode: { type: String },
    phone: { type: String },
    email: { type: String },
  },

  // Raw reference JSON payload
  referenceJson: { type: mongoose.Schema.Types.Mixed },

  // Generated IRN details
  irn: { type: String },
  ackNo: { type: String },
  ackDt: { type: String },
  signedInvoice: { type: String },
  signedQRCode: { type: String },
  status: { type: String }, // e.g. "GENERATED", "CANCELLED"

  // Dispatch details
  DispDtls: {
    Nm:    String,
    Addr1: String,
    Addr2: String,
    Loc:   String,
    Pin:   Number,
    Stcd:  String,
  },
  // Shipping details
  ShipDtls: {
    Gstin: String,
    LglNm: String,
    TrdNm: String,
    Addr1: String,
    Addr2: String,
    Loc:   String,
    Pin:   Number,
    Stcd:  String,
  },
  // Payment details
  PayDtls: {
    Nm:      String,
    Accdet:  String,
    Mode:    String,
    Fininsbr:String,
    Payterm: String,
    Payinstr:String,
    Crtrn:   String,
    Dirdr:   String,
    Crday:   Number,
    Paidamt: Number,
    Paymtdue:Number,
  },
  // Reference details
  RefDtls: {
    InvRm:      String,
    DocPerdDtls: {
      InvStDt:  String,
      InvEndDt: String,
    },
    PrecDocDtls: [
      {
        InvNo:   String,
        InvDt:   String,
        OthRefNo:String,
      }
    ],
    ContrDtls: [
      {
        RecAdvRefr: String,
        RecAdvDt:   String,
        Tendrefr:   String,
        Contrrefr:  String,
        Extrefr:    String,
        Projrefr:   String,
        Porefr:     String,
        PoRefDt:    String,
      }
    ]
  },
  // Additional documents
  AddlDocDtls: [
    {
      Url:  String,
      Docs: String,
      Info: String,
    }
  ],
  // Export details
  ExpDtls: {
    ShipBNo:  String,
    ShipBDt:  String,
    Port:     String,
    RefClm:   String,
    ForCur:   String,
    CntCode:  String,
  },
  // E-Way Bill details
  EwbDtls: {
    Transid:      String,
    Transname:    String,
    Distance:     Number,
    Transdocno:   String,
    TransdocDt:   String,
    Vehno:        String,
    Vehtype:      String,
    TransMode:    String,
  },

  cancelled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
});

module.exports = mongoose.model("EInvoice", eInvoiceSchema);
