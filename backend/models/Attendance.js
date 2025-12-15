const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    required: true, 
    index: true,
    trim: true,
    uppercase: true // Normalize to uppercase for consistency
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
    required: true // Make name required
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
      'Absent', 
      'WeeklyOff', 
      'Present', 
      'Absent (No OutPunch)', 
      '½Present', 
      'WeeklyOff Present',
      'Leave',
      'WFH',
      'Holiday',
      '' // Allow empty string
    ],
    default: 'Present'
  },
  
  remarks: { type: String, trim: true, default: "" },
  
  // Calculated fields
  dayName: { type: String, trim: true },
  isWeekend: { type: Boolean, default: false },
  isHoliday: { type: Boolean, default: false },
  
  // Correction tracking
  correctedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  correctionNote: { type: String, trim: true },
  correctedAt: { type: Date },
  
  // Hours tracking with better precision
  hoursWorked: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 24 // Prevent unrealistic values
  },
  hoursOT: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 12 // Prevent unrealistic OT
  },
  
  // Import tracking
  importedAt: { type: Date },
  importBatchId: { type: String, trim: true, index: true },
  
  // Data quality flags
  isManualEntry: { type: Boolean, default: false },
  hasIncompleteData: { type: Boolean, default: false },
  dataQualityIssues: [{ type: String }],
  
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
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date ? this.date.toISOString().split('T')[0] : '';
});

attendanceSchema.virtual('totalMinutes').get(function() {
  return Math.round(this.hoursWorked * 60);
});

attendanceSchema.virtual('isPresent').get(function() {
  return this.status && this.status.toLowerCase().includes('present');
});

attendanceSchema.virtual('isAbsent').get(function() {
  return this.status && this.status.toLowerCase().includes('absent');
});

// ─────────────────────────────────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize employee ID to handle variations (005, 05, 5, EMP005, etc.)
 */
attendanceSchema.statics.normalizeEmployeeId = function(employeeId) {
  if (!employeeId) return null;
  
  let normalized = String(employeeId).trim().toUpperCase();
  
  // Remove common prefixes like "EMP", "E", "EMPL"
  normalized = normalized.replace(/^(EMP|EMPL?|EMPLOYEE)[-_\s]*/i, '');
  
  // Extract numeric part if mixed alphanumeric
  const numericMatch = normalized.match(/\d+/);
  if (numericMatch) {
    const numericPart = numericMatch[0];
    const prefix = normalized.substring(0, normalized.indexOf(numericPart));
    
    // If there's a prefix, keep it; otherwise just return the number
    if (prefix) {
      return `${prefix}${numericPart}`;
    }
    return numericPart;
  }
  
  return normalized;
};

/**
 * Find employee ID with flexible matching
 */
attendanceSchema.statics.findNormalizedEmployeeId = async function(employeeId, Employee) {
  if (!employeeId || !Employee) return null;
  
  const searchId = String(employeeId).trim();
  
  // Try exact match first
  let employee = await Employee.findOne({ 
    "personal.employeeId": searchId 
  }, { "personal.employeeId": 1 }).lean();
  
  if (employee) {
    return employee.personal.employeeId;
  }
  
  // Normalize the input ID
  const normalizedInput = this.normalizeEmployeeId(searchId);
  
  // Get all employees and find matching normalized ID
  const allEmployees = await Employee.find(
    {}, 
    { "personal.employeeId": 1 }
  ).lean();
  
  for (const emp of allEmployees) {
    const dbId = emp.personal.employeeId;
    const normalizedDb = this.normalizeEmployeeId(dbId);
    
    // Compare normalized versions
    if (normalizedDb === normalizedInput) {
      return dbId; // Return the actual DB ID
    }
    
    // Also try numeric comparison
    const inputNum = parseInt(normalizedInput, 10);
    const dbNum = parseInt(normalizedDb, 10);
    
    if (!isNaN(inputNum) && !isNaN(dbNum) && inputNum === dbNum) {
      return dbId;
    }
  }
  
  return null;
};

/**
 * Convert time string to minutes
 */
