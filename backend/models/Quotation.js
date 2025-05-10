const mongoose = require("mongoose");
const Counter = require("./Counter");

const quotationItemSchema = new mongoose.Schema({
  slNo:           { type: Number, required: true },
  productId:      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  product:        { type: String, required: true },           // display name
  hsnCode:        { type: String },                          // optional HSN code
  rate:           { type: Number, required: true },           // original base rate
  productprice:   { type: Number, required: true },           // updated product price
  amount:         { type: Number, required: true },
  productGST:     { type: Number, required: true },
  total:          { type: Number, required: true },
  baseCost:       { type: Number, default: 0 },
  material:       { type: String, default: "" },
  weight:         { type: String, default: "" },
  brandingTypes:  [{ type: mongoose.Schema.Types.ObjectId, ref: "BrandingCharge" }],
  suggestedBreakdown: {
    baseCost:      { type: Number, default: 0 },
    marginPct:     { type: Number, default: 0 },
    marginAmount:  { type: Number, default: 0 },
    logisticsCost: { type: Number, default: 0 },
    brandingCost:  { type: Number, default: 0 },
    finalPrice:    { type: Number, default: 0 },
  },
  imageIndex:     { type: Number, default: 0 },
});

const remarkSchema = new mongoose.Schema({
  sender:    { type: String },
  message:   { type: String },
  timestamp: { type: Date, default: Date.now },
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, unique: true },

  // ─── all catalog‐level fields ───────────────────────
  opportunityNumber:{ type: String, default: "" },
  catalogName:      { type: String },
  fieldsToDisplay:  { type: [String], default: [] },
  priceRange:       {
    from: { type: Number, default: 0 },
    to:   { type: Number, default: 0 },
  },
  salutation:       { type: String, default: "Mr." },
  customerName:     { type: String, required: true },
  customerEmail:    { type: String, default: "" },
  customerCompany:  { type: String, default: "" },
  customerAddress:  { type: String, default: "" },
  margin:           { type: Number, default: 0 },
  gst:              { type: Number, default: 18 },

  // ─── quotation‐specific fields ──────────────────────
  items:            [quotationItemSchema],
  totalAmount:      { type: Number, default: 0 },
  grandTotal:       { type: Number, default: 0 },
  displayTotals:    { type: Boolean, default: false },
  displayHSNCodes:  { type: Boolean, default: true },
  approveStatus:    { type: Boolean, default: false },
  remarks:          { type: [remarkSchema], default: [] },
  terms:            [
                      {
                        heading: { type: String, required: true },
                        content: { type: String, required: true }
                      }
                    ],

  createdBy:        { type: String },
  createdAt:        { type: Date, default: Date.now },
});

// Auto‐generate quotationNumber
quotationSchema.pre("save", async function(next) {
  if (this.isNew && !this.quotationNumber) {
    try {
      // start at 9000 if not set
      await Counter.findOneAndUpdate(
        { id: "quotationNumber", seq: { $lt: 9000 } },
        { $set: { seq: 9000 } },
        { upsert: true }
      );
      const counter = await Counter.findOneAndUpdate(
        { id: "quotationNumber" },
        { $inc: { seq: 1 } },
        { new: true }
      );
      this.quotationNumber = counter.seq.toString().padStart(4, "0");
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Quotation", quotationSchema);
