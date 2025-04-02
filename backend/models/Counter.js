// models/Counter.js

const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  id: String,
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model("Counter", counterSchema);