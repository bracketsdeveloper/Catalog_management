const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true,
    trim: true,
    uppercase: true
  },

  // Store original employee ID from upload for reference
  originalEmployeeId: {
    type: String,
    trim: true
  },

  date: {
    type: Date,
    required: true,
    index: true
  },

  // From Excel columns
  name: {
    type: String,
    trim: true,
    required: true
  },
  shift: { type: String, trim: true },

  // Time fields
  inTime: { type: String, trim: true },
  outTime: { type: String, trim: true },

  // Duration fields
  workDuration: { type: String, trim: true },
  overTime: { type: String, trim: true },
  totalDuration: { type: String, trim: true },

  // Status with validation
  status: {
    type: String,
    trim: true,
    enum: [
      "Absent",
      "WeeklyOff",
      "Present",
      "Absent (No OutPunch)",
      "½Present",
      "WeeklyOff Present",
      "Leave",
      "WFH",
      "Holiday",
      "" // Allow empty string
    ],
    default: "Present"
  },

  remarks: { type: String, trim: true, default: "" },

  // ✅ NEW: Special Leave Type (Birth/Death/Marriage) — counts as Present + 9h
  specialLeaveType: {
    type: String,
    enum: ["birth", "death", "marriage", ""],
    default: ""
  },

  // Calculated fields
  dayName: { type: String, trim: true },
  isWeekend: { type: Boolean, default: false },
  isHoliday: { type: Boolean, default: false },

  // Late/Early tracking
  isLateArrival: { type: Boolean, default: false },
  isEarlyDeparture: { type: Boolean, default: false },
  lateByMinutes: { type: Number, default: 0 },
  earlyByMinutes: { type: Number, default: 0 },

  // Correction tracking
  correctedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  correctionNote: { type: String, trim: true },
  correctedAt: { type: Date },

  // Hours tracking
  hoursWorked: {
    type: Number,
    default: 0,
    min: 0,
    max: 24
  },
  hoursOT: {
    type: Number,
    default: 0,
    min: 0,
    max: 12
  },

  // Import tracking
  importedAt: { type: Date },
  importBatchId: { type: String, trim: true, index: true },

  // Data quality flags
  isManualEntry: { type: Boolean, default: false },
  hasIncompleteData: { type: Boolean, default: false },
  dataQualityIssues: [{ type: String }],

  // Leave/Holiday tracking
  leaveType: { type: String },
  leaveId: { type: mongoose.Schema.Types.ObjectId, ref: "Leave" },
  holidayName: { type: String },
  holidayType: { type: String, enum: ["PUBLIC", "RESTRICTED"] }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ name: "text", employeeId: "text", remarks: "text" });
