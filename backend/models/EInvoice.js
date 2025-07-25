// models/EInvoice.js

const mongoose = require("mongoose");

const eInvoiceSchema = new mongoose.Schema({
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quotation",
    required: true,
    unique: true
  },
  authToken: { type: String },
  tokenExpiry: { type: Date },
  sek: { type: String },
  clientId: { type: String },

  customerDetails: {
    gstin:     { type: String },
    legalName: { type: String },
    tradeName: { type: String },
    address1:  { type: String },
    address2:  { type: String },
    location:  { type: String },
    pincode:   { type: String },
    stateCode: { type: String },
    phone:     { type: String },
    email:     { type: String },
  },

  referenceJson: {
    Version: { type: String },
    TranDtls: {
      TaxSch:    { type: String },
      SupTyp:    { type: String },
      RegRev:    { type: String },
      EcmGstin:  { type: String },
      IgstOnIntra: { type: String }
    },
    DocDtls: {
      Typ: { type: String },
      No:  { type: String },
      Dt:  { type: String }
    },
    SellerDtls: {
      Gstin: { type: String },
      LglNm: { type: String },
      TrdNm: { type: String },
      Addr1: { type: String },
      Addr2: { type: String },
      Loc:   { type: String },
      Pin:   { type: Number },
      Stcd:  { type: String },
      Ph:    { type: String },
      Em:    { type: String }
    },
    BuyerDtls: {
      Gstin: { type: String },
      LglNm: { type: String },
      TrdNm: { type: String },
      Pos:   { type: String },
      Addr1: { type: String },
      Addr2: { type: String },
      Loc:   { type: String },
      Pin:   { type: Number },
      Stcd:  { type: String },
      Ph:    { type: String },
      Em:    { type: String }
    },
    DispDtls: {
      Nm:    { type: String },
      Addr1: { type: String },
      Addr2: { type: String },
      Loc:   { type: String },
      Pin:   { type: Number },
      Stcd:  { type: String }
    },
    ShipDtls: {
      Gstin: { type: String },
      LglNm: { type: String },
      TrdNm: { type: String },
      Addr1: { type: String },
      Addr2: { type: String },
      Loc:   { type: String },
      Pin:   { type: Number },
      Stcd:  { type: String }
    },
    ItemList: [
      {
        SlNo:               { type: String },
        IsServc:            { type: String },
        PrdDesc:            { type: String },
        HsnCd:              { type: String },
        Barcde:             { type: String },
        BchDtls: {
          Nm:    { type: String },
          ExpDt: { type: String },
          WrDt:  { type: String }
        },
        Qty:                { type: Number },
        FreeQty:            { type: Number },
        Unit:               { type: String },
        UnitPrice:          { type: Number },
        TotAmt:             { type: Number },
        Discount:           { type: Number },
        PreTaxVal:          { type: Number },
        AssAmt:             { type: Number },
        GstRt:              { type: Number },
        SgstAmt:            { type: Number },
        IgstAmt:            { type: Number },
        CgstAmt:            { type: Number },
        CesRt:              { type: Number },
        CesAmt:             { type: Number },
        CesNonAdvlAmt:      { type: Number },
        StateCesRt:         { type: Number },
        StateCesAmt:        { type: Number },
        StateCesNonAdvlAmt: { type: Number },
        OthChrg:            { type: Number },
        TotItemVal:         { type: Number },
        OrdLineRef:         { type: String },
        OrgCntry:           { type: String },
        PrdSlNo:            { type: String },
        AttribDtls: [
          {
            Nm:  { type: String },
            Val: { type: String }
          }
        ]
      }
    ],
    ValDtls: {
      AssVal:    { type: Number },
      CgstVal:   { type: Number },
      SgstVal:   { type: Number },
      IgstVal:   { type: Number },
      CesVal:    { type: Number },
      StCesVal:  { type: Number },
      Discount:  { type: Number },
      OthChrg:   { type: Number },
      RndOffAmt: { type: Number },
      TotInvVal: { type: Number },
      TotInvValFc: { type: Number }
    },
    PayDtls: {
      Nm:        { type: String },
      AccDet:    { type: String },
      Mode:      { type: String },
      FinInsBr:  { type: String },
      PayTerm:   { type: String },
      PayInstr:  { type: String },
      CrTrn:     { type: String },
      DirDr:     { type: String },
      CrDay:     { type: Number },
      PaidAmt:   { type: Number },
      PaymtDue:  { type: Number }
    },
    RefDtls: {
      InvRm: { type: String },
      DocPerdDtls: {
        InvStDt:  { type: String },
        InvEndDt: { type: String }
      },
      PrecDocDtls: [
        {
          InvNo:    { type: String },
          InvDt:    { type: String },
          OthRefNo: { type: String }
        }
      ],
      ContrDtls: [
        {
          RecAdvRefr: { type: String },
          RecAdvDt:   { type: String },
          TendRefr:   { type: String },
          ContrRefr:  { type: String },
          ExtRefr:    { type: String },
          ProjRefr:   { type: String },
          PoRefr:     { type: String },
          PoRefDt:    { type: String }
        }
      ]
    },
    AddlDocDtls: [
      {
        Url:  { type: String },
        Docs: { type: String },
        Info: { type: String }
      }
    ],
    ExpDtls: {
      ShipBNo:  { type: String },
      ShipBDt:  { type: String },
      Port:     { type: String },
      RefClm:   { type: String },
      ForCur:   { type: String },
      CntCode:  { type: String }
    }
  },

  irp:            { type: String },
  irn:            { type: String },
  ackNo:          { type: String },
  ackDt:          { type: String },
  signedInvoice:  { type: String },
  signedQRCode:   { type: String },
  status:         {
    type: String,
    enum: ["PENDING", "GENERATED", "CANCELLED"],
    default: "PENDING"
  },
  ewbNo:          { type: String },
  ewbDt:          { type: String },
  ewbValidTill:   { type: String },
  remarks:        { type: String },
  cancelled:      { type: Boolean, default: false },
  createdBy:      { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model("EInvoice", eInvoiceSchema);
