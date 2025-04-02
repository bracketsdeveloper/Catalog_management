const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'create', 'update', 'delete'
  field: { type: String },                  // which field was changed (for 'update')
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  performedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

module.exports = mongoose.model("Log", logSchema);
