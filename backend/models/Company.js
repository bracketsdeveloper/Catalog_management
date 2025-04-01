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
  performedAt: { type: Date, default: Date.now }, // <-- FIXED (Renamed from timestamp to performedAt)
  ipAddress: { type: String },
});

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, unique: true },
  brandName: { type: String },
  GSTIN: { type: String },
  companyEmail: { type: String },
  clients: { type: [clientSchema], default: [] },
  companyAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  logs: { type: [logSchema], default: [] },

  // For Soft Delete:
  deleted: { type: Boolean, default: false }, // <-- FIXED
  deletedAt: { type: Date },                 // <-- FIXED
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // <-- FIXED
});

// Add middleware to handle timestamps
companySchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = new Date();
  } else {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Company", companySchema);
