const mongoose = require("mongoose");
const Counter = require("./Counter"); // Adjust the path as needed

const quotationItemSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  product: { type: String, required: true }, // Display name
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },    // Original base rate
  productprice: { type: Number, required: true }, // Updated product price from catalog
  amount: { type: Number, required: true },
  productGST: { type: Number, required: true },
  total: { type: Number, required: true }
});

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
  createdAt: { type: Date, default: Date.now },
  terms: [
    {
      heading: { type: String, required: true },
      content: { type: String, required: true }
    }
  ]
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
