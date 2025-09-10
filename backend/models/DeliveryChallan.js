const mongoose = require("mongoose");
const Counter = require("./Counter");

const deliveryChallanItemSchema = new mongoose.Schema({
  slNo: { type: Number, default: 1 },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  product: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  productprice: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  productGST: { type: Number, default: 18 },
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

const deliveryChallanSchema = new mongoose.Schema({
  dcNumber: { type: String, unique: true },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },
  quotationNumber: { type: String, default: "" },

  // Opportunity linkage
  opportunityNumber: { type: String, default: "" },
  opportunityOwner: { type: String, default: "" },

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
  gst: { type: Number, default: 18 },
  items: [deliveryChallanItemSchema],
  totalAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  displayTotals: { type: Boolean, default: false },
  displayHSNCodes: { type: Boolean, default: true },
  remarks: { type: [remarkSchema], default: [] },
  terms: [
    {
      heading: { type: String, default: "" },
      content: { type: String, default: "" },
    },
  ],
  poNumber: { type: String, default: "" },
  poDate: { type: Date, default: null },

  // Store Ref. JobSheet# here per your mapping requirement
  otherReferences: { type: String, default: "" },

  materialTerms: {
    type: [String],
    default: [
      "Material received in good condition and correct quantity.",
      "No physical damage or shortage noticed at the time of delivery.",
      "Accepted after preliminary inspection and verification with delivery documents.",
    ],
  },
  createdBy: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  dcDate: { type: Date, default: Date.now },
});

deliveryChallanSchema.pre("save", async function (next) {
  if (this.isNew && !this.dcNumber) {
    try {
      await Counter.findOneAndUpdate(
        { id: "dcNumber", seq: { $lt: 8000 } },
        { $set: { seq: 8000 } },
        { upsert: true }
      );
      const counter = await Counter.findOneAndUpdate(
        { id: "dcNumber" },
        { $inc: { seq: 1 } },
        { new: true }
      );
      this.dcNumber = counter.seq.toString().padStart(4, "0");
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("DeliveryChallan", deliveryChallanSchema);
