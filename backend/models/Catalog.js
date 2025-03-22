const mongoose = require("mongoose");

const productSubSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }
});

// A remark schema for chatting
const remarkSchema = new mongoose.Schema({
  sender: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const catalogSchema = new mongoose.Schema({
  catalogName: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  customerCompany: { type: String },
  customerAddress: { type: String },
  approveStatus: { type: Boolean, default: false },
  remarks: { type: [remarkSchema], default: [] },
  margin: { type: Number, default: 0 },
  products: [productSubSchema],
  fieldsToDisplay: [String],
  priceRange: {
    from: Number,
    to: Number
  },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Catalog", catalogSchema);
