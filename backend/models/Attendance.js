const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    required: true, 
    index: true,
    trim: true 
  },
  date: { 
    type: Date, 
    required: true, 
    index: true 
  },
  
  // From Excel columns
  name: { type: String, trim: true },
  shift: { type: String, trim: true },
  
  // Time fields
  inTime: { type: String, trim: true },
  outTime: { type: String, trim: true },
  
  // Duration fields
  workDuration: { type: String, trim: true },
  overTime: { type: String, trim: true },
  totalDuration: { type: String, trim: true },
  
  // Status
  status: { 
    type: String, 
    trim: true,
    enum: [
      'Absent', 
      'WeeklyOff', 
      'Present', 
      'Absent (No OutPunch)', 
      '½Present', 
      'WeeklyOff Present',
      'Leave',
      'WFH',
      'Holiday'
    ],
    default: 'Present'
  },
  
  remarks: { type: String, trim: true, default: "" },
  
  // Calculated fields
  dayName: { type: String, trim: true },
  isWeekend: { type: Boolean, default: false },
  isHoliday: { type: Boolean, default: false },
  
  correctedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  correctionNote: { type: String, trim: true },
  
  hoursWorked: { type: Number, default: 0 },
  hoursOT: { type: Number, default: 0 },
  
  importedAt: { type: Date },
  importBatchId: { type: String, trim: true },
  
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ name: "text", employeeId: "text", remarks: "text" });

attendanceSchema.pre("save", function(next) {
  const date = new Date(this.date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  this.dayName = days[date.getUTCDay()];
  this.isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  
  if (this.workDuration && !isNaN(parseFloat(this.workDuration))) {
    this.hoursWorked = parseFloat(this.workDuration);
  } else if (this.totalDuration && !isNaN(parseFloat(this.totalDuration))) {
    this.hoursWorked = parseFloat(this.totalDuration);
  }
  
  if (this.overTime && !isNaN(parseFloat(this.overTime))) {
    this.hoursOT = parseFloat(this.overTime);
  }
  
  next();
});

attendanceSchema.statics.timeToMinutes = function(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  if (!isNaN(parseFloat(timeStr))) {
    const hours = parseFloat(timeStr);
    return Math.round(hours * 60);
  }
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }
  return null;
};

attendanceSchema.statics.minutesToTime = function(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

module.exports = mongoose.model("Attendance", attendanceSchema);