const mongoose = require("mongoose");

const quotationItemSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  image: { type: String },
  product: { type: String, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  gst: { type: Number, required: true },
  total: { type: Number, required: true }
});

// Same remark schema can be re-used
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
    const count = await this.constructor.countDocuments();
    const newNumber = (count + 1).toString().padStart(4, "0");
    this.quotationNumber = newNumber;
  }
  next();
});

module.exports = mongoose.model("Quotation", quotationSchema);
