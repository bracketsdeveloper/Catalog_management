// models/Counter.js
const mongoose = require("mongoose");
const poCounterSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  seq: { type: Number, default: 0 },
});
module.exports = mongoose.model("PoCounter", poCounterSchema);
