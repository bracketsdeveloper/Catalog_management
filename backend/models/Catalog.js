// backend/models/Catalog.js
const mongoose = require("mongoose");
const Counter = require("./Counter");

const productSubSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String },
  ProductDescription: { type: String },
  ProductBrand: { type: String },
  color: { type: String },
  size: { type: String },
  productCost: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  productGST: { type: Number, default: 0 },
  material: { type: String, default: "" },
  weight: { type: String, default: "" },
  brandingTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: "BrandingCharge" }],
});

const remarkSchema = new mongoose.Schema({
  sender: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const catalogSchema = new mongoose.Schema({
  catalogNumber: { type: Number, unique: true },
  opportunityNumber: { type: String, default: "" },
  catalogName: { type: String },
  salutation: { type: String, default: "Mr." },
  customerName: { type: String },
  customerEmail: { type: String },
  customerCompany: { type: String },
  customerAddress: { type: String },
  approveStatus: { type: Boolean, default: false },
  remarks: { type: [remarkSchema], default: [] },
  margin: { type: Number, default: 0 },
  gst: { type: Number, default: 18 },
  products: [productSubSchema],
  fieldsToDisplay: [String],
  priceRange: {
    from: Number,
    to: Number,
  },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

catalogSchema.pre("save", async function (next) {
  if (this.isNew && this.catalogNumber == null) {
    const counter = await Counter.findOneAndUpdate(
      { id: "catalogNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    this.catalogNumber = counter.seq;
  }
  next();
});

module.exports = mongoose.model("Catalog", catalogSchema);
