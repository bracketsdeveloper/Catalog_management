const mongoose = require("mongoose");

// Each item on the quotation references a specific product
const quotationItemSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  product: { type: String, required: true }, // Name or short label for display
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },    // Derived from productCost
  amount: { type: Number, required: true },
  productGST: { type: Number, required: true },  // GST stored per product
  total: { type: Number, required: true }
});

// For remarks or chat-like notes
const remarkSchema = new mongoose.Schema({
  sender: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Quotation schema without a common (global) GST field.
// The GST is stored individually for each quotation item.
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
  // Removed global gst, cgst, sgst fields.
  items: [quotationItemSchema],
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  // New terms field - dynamic array of headings and content
  terms: [
    {
      heading: { type: String, required: true },
      content: { type: String, required: true }
    }
  ]
});

// Pre-save hook to auto-generate a unique quotation number for new documents
quotationSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    const newNumber = (count + 1).toString().padStart(4, "0");
    this.quotationNumber = newNumber;
  }
  next();
});

module.exports = mongoose.model("Quotation", quotationSchema);
