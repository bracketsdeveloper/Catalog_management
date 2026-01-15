const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate, requireAdmin } = require("../middleware/hrmsAuth");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const RestrictedHolidayRequest = require("../models/RestrictedHolidayRequest");

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "attendance_excel");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${timestamp}_${name}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls, .csv) are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TIME PARSING & CALCULATION HELPERS - UPDATED WITH FIXES
// ─────────────────────────────────────────────────────────────────────────────

function normalizeHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateString(dateString) {
  if (!dateString) return new Date();
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  return new Date(dateString);
}

/**
 * Parse time from various formats:
 * - Excel decimal (fraction of day): 0.420833 = 10:06
 * - 12-hour format: "09:00 AM", "6:30 PM"
 * - 24-hour format: "09:00", "18:30"
 * - Date object
 * 
 * Returns object { hours, minutes, totalMinutes, formatted }
 */
function parseTimeValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let hours = 0;
  let minutes = 0;

  // Handle Date objects
  if (value instanceof Date && !isNaN(value)) {
    hours = value.getHours();
    minutes = value.getMinutes();
  }
  // Handle numeric values (Excel stores times as fraction of day)
  else if (typeof value === 'number' || (!isNaN(parseFloat(value)) && !String(value).includes(':'))) {
    const num = parseFloat(value);
    
    if (num >= 0 && num < 1) {
      // Excel fraction of day: 0.420833 = 10:06
      const totalMinutesInDay = Math.round(num * 24 * 60);
      hours = Math.floor(totalMinutesInDay / 60);
      minutes = totalMinutesInDay % 60;
    } else if (num >= 1 && num <= 24) {
      // Decimal hours: 10.5 = 10:30
      hours = Math.floor(num);
      minutes = Math.round((num - hours) * 60);
    } else {
      return null;
    }
  }
  // Handle string time formats
  else if (typeof value === 'string') {
    const str = value.trim();
    
    // Check for 12-hour format: "09:00 AM", "9:30 PM"
    const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[4].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
    }
    // Check for 24-hour format: "09:00", "18:30"
    else {
      const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (match24) {
        hours = parseInt(match24[1], 10);
        minutes = parseInt(match24[2], 10);
      } else {
        return null;
      }
    }
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
  } else {
    return null;
  }

  const totalMinutes = hours * 60 + minutes;
  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return {
    hours,
    minutes,
    totalMinutes,
    formatted,
    decimalHours: hours + (minutes / 60)
  };
}

/**
 * Parse duration string (handles both HH:MM and decimal formats)
 * Returns decimal hours
 */
function parseDuration(durationStr) {
  if (!durationStr) return 0;

  const parsed = parseTimeValue(durationStr);
  if (parsed) {
    return parsed.decimalHours;
  }

  const str = String(durationStr).trim();
  const num = parseFloat(str);
  if (!isNaN(num) && num >= 0 && num <= 24) {
    return num;
  }

  return 0;
}

/**
 * Format decimal hours to HH:MM string
 */
