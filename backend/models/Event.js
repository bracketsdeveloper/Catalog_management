// models/Event.js
const mongoose = require("mongoose");

// Log schema
const logSchema = new mongoose.Schema({
  action:      { type: String },
  field:       { type: String },
  oldValue:    { type: mongoose.Schema.Types.Mixed },
  newValue:    { type: mongoose.Schema.Types.Mixed },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  performedAt: { type: Date, default: Date.now },
  ipAddress:   { type: String }
});

// One schedule entry; note the "" in the enum for status
const scheduleSchema = new mongoose.Schema({
  scheduledOn: { type: Date },
  action:      { type: String, enum: ["Call","Msg","Mail","Meet","Assign to CRM"] },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  discussion:  { type: Date },
  status:      { type: String, enum: ["","Done","Not done"], default: "" },
  reschedule:  { type: Date },
  remarks:     { type: String }
});

// Main Event schema
const eventSchema = new mongoose.Schema({
  potentialClient:     { type: mongoose.Schema.Types.ObjectId, ref: "PotentialClient" },
  potentialClientName: { type: String },
  schedules:           [ scheduleSchema ],
  createdBy:           { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt:           { type: Date, default: Date.now },
  logs:                [ logSchema ]
});

module.exports = mongoose.model("Event", eventSchema);
