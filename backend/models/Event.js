const mongoose = require("mongoose");

// Log schema
const logSchema = new mongoose.Schema({
  action: { type: String },
  field: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  performedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

// One schedule entry
const scheduleSchema = new mongoose.Schema({
  scheduledOn: { type: Date },
  action: { type: String, enum: ["Call", "Mail", "Meet", "Msg", "Assign to"] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  discussion: { type: String },
  status: { type: String, enum: ["", "Done", "Not done"], default: "" },
  reschedule: { type: Date },
  remarks: { type: String },
});

// Main Event schema
const eventSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId }, // Generic ObjectId
  companyType: { type: String, enum: ["Client", "Potential Client", "Vendor"], required: true },
  companyName: { type: String },
  schedules: [scheduleSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  logs: [logSchema],
});

module.exports = mongoose.model("Event", eventSchema);