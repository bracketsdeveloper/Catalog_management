// models/PotentialClient.js
const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  action:       { type: String, required: true }, // create, update, delete
  field:        { type: String },
  oldValue:     { type: mongoose.Schema.Types.Mixed },
  newValue:     { type: mongoose.Schema.Types.Mixed },
  performedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  performedAt:  { type: Date, default: Date.now },
  ipAddress:    { type: String }
});

const contactSchema = new mongoose.Schema({
  clientName:   { type: String, required: true },
  designation:  { type: String },
  source:       { type: String },
  mobile:       { type: String },
  email:        { type: String },
  location:     { type: String },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});

const potentialClientSchema = new mongoose.Schema({
  companyName:  { type: String, required: true, unique: true },
  contacts:     [contactSchema],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt:    { type: Date, default: Date.now },
  logs:         [logSchema]
});

module.exports = mongoose.model("PotentialClient", potentialClientSchema);