attendanceSchema.statics.timeToMinutes = function(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const cleaned = String(timeStr).trim();
  
  // Handle decimal hours (e.g., "8.5")
  if (!isNaN(parseFloat(cleaned)) && !cleaned.includes(':')) {
    const hours = parseFloat(cleaned);
    if (hours >= 0 && hours <= 24) {
      return Math.round(hours * 60);
    }
  }
  
  // Handle HH:MM format
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

/**
 * Convert minutes to time string (HH:MM)
 */
attendanceSchema.statics.minutesToTime = function(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "";
  
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Parse duration string (handles both HH:MM and decimal formats)
 */
attendanceSchema.statics.parseDuration = function(durationStr) {
  if (!durationStr) return 0;
  
  const str = String(durationStr).trim();
  
  // Decimal hours
  if (!isNaN(parseFloat(str)) && !str.includes(':')) {
    const hours = parseFloat(str);
    return hours >= 0 && hours <= 24 ? hours : 0;
  }
  
  // HH:MM format
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours + (minutes / 60);
    }
  }
  
  return 0;
};

/**
 * Validate attendance data quality
 */
attendanceSchema.statics.validateAttendanceData = function(data) {
  const issues = [];
  
  // Check for incomplete data
  if (!data.inTime && !data.outTime && data.status && data.status.toLowerCase().includes('present')) {
    issues.push('Present status without in/out times');
  }
  
  if (data.inTime && !data.outTime && !data.status?.toLowerCase().includes('outpunch')) {
    issues.push('In time without out time');
  }
  
  // Check for unrealistic hours
  if (data.hoursWorked > 16) {
    issues.push('Unrealistic work hours (>16h)');
  }
  
  if (data.hoursOT > 8) {
    issues.push('Unrealistic overtime (>8h)');
  }
  
  // Check time sequence
  if (data.inTime && data.outTime) {
    const inMinutes = this.timeToMinutes(data.inTime);
    const outMinutes = this.timeToMinutes(data.outTime);
    
    if (inMinutes !== null && outMinutes !== null && outMinutes <= inMinutes) {
      issues.push('Out time before or equal to in time');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate work duration from in/out times
 */
attendanceSchema.methods.calculateWorkDuration = function() {
  if (!this.inTime || !this.outTime) return 0;
  
  const inMinutes = this.constructor.timeToMinutes(this.inTime);
  const outMinutes = this.constructor.timeToMinutes(this.outTime);
  
  if (inMinutes === null || outMinutes === null) return 0;
  
  let workMinutes = outMinutes - inMinutes;
  
  // Handle overnight shifts
  if (workMinutes < 0) {
    workMinutes += 24 * 60;
  }
  
  return workMinutes / 60; // Return hours
};

/**
 * Recalculate all derived fields
 */
attendanceSchema.methods.recalculate = function() {
  // Calculate day name and weekend status
  const date = new Date(this.date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  this.dayName = days[date.getUTCDay()];
  this.isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  
  // Parse and set hours worked
  if (this.workDuration) {
    this.hoursWorked = this.constructor.parseDuration(this.workDuration);
  } else if (this.totalDuration) {
    this.hoursWorked = this.constructor.parseDuration(this.totalDuration);
  } else if (this.inTime && this.outTime) {
    this.hoursWorked = this.calculateWorkDuration();
    this.workDuration = this.constructor.minutesToTime(this.hoursWorked * 60);
  }
  
  // Parse overtime
  if (this.overTime) {
    this.hoursOT = this.constructor.parseDuration(this.overTime);
  }
  
  // Validate and flag data quality issues
  const validation = this.constructor.validateAttendanceData(this);
  this.hasIncompleteData = !validation.isValid;
  this.dataQualityIssues = validation.issues;
  
  return this;
};

// ─────────────────────────────────────────────────────────────────────────────
// PRE-SAVE HOOK
// ─────────────────────────────────────────────────────────────────────────────
attendanceSchema.pre("save", function(next) {
  // Normalize employee ID
  if (this.isModified('employeeId')) {
    this.employeeId = this.employeeId.trim().toUpperCase();
  }
  
  // Store original if not set
  if (!this.originalEmployeeId && this.employeeId) {
    this.originalEmployeeId = this.employeeId;
  }
  
  // Recalculate derived fields
  this.recalculate();
  
  // Set correction timestamp if corrected
  if (this.correctedBy && !this.correctedAt) {
    this.correctedAt = new Date();
  }
  
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST-SAVE HOOK (for logging)
// ─────────────────────────────────────────────────────────────────────────────
attendanceSchema.post("save", function(doc) {
  if (doc.hasIncompleteData) {
    console.warn(`Attendance data quality issues for ${doc.employeeId} on ${doc.formattedDate}:`, doc.dataQualityIssues);
  }
});

module.exports = mongoose.model("Attendance", attendanceSchema);