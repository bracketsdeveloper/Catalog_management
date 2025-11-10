const mongoose = require("mongoose");

// Types: "earned" (auto accrual), "sick", "additional", "special"
const leaveSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  type: { type: String, enum: ["earned","sick","additional","special"], required: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true }, // auto calc (inclusive business days or calendar? we’ll use calendar)
  purpose: { type: String, default: "" },
  status: { type: String, enum: ["applied", "pending", "approved", "rejected", "cancelled"], default: "pending", index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Leave", leaveSchema);
