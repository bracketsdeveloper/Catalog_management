const mongoose = require("mongoose");
const Counter = require("./Counter");

const operationsSchema = new mongoose.Schema({
  ourCost: { type: String, default: "" },
  branding: { type: String, default: "" },
  delivery: { type: String, default: "" },
  markup: { type: String, default: "" },
  total: { type: String, default: "" },
  vendor: { type: String, default: "" },
  remarks: { type: String, default: "" },
  reference: { type: String, default: "" },
});

// NEW: Operations Breakdown Row schema (your table)
const operationsBreakdownRowSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },                    // a
  product: { type: String, default: "" },                    // b
  quantity: { type: Number, default: 0 },                    // c
  rate: { type: Number, default: 0 },                        // d = h+i+j+k
  amount: { type: Number, default: 0 },                      // e = c*d
  gst: { type: String, default: "" },                        // f (manual string, e.g., "18" or "18%")
  total: { type: Number, default: 0 },                       // g = e * f(%)  (see route calc for safety)
  ourCost: { type: Number, default: 0 },                     // h
  brandingCost: { type: Number, default: 0 },                // i
  deliveryCost: { type: Number, default: 0 },                // j
  markUpCost: { type: Number, default: 0 },                  // k
  finalTotal: { type: Number, default: 0 },                  // l = h+i+j+k
  vendor: { type: String, default: "" },                     // m
}, { _id: false });

const quotationItemSchema = new mongoose.Schema({
  slNo: { type: Number, default: 1 },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  product: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  productprice: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  productGST: { type: Number },
  total: { type: Number, default: 0 },
  baseCost: { type: Number, default: 0 },
  material: { type: String, default: "" },
  weight: { type: String, default: "" },
  brandingTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: "BrandingCharge" }],
  suggestedBreakdown: {
    baseCost: { type: Number, default: 0 },
    marginPct: { type: Number, default: 0 },
    marginAmount: { type: Number, default: 0 },
    logisticsCost: { type: Number, default: 0 },
    brandingCost: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },
  },
  imageIndex: { type: Number, default: 0 },
});

const remarkSchema = new mongoose.Schema({
  sender: { type: String, default: "" },
  message: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, unique: true },
  opportunityNumber: { type: String, default: "" },
  catalogName: { type: String, default: "" },
  fieldsToDisplay: { type: [String], default: [] },
  priceRange: {
    from: { type: Number, default: 0 },
    to: { type: Number, default: 0 },
  },
  salutation: { type: String, default: "Mr." },
  customerName: { type: String, default: "" },
  customerEmail: { type: String, default: "" },
  customerCompany: { type: String, default: "" },
  customerAddress: { type: String, default: "" },
  margin: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  items: [quotationItemSchema],
  totalAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  displayTotals: { type: Boolean, default: false },
  displayHSNCodes: { type: Boolean, default: true },
  approveStatus: { type: Boolean, default: false },
  remarks: { type: [remarkSchema], default: [] },
  terms: [
    {
      heading: { type: String, default: "" },
      content: { type: String, default: "" },
    },
  ],
  operations: [operationsSchema],

  // NEW: the table you asked for
  operationsBreakdown: { type: [operationsBreakdownRowSchema], default: [] },

  createdBy: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

quotationSchema.pre("save", async function (next) {
  if (this.isNew && !this.quotationNumber) {
    try {
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
