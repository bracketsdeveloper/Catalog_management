// models/Attendance.js
const mongoose = require("mongoose");

// One row per employee per day (normalized import from your attendance software)
const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  dayName: { type: String }, // Mon/Tue/...
  login: { type: String },   // "09:32"
  logout: { type: String },  // "18:03"
  hours: { type: Number, default: 0 }, // decimal hours, e.g. 8.5
  isHoliday: { type: Boolean, default: false },
  isWeekend: { type: Boolean, default: false }, // Sundays etc.
  note: { type: String, default: "" }
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model("Attendance", attendanceSchema);