attendanceSchema.index({ importBatchId: 1, date: 1 });
attendanceSchema.index({ status: 1, date: 1 });
attendanceSchema.index({ createdAt: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────────────────────────────────────
attendanceSchema.virtual("formattedDate").get(function () {
  return this.date ? this.date.toISOString().split("T")[0] : "";
});

attendanceSchema.virtual("totalMinutes").get(function () {
  return Math.round((this.hoursWorked || 0) * 60);
});

attendanceSchema.virtual("isPresent").get(function () {
  if (this.specialLeaveType) return true;
  return this.status && this.status.toLowerCase().includes("present");
});

attendanceSchema.virtual("isAbsent").get(function () {
  return this.status && this.status.toLowerCase().includes("absent");
});

attendanceSchema.virtual("totalHours").get(function () {
  return (this.hoursWorked || 0) + (this.hoursOT || 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────────────────────────────────

attendanceSchema.statics.normalizeEmployeeId = function (employeeId) {
  if (!employeeId) return null;

  let normalized = String(employeeId).trim().toUpperCase();
  normalized = normalized.replace(/^(EMP|EMPL?|EMPLOYEE)[-_\s]*/i, "");

  const numericMatch = normalized.match(/\d+/);
  if (numericMatch) {
    const numericPart = numericMatch[0];
    const prefix = normalized.substring(0, normalized.indexOf(numericPart));
    if (prefix) return `${prefix}${numericPart}`;
    return numericPart;
  }

  return normalized;
};

attendanceSchema.statics.timeToMinutes = function (timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;

  const cleaned = String(timeStr).trim();

  if (!isNaN(parseFloat(cleaned)) && !cleaned.includes(":")) {
    const hours = parseFloat(cleaned);
    if (hours >= 0 && hours <= 24) return Math.round(hours * 60);
  }

  const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  return null;
};

attendanceSchema.statics.minutesToTime = function (minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "";
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

attendanceSchema.statics.parseDuration = function (durationStr) {
  if (!durationStr) return 0;
  const str = String(durationStr).trim();

  if (!isNaN(parseFloat(str)) && !str.includes(":")) {
    const hours = parseFloat(str);
    return hours >= 0 && hours <= 24 ? hours : 0;
  }

  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (!isNaN(hours) && !isNaN(minutes)) return hours + (minutes / 60);
  }

  return 0;
};

attendanceSchema.statics.validateAttendanceData = function (data) {
  const issues = [];

  // ✅ if special leave, skip normal validations
  if (data.specialLeaveType) {
    return { isValid: true, issues: [] };
  }

  if (!data.inTime && !data.outTime && data.status && data.status.toLowerCase().includes("present")) {
    issues.push("Present status without in/out times");
  }

  if (data.inTime && !data.outTime && !data.status?.toLowerCase().includes("outpunch")) {
    issues.push("In time without out time");
  }

  if (data.hoursWorked > 16) issues.push("Unrealistic work hours (>16h)");
  if (data.hoursOT > 8) issues.push("Unrealistic overtime (>8h)");

  if (data.inTime && data.outTime) {
    const inMinutes = this.timeToMinutes(data.inTime);
    const outMinutes = this.timeToMinutes(data.outTime);
    if (inMinutes !== null && outMinutes !== null && outMinutes <= inMinutes) {
      issues.push("Out time before or equal to in time");
    }
  }

  return { isValid: issues.length === 0, issues };
};

// ─────────────────────────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────────────────────────

attendanceSchema.methods.calculateWorkHours = function () {
  if (!this.inTime || !this.outTime) return 0;

  const inMinutes = this.constructor.timeToMinutes(this.inTime);
  const outMinutes = this.constructor.timeToMinutes(this.outTime);

  if (inMinutes === null || outMinutes === null) return 0;

  let workMinutes = outMinutes - inMinutes;
  if (workMinutes < 0) workMinutes += 24 * 60; // overnight
  return workMinutes / 60;
};

attendanceSchema.methods.recalculate = function () {
  const date = new Date(this.date);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  this.dayName = days[date.getUTCDay()];
  this.isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;

  // ✅ SPECIAL LEAVE OVERRIDE: always present + 9h
  if (this.specialLeaveType) {
    this.status = "Present";
    this.inTime = this.inTime || "10:00";
    this.outTime = this.outTime || "19:00";
    this.hoursWorked = 9;
    this.hoursOT = 0;
    this.workDuration = "09:00";
    this.overTime = "";
    this.totalDuration = "09:00";
    this.isLateArrival = false;
    this.isEarlyDeparture = false;
    this.lateByMinutes = 0;
    this.earlyByMinutes = 0;

    // keep tag in remarks
    const tag = `SPECIAL_LEAVE:${this.specialLeaveType}`;
    const cleaned = String(this.remarks || "").replace(/SPECIAL_LEAVE:(birth|death|marriage)/gi, "").trim();
    this.remarks = cleaned ? `${cleaned} ${tag}` : tag;

    // validate skip
    this.hasIncompleteData = false;
    this.dataQualityIssues = [];
    return this;
  }

  // Normal calc
  if (this.inTime && this.outTime) {
    const workHours = this.calculateWorkHours();
    this.hoursWorked = Math.max(0, parseFloat(workHours.toFixed(2)));

    const workHoursFloor = Math.floor(this.hoursWorked);
    const workMinutesRemainder = Math.round((this.hoursWorked - workHoursFloor) * 60);
    this.workDuration = `${workHoursFloor.toString().padStart(2, "0")}:${workMinutesRemainder.toString().padStart(2, "0")}`;

    if (this.overTime) this.hoursOT = this.constructor.parseDuration(this.overTime);
    else this.hoursOT = 0;

    const totalHours = this.hoursWorked + this.hoursOT;
    const totalHoursFloor = Math.floor(totalHours);
    const totalMinutesRemainder = Math.round((totalHours - totalHoursFloor) * 60);
    this.totalDuration = `${totalHoursFloor.toString().padStart(2, "0")}:${totalMinutesRemainder.toString().padStart(2, "0")}`;
  } else if (this.workDuration) {
    this.hoursWorked = this.constructor.parseDuration(this.workDuration);

    const workHours = this.hoursWorked;
    const workHoursFloor = Math.floor(workHours);
    const workMinutesRemainder = Math.round((workHours - workHoursFloor) * 60);
    this.workDuration = `${workHoursFloor.toString().padStart(2, "0")}:${workMinutesRemainder.toString().padStart(2, "0")}`;

    if (this.overTime) this.hoursOT = this.constructor.parseDuration(this.overTime);

    const totalHours = this.hoursWorked + (this.hoursOT || 0);
    const totalHoursFloor = Math.floor(totalHours);
    const totalMinutesRemainder = Math.round((totalHours - totalHoursFloor) * 60);
    this.totalDuration = `${totalHoursFloor.toString().padStart(2, "0")}:${totalMinutesRemainder.toString().padStart(2, "0")}`;
  } else if (this.totalDuration) {
    this.hoursWorked = this.constructor.parseDuration(this.totalDuration);

    const totalHours = this.hoursWorked;
    const totalHoursFloor = Math.floor(totalHours);
    const totalMinutesRemainder = Math.round((totalHours - totalHoursFloor) * 60);
    this.totalDuration = `${totalHoursFloor.toString().padStart(2, "0")}:${totalMinutesRemainder.toString().padStart(2, "0")}`;
  }

  const validation = this.constructor.validateAttendanceData(this);
  this.hasIncompleteData = !validation.isValid;
  this.dataQualityIssues = validation.issues;

  return this;
};

// ─────────────────────────────────────────────────────────────────────────────
// PRE-SAVE HOOK
// ─────────────────────────────────────────────────────────────────────────────
attendanceSchema.pre("save", function (next) {
  if (this.isModified("employeeId")) {
    this.employeeId = this.employeeId.trim().toUpperCase();
  }

  if (!this.originalEmployeeId && this.employeeId) {
    this.originalEmployeeId = this.employeeId;
  }

  this.recalculate();

  if (this.correctedBy && !this.correctedAt) {
    this.correctedAt = new Date();
  }

  next();
});

attendanceSchema.post("save", function (doc) {
  if (doc.hasIncompleteData) {
    console.warn(
      `Attendance data quality issues for ${doc.employeeId} on ${doc.formattedDate}:`,
      doc.dataQualityIssues
    );
  }
});

module.exports = mongoose.model("Attendance", attendanceSchema);
