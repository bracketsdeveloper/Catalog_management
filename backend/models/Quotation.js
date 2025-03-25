const mongoose = require("mongoose");

// Each item on the quotation references a specific product
const quotationItemSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // <-- NEW
  product: { type: String, required: true }, // name or short label for display
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },    // derived from productCost
  amount: { type: Number, required: true },
  gst: { type: Number, required: true },
  total: { type: Number, required: true }
});

// For remarks or chat-like notes
const remarkSchema = new mongoose.Schema({
  sender: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, unique: true },
  catalogName: { type: String },
  customerName: { type: String, required: true },
  customerEmail: { type: String },
  customerCompany: { type: String },
  customerAddress: { type: String },
  approveStatus: { type: Boolean, default: false },
  remarks: { type: [remarkSchema], default: [] },
  margin: { type: Number },
  items: [quotationItemSchema],
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

quotationSchema.pre("save", async function (next) {
  if (this.isNew) {
    // auto-generate a simple incremental quotationNumber
    const count = await this.constructor.countDocuments();
    const newNumber = (count + 1).toString().padStart(4, "0");
    this.quotationNumber = newNumber;
  }
  next();
});

module.exports = mongoose.model("Quotation", quotationSchema);