function formatTimeFromDecimal(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
    return "";
  }
  
  const totalMinutes = Math.round(Math.max(0, decimalHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate work metrics based on employee's expected schedule - COMPLETELY FIXED VERSION
 */
function calculateWorkMetrics(inTime, outTime, expectedLoginTime, expectedLogoutTime) {
  const result = {
    hoursWorked: 0,
    regularHours: 0,
    overtimeHours: 0,
    isLateArrival: false,
    isEarlyDeparture: false,
    lateByMinutes: 0,
    earlyByMinutes: 0,
    workDuration: "",
    remarks: []
  };

  const inParsed = parseTimeValue(inTime);
  const outParsed = parseTimeValue(outTime);

  if (!inParsed || !outParsed) {
    return result;
  }

  // Calculate total work minutes - SIMPLIFIED AND CORRECT
  let workMinutes = outParsed.totalMinutes - inParsed.totalMinutes;
  
  // Handle overnight shifts (if out time is earlier than in time, it's next day)
  if (workMinutes < 0) {
    workMinutes += 24 * 60; // Add 24 hours in minutes
  }

  // Convert minutes to hours with 2 decimal precision
  result.hoursWorked = parseFloat((workMinutes / 60).toFixed(2));
  
  // Format work duration as HH:MM
  const hours = Math.floor(result.hoursWorked);
  const minutes = Math.round((result.hoursWorked - hours) * 60);
  result.workDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // Add work duration to remarks for debugging
  if (result.hoursWorked > 0) {
    result.remarks.push(`Worked: ${hours}h ${minutes}m (${inTime} to ${outTime})`);
  }

  // Parse expected schedule
  const expectedIn = parseTimeValue(expectedLoginTime);
  const expectedOut = parseTimeValue(expectedLogoutTime);

  if (expectedIn && expectedOut) {
    // Calculate expected work duration
    let expectedMinutes = expectedOut.totalMinutes - expectedIn.totalMinutes;
    if (expectedMinutes < 0) {
      expectedMinutes += 24 * 60;
    }
    const expectedHours = expectedMinutes / 60;

    // Check late arrival (grace period: 15 minutes)
    const gracePeriod = 15;
    if (inParsed.totalMinutes > expectedIn.totalMinutes + gracePeriod) {
      result.isLateArrival = true;
      result.lateByMinutes = inParsed.totalMinutes - expectedIn.totalMinutes;
      result.remarks.push(`Late by ${result.lateByMinutes} mins`);
    }

    // Check early departure (grace period: 15 minutes)
    if (outParsed.totalMinutes < expectedOut.totalMinutes - gracePeriod) {
      result.isEarlyDeparture = true;
      result.earlyByMinutes = expectedOut.totalMinutes - outParsed.totalMinutes;
      result.remarks.push(`Left early by ${result.earlyByMinutes} mins`);
    }

    // Calculate regular vs overtime hours
    if (result.hoursWorked <= expectedHours) {
      result.regularHours = result.hoursWorked;
      result.overtimeHours = 0;
    } else {
      result.regularHours = expectedHours;
      result.overtimeHours = parseFloat((result.hoursWorked - expectedHours).toFixed(2));
      
      // If there's overtime, add to remarks
      if (result.overtimeHours > 0) {
        const otHours = Math.floor(result.overtimeHours);
        const otMinutes = Math.round((result.overtimeHours - otHours) * 60);
        result.remarks.push(`OT: ${otHours}h ${otMinutes}m`);
      }
    }
  } else {
    // No expected schedule, assume 8-hour workday (with 1 hour lunch deduction)
    const standardHours = 8;
    const effectiveWorkHours = result.hoursWorked;
    
    if (effectiveWorkHours <= standardHours) {
      result.regularHours = effectiveWorkHours;
      result.overtimeHours = 0;
    } else {
      result.regularHours = standardHours;
      result.overtimeHours = parseFloat((effectiveWorkHours - standardHours).toFixed(2));
      
      // If there's overtime, add to remarks
      if (result.overtimeHours > 0) {
        const otHours = Math.floor(result.overtimeHours);
        const otMinutes = Math.round((result.overtimeHours - otHours) * 60);
        result.remarks.push(`OT: ${otHours}h ${otMinutes}m`);
      }
    }
  }

  return result;
}

/**
 * Calculate hours directly from in/out times - SIMPLE AND RELIABLE
 */
function calculateHoursFromTimes(inTime, outTime) {
  const inParsed = parseTimeValue(inTime);
  const outParsed = parseTimeValue(outTime);

  if (!inParsed || !outParsed) {
    return 0;
  }

  let workMinutes = outParsed.totalMinutes - inParsed.totalMinutes;
  
  // Handle overnight shifts
  if (workMinutes < 0) {
    workMinutes += 24 * 60;
  }

  const hours = parseFloat((workMinutes / 60).toFixed(2));
  return hours;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAY & LEAVE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a date is a PUBLIC holiday (applies to all employees)
 */
async function isPublicHoliday(date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  
  const holiday = await Holiday.findOne({
    type: "PUBLIC",
    date: { $gte: start, $lte: end }
  }).lean();
  
  return holiday;
}

/**
 * Check if a date is an approved RESTRICTED holiday for a specific employee
 */
async function isApprovedRestrictedHoliday(date, employeeId, userId) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  
  // First check if there's a restricted holiday on this date
  const holiday = await Holiday.findOne({
    type: "RESTRICTED",
    date: { $gte: start, $lte: end }
  }).lean();
  
  if (!holiday) return null;
  
  // Then check if this employee has an approved request for it
  const request = await RestrictedHolidayRequest.findOne({
    holidayId: holiday._id,
    $or: [
      { employeeId: employeeId },
      { userId: userId }
    ],
    status: "approved"
  }).lean();
  
  if (request) {
    return { ...holiday, requestApproved: true };
  }
  
  return null;
}

/**
 * Check if employee has approved leave for a specific date
 */
async function getApprovedLeaveForDate(employeeId, date) {
  const checkDate = new Date(date);
  checkDate.setUTCHours(0, 0, 0, 0);
  
  const leave = await Leave.findOne({
    employeeId: employeeId,
    status: "approved",
    startDate: { $lte: checkDate },
    endDate: { $gte: checkDate }
  }).lean();
  
  return leave;
}

/**
 * Get all approved leaves for an employee in a date range
 */
async function getApprovedLeavesInRange(employeeId, startDate, endDate) {
  return await Leave.find({
    employeeId: employeeId,
    status: "approved",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  }).lean();
}

/**
 * Get all approved restricted holiday requests for an employee in a date range
 */
async function getApprovedRHRequestsInRange(employeeId, userId, startDate, endDate) {
  return await RestrictedHolidayRequest.find({
    $or: [
      { employeeId: employeeId },
      { userId: userId }
    ],
    status: "approved",
    holidayDate: { $gte: startDate, $lte: endDate }
  }).lean();
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE LOOKUP HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function findEmployeeWithFlexibleId(employeeIdFromExcel) {
  if (!employeeIdFromExcel) return null;
  
  const id = String(employeeIdFromExcel).trim();
  
  // Try exact match first
  let employee = await Employee.findOne({ 
    "personal.employeeId": id 
  }, { "personal.name": 1, "personal.employeeId": 1, "schedule": 1, "mappedUser": 1 }).lean();
  
  if (employee) {
    return { employee, matchedId: id };
  }
  
  // Try cleaning leading zeros
  const cleanId = id.replace(/^0+/, '');
  if (cleanId !== id) {
    employee = await Employee.findOne({ 
      "personal.employeeId": cleanId 
    }, { "personal.name": 1, "personal.employeeId": 1, "schedule": 1, "mappedUser": 1 }).lean();
    
    if (employee) {
      return { employee, matchedId: cleanId };
    }
  }
  
  // Try adding leading zeros (common patterns)
  const numericId = parseInt(id, 10);
  if (!isNaN(numericId)) {
    const paddedIds = [
      numericId.toString().padStart(3, '0'),
      numericId.toString().padStart(4, '0'),
      numericId.toString().padStart(5, '0'),
      numericId.toString().padStart(6, '0')
    ];
    
    for (const paddedId of paddedIds) {
      employee = await Employee.findOne({ 
        "personal.employeeId": paddedId 
      }, { "personal.name": 1, "personal.employeeId": 1, "schedule": 1, "mappedUser": 1 }).lean();
      
      if (employee) {
        return { employee, matchedId: paddedId };
      }
    }
  }
  
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD ENDPOINT - UPDATED WITH FIXED TIME CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

router.post("/upload", authenticate, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.body;
    const filePath = req.file?.path;
    
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded" 
      });
    }
    
    const attendanceDate = parseDateString(date);
    
    if (isNaN(attendanceDate.getTime())) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid date format" 
      });
    }
    
    // Read Excel
    const workbook = XLSX.readFile(filePath, { 
      cellDates: false,
      raw: true
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: true });
    
    if (!rows || rows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        message: "No data found" 
      });
    }
    
    const headers = Object.keys(rows[0] || {});
    const normalizedHeaders = headers.reduce((acc, header) => {
      acc[normalizeHeader(header)] = header;
      return acc;
    }, {});
    
    const requiredColumns = ['ecode', 'e code', 'employee code', 'emp code', 'employee id', 'emp id'];
    const employeeIdHeader = requiredColumns.find(col => normalizedHeaders[col]);
    
    if (!employeeIdHeader) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        message: "Employee ID column not found" 
      });
    }
    
    const importBatchId = `batch_${Date.now()}`;
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
      warnings: []
    };
    
    const bulkOps = [];
    
    // Check for PUBLIC holiday (applies to all)
    const publicHoliday = await isPublicHoliday(attendanceDate);
    
    const employeeIdMap = {};
    
    for (let i = 0; i < rows.length; i++) {
      results.total++;
      const row = rows[i];
      const originalRowNum = i + 2;
      
      try {
        const employeeIdRaw = row[normalizedHeaders[employeeIdHeader]];
        if (!employeeIdRaw) {
          results.warnings.push(`Row ${originalRowNum}: No employee ID`);
          continue;
        }
        
        const employeeIdFromExcel = String(employeeIdRaw).trim();
        
        let employeeData = employeeIdMap[employeeIdFromExcel];
        
        if (!employeeData) {
          employeeData = await findEmployeeWithFlexibleId(employeeIdFromExcel);
          
          if (employeeData) {
            employeeIdMap[employeeIdFromExcel] = employeeData;
          } else {
            results.warnings.push(`Row ${originalRowNum}: Employee not found for ID "${employeeIdFromExcel}"`);
            continue;
          }
        }
        
        const { employee, matchedId } = employeeData;
        
        const attendanceData = {
          employeeId: matchedId,
          date: attendanceDate,
          name: employee.personal.name,
          importedAt: new Date(),
          importBatchId
        };
        
        // Parse columns
        const columnMappings = {
          'shift': ['shift'],
          'intime': ['intime', 'in time', 'in', 'intime0000', 'punchin', 'punch in'],
          'outtime': ['outtime', 'out time', 'out', 'outtime0000', 'punchout', 'punch out'],
          'workdur': ['work dur', 'workdur', 'work dur0000', 'working hours', 'wh'],
          'ot': ['ot', 'overtime', 'ot0000', 'overtime hours'],
          'totdur': ['tot dur', 'total dur', 'tot dur0000', 'tot dur842', 'total hours', 'th'],
          'status': ['status', 'attendance status', 'attstatus'],
          'remarks': ['remarks', 'note', 'comments']
        };
        
        for (const [field, aliases] of Object.entries(columnMappings)) {
          for (const alias of aliases) {
            if (normalizedHeaders[alias] && row[normalizedHeaders[alias]] !== undefined) {
              const value = row[normalizedHeaders[alias]];
              if (value !== "" && value !== null) {
                switch (field) {
                  case 'intime': {
                    const parsed = parseTimeValue(value);
                    attendanceData.inTime = parsed ? parsed.formatted : String(value).trim();
                    break;
                  }
                  case 'outtime': {
                    const parsed = parseTimeValue(value);
                    attendanceData.outTime = parsed ? parsed.formatted : String(value).trim();
                    break;
                  }
                  case 'workdur': {
                    const parsed = parseTimeValue(value);
                    if (parsed) {
                      attendanceData.workDuration = parsed.formatted;
                      attendanceData.hoursWorked = parsed.decimalHours;
                    } else {
                      attendanceData.workDuration = String(value);
                      attendanceData.hoursWorked = parseDuration(value);
                    }
                    break;
                  }
                  case 'ot': {
                    const parsed = parseTimeValue(value);
                    if (parsed) {
                      attendanceData.overTime = parsed.formatted;
                      attendanceData.hoursOT = parsed.decimalHours;
                    } else {
                      attendanceData.overTime = String(value);
                      attendanceData.hoursOT = parseDuration(value);
                    }
                    break;
                  }
                  case 'totdur': {
                    const parsed = parseTimeValue(value);
                    if (parsed) {
                      attendanceData.totalDuration = parsed.formatted;
                      if (!attendanceData.hoursWorked) {
                        attendanceData.hoursWorked = parsed.decimalHours;
                      }
                    } else {
                      attendanceData.totalDuration = String(value);
                      if (!attendanceData.hoursWorked) {
                        attendanceData.hoursWorked = parseDuration(value);
                      }
                    }
                    break;
                  }
                  case 'status':
                    attendanceData.status = String(value).trim();
                    break;
                  default:
                    attendanceData[field] = String(value).trim();
                }
                break;
              }
            }
          }
        }
        
        // Calculate work metrics based on employee's schedule - USING FIXED FUNCTION
        if (attendanceData.inTime && attendanceData.outTime) {
          const metrics = calculateWorkMetrics(
            attendanceData.inTime,
            attendanceData.outTime,
            employee.schedule?.expectedLoginTime,
            employee.schedule?.expectedLogoutTime
          );
          
          // FIXED: Ensure hours are calculated correctly
          attendanceData.hoursWorked = parseFloat(metrics.hoursWorked.toFixed(2));
          attendanceData.hoursOT = parseFloat(metrics.overtimeHours.toFixed(2));
          attendanceData.workDuration = metrics.workDuration;
          attendanceData.isLateArrival = metrics.isLateArrival;
          attendanceData.isEarlyDeparture = metrics.isEarlyDeparture;
          attendanceData.lateByMinutes = metrics.lateByMinutes;
          attendanceData.earlyByMinutes = metrics.earlyByMinutes;
          
          // Calculate total duration properly
          const totalHours = attendanceData.hoursWorked + attendanceData.hoursOT;
          const totalHoursFloor = Math.floor(totalHours);
          const totalMinutesRemainder = Math.round((totalHours - totalHoursFloor) * 60);
          attendanceData.totalDuration = `${totalHoursFloor.toString().padStart(2, '0')}:${totalMinutesRemainder.toString().padStart(2, '0')}`;
          
          if (metrics.remarks.length > 0) {
            attendanceData.remarks = attendanceData.remarks 
              ? `${attendanceData.remarks}; ${metrics.remarks.join('; ')}`
              : metrics.remarks.join('; ');
          }
        } else if (attendanceData.workDuration && !attendanceData.hoursWorked) {
          // If we have workDuration but no hours calculated
          attendanceData.hoursWorked = parseDuration(attendanceData.workDuration);
          
          if (attendanceData.overTime) {
            attendanceData.hoursOT = parseDuration(attendanceData.overTime);
          }
          
          // Calculate total
          const totalHours = attendanceData.hoursWorked + attendanceData.hoursOT;
          const totalHoursFloor = Math.floor(totalHours);
          const totalMinutesRemainder = Math.round((totalHours - totalHoursFloor) * 60);
          attendanceData.totalDuration = `${totalHoursFloor.toString().padStart(2, '0')}:${totalMinutesRemainder.toString().padStart(2, '0')}`;
        }
        
        // Check for approved leave (override Absent status)
        const approvedLeave = await getApprovedLeaveForDate(matchedId, attendanceDate);
        if (approvedLeave) {
          attendanceData.status = 'Leave';
          attendanceData.leaveType = approvedLeave.type;
          attendanceData.leaveId = approvedLeave._id;
          attendanceData.remarks = attendanceData.remarks 
            ? `${attendanceData.remarks}; Leave: ${approvedLeave.type}` 
            : `Leave: ${approvedLeave.type}`;
        }
        
        // Handle holidays
        if (publicHoliday) {
          attendanceData.isHoliday = true;
          attendanceData.holidayName = publicHoliday.name;
          attendanceData.holidayType = 'PUBLIC';
          if (!approvedLeave) {
            attendanceData.status = 'Holiday';
          }
        } else {
          // Check for approved restricted holiday for this specific employee
          const restrictedHoliday = await isApprovedRestrictedHoliday(
            attendanceDate, 
            matchedId, 
            employee.mappedUser
          );
          
          if (restrictedHoliday) {
            attendanceData.isHoliday = true;
            attendanceData.holidayName = restrictedHoliday.name;
            attendanceData.holidayType = 'RESTRICTED';
            if (!approvedLeave) {
              attendanceData.status = 'Restricted Holiday';
            }
          }
        }
        
        // Default status if not set
        if (!attendanceData.status) {
          if (attendanceData.inTime && attendanceData.outTime) {
            attendanceData.status = 'Present';
          } else if (attendanceData.inTime && !attendanceData.outTime) {
            attendanceData.status = 'Absent (No OutPunch)';
          } else {
            attendanceData.status = 'Absent';
          }
        }
        
        // Set weekend flags
        const dayOfWeek = attendanceDate.getUTCDay();
        attendanceData.isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        attendanceData.dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        
        bulkOps.push({
          updateOne: {
            filter: { 
              employeeId: attendanceData.employeeId,
              date: attendanceDate
            },
            update: { $set: attendanceData },
            upsert: true
          }
        });
        
        results.success++;
        
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${originalRowNum}: ${error.message}`);
      }
    }
    
    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps, { ordered: false });
    }
    
    fs.unlinkSync(filePath);
    
    const idMappingWarnings = Object.entries(employeeIdMap)
      .filter(([excelId, data]) => excelId !== data.matchedId)
      .map(([excelId, data]) => `Excel ID "${excelId}" mapped to DB ID "${data.matchedId}"`);
    
    if (idMappingWarnings.length > 0) {
      results.warnings.push(...idMappingWarnings);
    }
    
    res.json({
      success: true,
      message: `Attendance imported for ${date}`,
      results,
      summary: {
        date: attendanceDate,
        displayDate: date,
        totalRecords: results.total,
        imported: results.success,
        failed: results.failed,
        idMappings: idMappingWarnings.length,
        importBatchId,
        publicHoliday: publicHoliday ? publicHoliday.name : null
      }
    });
    
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      success: false, 
      message: "Error processing file", 
      error: error.message 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET EMPLOYEE ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

router.get("/employee/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let query = { employeeId };
    
    if (startDate && endDate) {
      const start = parseDateString(startDate);
      const end = parseDateString(endDate);
      end.setUTCHours(23, 59, 59, 999);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        query.date = { $gte: start, $lte: end };
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Attendance.countDocuments(query)
    ]);
    
    const employee = await Employee.findOne(
      { "personal.employeeId": employeeId },
      { "personal.name": 1, "org.role": 1, "org.department": 1, "schedule": 1 }
    ).lean();
    
    let totalDays = attendance.length;
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let totalHours = 0;
    let totalOT = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    
    attendance.forEach(record => {
      const status = record.status ? record.status.toLowerCase() : '';
      
      if (status.includes('present')) {
        presentDays++;
        if (record.isLateArrival) lateArrivals++;
        if (record.isEarlyDeparture) earlyDepartures++;
      } else if (status.includes('absent')) {
        absentDays++;
      } else if (status.includes('leave')) {
        leaveDays++;
      }
      
      totalHours += record.hoursWorked || 0;
      totalOT += record.hoursOT || 0;
    });
    
    res.json({
      success: true,
      employee: employee ? {
        name: employee.personal.name,
        role: employee.org?.role,
        department: employee.org?.department,
        schedule: employee.schedule
      } : null,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        leaveDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalOT: parseFloat(totalOT.toFixed(2)),
        lateArrivals,
        earlyDepartures,
        attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0
      },
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching attendance", 
      error: error.message 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE CALENDAR WITH LEAVES & HOLIDAYS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/employee/:employeeId/calendar", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    const startDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
    
    // Get employee details
    const employee = await Employee.findOne(
      { "personal.employeeId": employeeId },
      {
        "personal.name": 1,
        "personal.employeeId": 1,
        "org.role": 1,
        "org.department": 1,
        "personal.dateOfJoining": 1,
        "schedule": 1,
        "mappedUser": 1
      }
    ).lean();
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: "Employee not found" 
      });
    }
    
    // Get attendance records
    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    
    // Get PUBLIC holidays in this month
    const publicHolidays = await Holiday.find({
      type: "PUBLIC",
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    
    // Get RESTRICTED holidays in this month
    const restrictedHolidays = await Holiday.find({
      type: "RESTRICTED",
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    
    // Get approved RH requests for this employee
    const approvedRHRequests = await getApprovedRHRequestsInRange(
      employeeId, 
      employee.mappedUser, 
      startDate, 
      endDate
    );
    const approvedRHIds = new Set(approvedRHRequests.map(r => r.holidayId.toString()));
    
    // Get approved leaves for this employee
    const approvedLeaves = await getApprovedLeavesInRange(employeeId, startDate, endDate);
    
    // Create maps for quick lookup
    const publicHolidayMap = {};
    publicHolidays.forEach(h => {
      const dateStr = new Date(h.date).toISOString().split('T')[0];
      publicHolidayMap[dateStr] = h;
    });
    
    const restrictedHolidayMap = {};
    restrictedHolidays.forEach(h => {
      const dateStr = new Date(h.date).toISOString().split('T')[0];
      // Only include if employee has approved request
      if (approvedRHIds.has(h._id.toString())) {
        restrictedHolidayMap[dateStr] = h;
      }
    });
    
    // Create leave date map
    const leaveDateMap = {};
    approvedLeaves.forEach(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        leaveDateMap[dateStr] = leave;
      }
    });
    
    // Build calendar data
    const calendarData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Find attendance record
      const attendanceRecord = attendance.find(record => 
        new Date(record.date).toISOString().split('T')[0] === dateStr
      );
      
      // Check holidays and leaves
      const publicHoliday = publicHolidayMap[dateStr];
      const restrictedHoliday = restrictedHolidayMap[dateStr];
      const leave = leaveDateMap[dateStr];
      
      let status = 'Not Marked';
      let statusClass = 'bg-gray-100 text-gray-800';
      let holidayInfo = null;
      let leaveInfo = null;
      
      // Priority: Leave > Holiday > Attendance > Weekend > Not Marked
      if (leave) {
        status = `Leave (${leave.type})`;
        statusClass = 'bg-blue-100 text-blue-800';
        leaveInfo = {
          type: leave.type,
          purpose: leave.purpose,
          days: leave.days
        };
      } else if (publicHoliday) {
        status = 'Holiday';
        statusClass = 'bg-indigo-100 text-indigo-800';
        holidayInfo = {
          name: publicHoliday.name,
          type: 'PUBLIC'
        };
      } else if (restrictedHoliday) {
        status = 'Restricted Holiday';
        statusClass = 'bg-purple-100 text-purple-800';
        holidayInfo = {
          name: restrictedHoliday.name,
          type: 'RESTRICTED'
        };
      } else if (attendanceRecord) {
        status = attendanceRecord.status || 'Present';
        const statusLower = status.toLowerCase();
        
        // Override "Absent" if there's actually a leave (double-check)
        if (statusLower.includes('absent') && leave) {
          status = `Leave (${leave.type})`;
          statusClass = 'bg-blue-100 text-blue-800';
        } else if (statusLower.includes('present')) {
          statusClass = 'bg-green-100 text-green-800';
        } else if (statusLower.includes('absent')) {
          statusClass = 'bg-red-100 text-red-800';
        } else if (statusLower.includes('leave')) {
          statusClass = 'bg-blue-100 text-blue-800';
        } else if (statusLower.includes('wfh')) {
          statusClass = 'bg-purple-100 text-purple-800';
        } else if (statusLower.includes('weeklyoff')) {
          statusClass = 'bg-yellow-100 text-yellow-800';
        } else if (statusLower.includes('holiday')) {
          statusClass = 'bg-indigo-100 text-indigo-800';
        }
      } else if (isWeekend) {
        status = 'Weekend';
        statusClass = 'bg-gray-200 text-gray-600';
      }
      
      calendarData.push({
        date: dateStr,
        day: currentDate.getUTCDate(),
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        isWeekend,
        isHoliday: !!(publicHoliday || restrictedHoliday),
        holidayInfo,
        leaveInfo,
        attendance: attendanceRecord ? {
          inTime: attendanceRecord.inTime,
          outTime: attendanceRecord.outTime,
          workHours: attendanceRecord.hoursWorked,
          otHours: attendanceRecord.hoursOT,
          remarks: attendanceRecord.remarks,
          status: attendanceRecord.status,
          isLateArrival: attendanceRecord.isLateArrival,
          isEarlyDeparture: attendanceRecord.isEarlyDeparture,
          lateByMinutes: attendanceRecord.lateByMinutes,
          earlyByMinutes: attendanceRecord.earlyByMinutes
        } : null,
        status,
        statusClass
      });
      
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    // Calculate summary
    let summary = {
      totalDays: calendarData.length,
      workingDays: calendarData.filter(d => !d.isWeekend && !d.isHoliday && !d.leaveInfo).length,
      presentDays: 0,
      absentDays: 0,
      leaveDays: approvedLeaves.reduce((sum, l) => sum + l.days, 0),
      wfhDays: 0,
      holidayDays: calendarData.filter(d => d.isHoliday).length,
      totalHours: 0,
      totalOT: 0,
      lateArrivals: 0,
      earlyDepartures: 0
    };
    
    attendance.forEach(record => {
      const status = record.status ? record.status.toLowerCase() : '';
      if (status.includes('present')) {
        summary.presentDays++;
        if (record.isLateArrival) summary.lateArrivals++;
        if (record.isEarlyDeparture) summary.earlyDepartures++;
      } else if (status.includes('absent')) {
        summary.absentDays++;
      } else if (status.includes('wfh')) {
        summary.wfhDays++;
      }
      
      summary.totalHours += record.hoursWorked || 0;
      summary.totalOT += record.hoursOT || 0;
    });
    
    summary.attendanceRate = summary.workingDays > 0 
      ? ((summary.presentDays / summary.workingDays) * 100).toFixed(2)
      : 0;
    
    res.json({
      success: true,
      employee: {
        name: employee.personal.name,
        employeeId: employee.personal.employeeId,
        role: employee.org?.role,
        department: employee.org?.department,
        dateOfJoining: employee.personal.dateOfJoining,
        schedule: employee.schedule
      },
      month: currentMonth + 1,
      year: currentYear,
      summary,
      calendarData
    });
    
  } catch (error) {
    console.error("Calendar error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching calendar data", 
      error: error.message 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

router.get("/export", authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: "startDate and endDate are required" 
      });
    }
    
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    end.setUTCHours(23, 59, 59, 999);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid date format" 
      });
    }
    
    let query = { date: { $gte: start, $lte: end } };
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    const attendance = await Attendance.find(query)
      .sort({ date: 1, employeeId: 1 })
      .lean();
    
    if (attendance.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No attendance records found" 
      });
    }
    
    const excelData = attendance.map((record, index) => ({
      "SNo": index + 1,
      "E. Code": record.employeeId,
      "Name": record.name,
      "Date": new Date(record.date).toISOString().split('T')[0],
      "Day": record.dayName,
      "Shift": record.shift || "",
      "InTime": record.inTime || "",
      "OutTime": record.outTime || "",
      "Work Dur.": record.workDuration || "",
      "OT": record.overTime || "",
      "Tot. Dur.": record.totalDuration || "",
      "Status": record.status || "",
      "Remarks": record.remarks || "",
      "Hours Worked": record.hoursWorked ? record.hoursWorked.toFixed(2) : 0,
      "OT Hours": record.hoursOT ? record.hoursOT.toFixed(2) : 0,
      "Late Arrival": record.isLateArrival ? "Yes" : "No",
      "Early Departure": record.isEarlyDeparture ? "Yes" : "No",
      "Holiday": record.isHoliday ? (record.holidayName || "Yes") : "No"
    }));
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    
    const filename = `Attendance_${startDate}_to_${endDate}${employeeId ? `_${employeeId}` : ''}.xlsx`;
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error exporting", 
      error: error.message 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/summary", authenticate, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? parseDateString(date) : parseDateString(new Date().toISOString().split('T')[0]);
    
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    
    const attendance = await Attendance.find({
      date: { $gte: targetDate, $lt: nextDay }
    }).lean();
    
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    
    // Check if it's a public holiday
    const publicHoliday = await isPublicHoliday(targetDate);
    
    const summary = {
      date: new Date(targetDate).toISOString().split('T')[0],
      totalEmployees,
      present: 0,
      absent: 0,
      leave: 0,
      wfh: 0,
      weeklyOff: 0,
      holiday: 0,
      isPublicHoliday: !!publicHoliday,
      publicHolidayName: publicHoliday ? publicHoliday.name : null
    };
    
    attendance.forEach(record => {
      const status = record.status ? record.status.toLowerCase() : '';
      if (status.includes('present')) summary.present++;
      else if (status.includes('absent')) summary.absent++;
      else if (status.includes('leave')) summary.leave++;
      else if (status.includes('wfh')) summary.wfh++;
      else if (status.includes('weeklyoff')) summary.weeklyOff++;
      else if (status.includes('holiday')) summary.holiday++;
    });
    
    summary.notMarked = totalEmployees - attendance.length;
    
    res.json({
      success: true,
      summary
    });
    
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching summary", 
      error: error.message 
    });
  }
});

router.get("/summary/all", authenticate, requireAdmin, async (req, res) => {
  try {
    const { month, year, department, role } = req.query;
    
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    const startDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
    
    const employeeFilter = { isActive: true };
    if (department) employeeFilter["org.department"] = department;
    if (role) employeeFilter["org.role"] = role;
    
    const employees = await Employee.find(
      employeeFilter,
      {
        "personal.employeeId": 1,
        "personal.name": 1,
        "org.role": 1,
        "org.department": 1,
        "personal.dateOfJoining": 1,
        "schedule": 1,
        "mappedUser": 1
      }
    ).lean();
    
    // Get public holidays for the month
    const publicHolidays = await Holiday.find({
      type: "PUBLIC",
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    
    const publicHolidayDates = new Set(
      publicHolidays.map(h => new Date(h.date).toISOString().split('T')[0])
    );
    
    const results = [];
    
    for (const emp of employees) {
      const employeeId = emp.personal.employeeId;
      
      // Get attendance
      const attendance = await Attendance.find({
        employeeId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Get approved leaves
      const approvedLeaves = await getApprovedLeavesInRange(employeeId, startDate, endDate);
      const leaveDays = approvedLeaves.reduce((sum, l) => sum + l.days, 0);
      
      // Get approved RH requests
      const approvedRHRequests = await getApprovedRHRequestsInRange(
        employeeId, 
        emp.mappedUser, 
        startDate, 
        endDate
      );
      
      // Calculate totals
      let totalDays = attendance.length;
      let presentDays = 0;
      let absentDays = 0;
      let wfhDays = 0;
      let weeklyOffDays = 0;
      let holidayDays = publicHolidays.length + approvedRHRequests.length;
      let totalHours = 0;
      let totalOT = 0;
      let lateArrivals = 0;
      let earlyDepartures = 0;
      
      const expectedIn = parseTimeValue(emp.schedule?.expectedLoginTime);
      const expectedOut = parseTimeValue(emp.schedule?.expectedLogoutTime);
      
      attendance.forEach(record => {
        const status = record.status ? record.status.toLowerCase() : '';
        
        if (status.includes('present')) {
          presentDays++;
          
          // Check late arrival using employee's schedule
          if (record.inTime && expectedIn) {
            const inParsed = parseTimeValue(record.inTime);
            if (inParsed && inParsed.totalMinutes > expectedIn.totalMinutes + 15) {
              lateArrivals++;
            }
          } else if (record.isLateArrival) {
            lateArrivals++;
          }
          
          // Check early departure
          if (record.outTime && expectedOut) {
            const outParsed = parseTimeValue(record.outTime);
            if (outParsed && outParsed.totalMinutes < expectedOut.totalMinutes - 15) {
              earlyDepartures++;
            }
          } else if (record.isEarlyDeparture) {
            earlyDepartures++;
          }
          
        } else if (status.includes('absent')) {
          absentDays++;
        } else if (status.includes('wfh')) {
          wfhDays++;
        } else if (status.includes('weeklyoff')) {
          weeklyOffDays++;
        }
        
        totalHours += record.hoursWorked || 0;
        totalOT += record.hoursOT || 0;
      });
      
      const workingDays = getWorkingDaysInMonth(currentYear, currentMonth) - publicHolidays.length;
      const expectedHours = workingDays * 8;
      const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;
      const utilizationRate = expectedHours > 0 ? ((totalHours / expectedHours) * 100).toFixed(2) : 0;
      
      results.push({
        employeeId,
        name: emp.personal.name,
        role: emp.org?.role || '',
        department: emp.org?.department || '',
        dateOfJoining: emp.personal.dateOfJoining,
        schedule: emp.schedule,
        summary: {
          totalDays,
          presentDays,
          absentDays,
          leaveDays,
          wfhDays,
          weeklyOffDays,
          holidayDays,
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalOT: parseFloat(totalOT.toFixed(2)),
          expectedHours,
          attendanceRate: parseFloat(attendanceRate),
          utilizationRate: parseFloat(utilizationRate),
          lateArrivals,
          earlyDepartures,
          workingDays
        }
      });
    }
    
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      month: currentMonth + 1,
      year: currentYear,
      startDate,
      endDate,
      totalEmployees: results.length,
      publicHolidays: publicHolidays.map(h => ({ name: h.name, date: h.date })),
      results
    });
    
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching attendance summary", 
      error: error.message 
    });
  }
});

function getWorkingDaysInMonth(year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  let workingDays = 0;
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL ENTRY ENDPOINT - UPDATED WITH FIXED CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

router.post("/manual", authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      employeeId, 
      date, 
      inTime, 
      outTime, 
      status, 
      remarks
    } = req.body;
    
    if (!employeeId || !date) {
      return res.status(400).json({ 
        success: false, 
        message: "employeeId and date required" 
      });
    }
    
    const attendanceDate = parseDateString(date);
    
    const employeeData = await findEmployeeWithFlexibleId(employeeId);
    if (!employeeData) {
      return res.status(404).json({ 
        success: false, 
        message: `Employee not found for ID ${employeeId}` 
      });
    }
    
    const { employee, matchedId } = employeeData;
    
    const attendanceData = {
      employeeId: matchedId,
      date: attendanceDate,
      name: employee.personal.name,
      inTime: inTime || "",
      outTime: outTime || "",
      status: status || "Present",
      remarks: remarks || "",
      correctedBy: req.user?._id,
      correctionNote: "Manually entered",
      isManualEntry: true
    };
    
    // Calculate work metrics based on schedule - USING FIXED FUNCTION
    if (inTime && outTime) {
      const metrics = calculateWorkMetrics(
        inTime,
        outTime,
        employee.schedule?.expectedLoginTime,
        employee.schedule?.expectedLogoutTime
      );
      
      attendanceData.hoursWorked = parseFloat(metrics.hoursWorked.toFixed(2));
      attendanceData.hoursOT = parseFloat(metrics.overtimeHours.toFixed(2));
      attendanceData.workDuration = metrics.workDuration;
      attendanceData.totalDuration = metrics.workDuration;
      attendanceData.isLateArrival = metrics.isLateArrival;
      attendanceData.isEarlyDeparture = metrics.isEarlyDeparture;
      attendanceData.lateByMinutes = metrics.lateByMinutes;
      attendanceData.earlyByMinutes = metrics.earlyByMinutes;
      
      // Calculate total with OT
      const totalHours = attendanceData.hoursWorked + attendanceData.hoursOT;
      const totalHoursFloor = Math.floor(totalHours);
      const totalMinutesRemainder = Math.round((totalHours - totalHoursFloor) * 60);
      attendanceData.totalDuration = `${totalHoursFloor.toString().padStart(2, '0')}:${totalMinutesRemainder.toString().padStart(2, '0')}`;
      
      if (metrics.remarks.length > 0) {
        attendanceData.remarks = attendanceData.remarks 
          ? `${attendanceData.remarks}; ${metrics.remarks.join('; ')}`
          : metrics.remarks.join('; ');
      }
    }
    
    // Check for leave
    const approvedLeave = await getApprovedLeaveForDate(matchedId, attendanceDate);
    if (approvedLeave && status?.toLowerCase().includes('absent')) {
      attendanceData.status = 'Leave';
      attendanceData.leaveType = approvedLeave.type;
      attendanceData.leaveId = approvedLeave._id;
    }
    
    // Check for holidays
    const publicHoliday = await isPublicHoliday(attendanceDate);
    if (publicHoliday) {
      attendanceData.isHoliday = true;
      attendanceData.holidayName = publicHoliday.name;
      attendanceData.holidayType = 'PUBLIC';
    } else {
      const restrictedHoliday = await isApprovedRestrictedHoliday(
        attendanceDate, 
        matchedId, 
        employee.mappedUser
      );
      if (restrictedHoliday) {
        attendanceData.isHoliday = true;
        attendanceData.holidayName = restrictedHoliday.name;
        attendanceData.holidayType = 'RESTRICTED';
      }
    }
    
    // Set day info
    const dayOfWeek = attendanceDate.getUTCDay();
    attendanceData.isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    attendanceData.dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId: matchedId, date: attendanceDate },
      { $set: attendanceData },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: "Attendance saved",
      attendance,
      note: matchedId !== employeeId ? `Employee ID mapped from "${employeeId}" to "${matchedId}"` : null
    });
    
  } catch (error) {
    console.error("Manual entry error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error saving", 
      error: error.message 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG/TEST ENDPOINT FOR TIME CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

router.post("/test-time-calculation", authenticate, async (req, res) => {
  try {
    const { inTime, outTime } = req.body;
    
    if (!inTime || !outTime) {
      return res.status(400).json({ 
        success: false, 
        message: "inTime and outTime required" 
      });
    }
    
    const inParsed = parseTimeValue(inTime);
    const outParsed = parseTimeValue(outTime);
    
    if (!inParsed || !outParsed) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid time format" 
      });
    }
    
    // Calculate minutes difference
    let workMinutes = outParsed.totalMinutes - inParsed.totalMinutes;
    let overnight = false;
    
    if (workMinutes < 0) {
      workMinutes += 24 * 60;
      overnight = true;
    }
    
    // Calculate hours
    const hoursWorked = parseFloat((workMinutes / 60).toFixed(2));
    const hours = Math.floor(hoursWorked);
    const minutes = Math.round((hoursWorked - hours) * 60);
    
    // Calculate using the fixed function
    const metrics = calculateWorkMetrics(inTime, outTime, null, null);
    
    res.json({
      success: true,
      calculation: {
        inTime,
        outTime,
        parsed: {
          in: inParsed,
          out: outParsed
        },
        raw: {
          inMinutes: inParsed.totalMinutes,
          outMinutes: outParsed.totalMinutes,
          difference: outParsed.totalMinutes - inParsed.totalMinutes,
          overnight: overnight,
          totalMinutes: workMinutes
        },
        results: {
          hoursWorked: hoursWorked,
          formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
          fromMetrics: metrics.hoursWorked,
          metricsFormatted: metrics.workDuration
        },
        example: {
          "10:00 to 19:00": calculateWorkMetrics("10:00", "19:00", null, null).hoursWorked,
          "09:00 to 18:00": calculateWorkMetrics("09:00", "18:00", null, null).hoursWorked,
          "09:00 to 17:30": calculateWorkMetrics("09:00", "17:30", null, null).hoursWorked,
          "09:30 to 18:30": calculateWorkMetrics("09:30", "18:30", null, null).hoursWorked
        }
      }
    });
    
  } catch (error) {
    console.error("Test calculation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error testing calculation", 
      error: error.message 
    });
  }
});

module.exports = router;