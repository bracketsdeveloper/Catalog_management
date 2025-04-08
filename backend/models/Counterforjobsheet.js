const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  id: { type: String, required: true },
  seq: { type: Number, default: 4999 }
});

module.exports = mongoose.model("JobsheetCounter", counterSchema);
