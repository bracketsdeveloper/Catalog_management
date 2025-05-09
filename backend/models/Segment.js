const mongoose = require("mongoose");

const priceQuerySchema = new mongoose.Schema({
  from: { type: Number, required: true }, // INR lower bound
  to: { type: Number, required: true }, // INR upper bound
  margin: { type: Number, required: true }, // percent
});

const quantityQuerySchema = new mongoose.Schema({
  fromQty: { type: Number, required: true }, // Quantity lower bound
  toQty: { type: Number, required: true }, // Quantity upper bound
  operation: {
    type: Number,
    required: true,
    min: -10,
    max: 10,
  }, // percent adjustment (-10 to +10)
});

const segmentSchema = new mongoose.Schema({
  segmentName: { type: String, required: true, unique: true },
  priceQueries: { type: [priceQuerySchema], default: [] },
  quantityQueries: { type: [quantityQuerySchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

segmentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Segment", segmentSchema);