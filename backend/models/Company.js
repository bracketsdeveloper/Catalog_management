const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
});

const logSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'create', 'update', 'delete'
  field: { type: String }, // Which field was modified (for updates)
  oldValue: { type: mongoose.Schema.Types.Mixed }, // Previous value
  newValue: { type: mongoose.Schema.Types.Mixed }, // New value
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, unique: true },
  brandName: { type: String }, // New optional field
  GSTIN: { type: String }, // New GSTIN field
  companyEmail: { type: String },
  clients: { type: [clientSchema], default: [] },
  companyAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  logs: { type: [logSchema], default: [] }, // Audit logs
});

// Add middleware to handle logging
companySchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = new Date();
  } else {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Company", companySchema);