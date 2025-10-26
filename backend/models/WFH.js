const mongoose = require("mongoose");

const wfhSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  reason: { type: String, default: "" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

wfhSchema.index({ employeeId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model("WFH", wfhSchema);
