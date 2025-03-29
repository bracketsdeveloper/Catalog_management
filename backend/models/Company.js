const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
});

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, unique: true },
  companyEmail: { type: String },
  clients: { type: [clientSchema], default: [] },
  companyAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Company", companySchema);
