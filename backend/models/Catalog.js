const mongoose = require("mongoose");
const Counter = require("./Counter"); // Adjust the path as needed

// A sub-schema to store product references + variation info
const productSubSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String }, // Add this line to store the product name
  color: { type: String },
  size: { type: String },
  productCost: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  productGST: { type: Number, default: 0 }
});

// A remark schema for chatting
const remarkSchema = new mongoose.Schema({
  sender: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const catalogSchema = new mongoose.Schema({
  catalogNumber: { type: Number, unique: true }, // New catalog number field
  catalogName: { type: String },
  customerName: { type: String },
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

// Pre-save hook to generate a sequential catalog number
catalogSchema.pre("save", async function (next) {
  if (this.isNew && this.catalogNumber == null) {
    try {
      // Find and update (or create) the counter document for catalog numbers
      const counter = await Counter.findOneAndUpdate(
        { id: "catalogNumber" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      // If the counter's sequence is less than 9000, adjust it to start from 9000
      if (counter.seq < 9000) {
        counter.seq = 9000;
        await counter.save();
      }
      this.catalogNumber = counter.seq;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Catalog", catalogSchema);
