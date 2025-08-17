const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String },
  email: { type: String },
  contactNumber: { type: String, required: true },
});

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  field: { type: String },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  performedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, unique: true },
  brandName: { type: String },
  segment: { type: String },
  clients: { type: [clientSchema], default: [] },
  companyAddress: { type: String },
  pincode: { type: String, required: true },
  GSTIN: { type: String },
  vendorCode: { type: String },
  paymentTerms: { type: String },
  portalUpload: { type: String },
  remarks: { type: String }, // <-- NEW
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  logs: { type: [logSchema], default: [] },
});

companySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Company", companySchema);
