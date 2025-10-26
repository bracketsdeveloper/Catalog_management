const mongoose = require("mongoose");

const sampleOutSchema = new mongoose.Schema({
  sampleOutDate:      { type: Date,   required: true },
  clientCompanyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  clientCompanyName:  { type: String, required: true },
  clientName:         { type: String, required: true },
  contactNumber:      { type: String },
  sentById:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sentByName:         { type: String, required: true },
  sampleRefId:        { type: mongoose.Schema.Types.ObjectId, ref: "Sample", required: true },
  sampleReferenceCode:{ type: String, required: true }, 
  productCode:        { type: String },
  productPicture:     { type: String },
  productName:        { type: String },
  brand:              { type: String },
  qty:                { type: Number },
  color:              { type: String },
  sentThrough:        { type: String },
  sampleDCNumber:     { type: String },
  sampleOutStatus:    { 
    type: String, 
    enum: ["sent", "not sent", ""], 
    default: "" 
  },
  qtyReceivedBack:    { type: Number, default: 0 },
  receivedBack:       { type: Boolean, default: false },
  returned:           { type: Boolean, default: false },
  outSince:           { type: Number, default: 0 },
  sampleBackDate:     { type: Date },

  // NEW: manual input
  opportunityNumber:  { type: String, default: "" },

  createdAt:          { type: Date, default: Date.now },
  updatedAt:          { type: Date, default: Date.now },
});

sampleOutSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  const diffMs = (this.receivedBack && this.sampleBackDate)
    ? 0
    : (Date.now() - new Date(this.sampleOutDate).getTime());
  this.outSince = this.receivedBack ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
  next();
});

module.exports = mongoose.model("SampleOut", sampleOutSchema);
