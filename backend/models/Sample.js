const mongoose = require("mongoose");
const Counter = require("./Counterforjobsheet");

const sampleSchema = new mongoose.Schema({
  sampleInDate:       { type: Date,   required: true },
  sampleReferenceCode: { type: String, unique: true },
  productId:          { type: String, required: true },
  productName:        { type: String },
  category:           { type: String },
  subCategory:        { type: String },
  productPicture:     { type: String },
  brandName:          { type: String },
  specs:              { type: String },
  color:              { type: String },
  fromVendorClient:   { type: String },
  sampleRate:         { type: Number },
  qty:                { type: Number },
  returnable:         { 
    type: String, 
    enum: ["Returnable", "Non Returnable", ""], 
    default: "" 
  },
  returnableDays:     { type: Number, default: 0 },
  opportunityNumber:  { type: String },
  remarks:            { type: String },

  // NEW: CRM Name
  crmName:            { type: String, default: "" },

  createdAt:          { type: Date,   default: Date.now },
});

sampleSchema.pre("save", async function(next) {
  if (!this.isNew) return next();
  try {
    let ctr = await Counter.findOne({ id: "sampleReferenceCode" });
    if (!ctr) {
      ctr = new Counter({ id: "sampleReferenceCode", seq: 0 });
      await ctr.save();
    } else {
      ctr.seq += 1;
      await ctr.save();
    }
    this.sampleReferenceCode = "SR" + String(ctr.seq).padStart(4, "0");
    next();
  } catch(err) {
    next(err);
  }
});

module.exports = mongoose.model("Sample", sampleSchema);
