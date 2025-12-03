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

function parseTimeString(timeStr) {
  if (!timeStr) return null;
  const str = String(timeStr).trim();
  if (!isNaN(parseFloat(str))) {
    return parseFloat(str);
  }
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours + (minutes / 60);
  }
  return null;
}

function formatTimeFromDecimal(decimalHours) {
  if (decimalHours === null || decimalHours === undefined) return "";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function isHoliday(date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  const holiday = await Holiday.findOne({
    date: { $gte: start, $lte: end }
  });
  return !!holiday;
}

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
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    
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
    
    const requiredColumns = ['ecode', 'e code', 'employee code', 'emp code'];
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
    const holidayCheck = await isHoliday(attendanceDate);
    
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
        
        const employeeId = String(employeeIdRaw).trim();
        const employee = await Employee.findOne({ 
          "personal.employeeId": employeeId 
        }, { "personal.name": 1 });
        
        if (!employee) {
          results.warnings.push(`Row ${originalRowNum}: Employee not found`);
          continue;
        }
        
        const attendanceData = {
          employeeId,
          date: attendanceDate,
          name: employee.personal.name,
          importedAt: new Date(),
          importBatchId
        };
        
        const columnMappings = {
          'shift': ['shift'],
          'intime': ['intime', 'in time', 'in', 'intime(00:00)'],
          'outtime': ['outtime', 'out time', 'out', 'outtime(00:00)'],
          'workdur': ['work dur', 'workdur', 'work dur.(00:00)'],
          'ot': ['ot', 'overtime', 'ot(00:00)'],
          'totdur': ['tot dur', 'total dur', 'tot. dur.(8:42)'],
          'status': ['status'],
          'remarks': ['remarks']
        };
        
        for (const [field, aliases] of Object.entries(columnMappings)) {
          for (const alias of aliases) {
            if (normalizedHeaders[alias] && row[normalizedHeaders[alias]] !== undefined) {
              const value = row[normalizedHeaders[alias]];
              if (value !== "" && value !== null) {
                switch (field) {
                  case 'intime':
                    attendanceData.inTime = formatTimeFromDecimal(parseTimeString(value)) || String(value);
                    break;
                  case 'outtime':
                    attendanceData.outTime = formatTimeFromDecimal(parseTimeString(value)) || String(value);
                    break;
                  case 'workdur':
                    attendanceData.workDuration = String(value);
                    attendanceData.hoursWorked = parseTimeString(value) || 0;
                    break;
                  case 'ot':
                    attendanceData.overTime = String(value);
                    attendanceData.hoursOT = parseTimeString(value) || 0;
                    break;
                  case 'totdur':
                    attendanceData.totalDuration = String(value);
                    if (!attendanceData.hoursWorked) {
                      attendanceData.hoursWorked = parseTimeString(value) || 0;
                    }
                    break;
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
        
        attendanceData.isHoliday = holidayCheck;
        if (attendanceData.status && attendanceData.status.toLowerCase().includes('holiday')) {
          attendanceData.isHoliday = true;
        }
        
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
        importBatchId
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
      { "personal.name": 1, "org.role": 1, "org.department": 1 }
    ).lean();
    
    let totalDays = attendance.length;
    let presentDays = 0;
    let absentDays = 0;
    let totalHours = 0;
    let totalOT = 0;
    
    attendance.forEach(record => {
      if (record.status && record.status.toLowerCase().includes('present')) {
        presentDays++;
      } else if (record.status && record.status.toLowerCase().includes('absent')) {
        absentDays++;
      }
      totalHours += record.hoursWorked || 0;
      totalOT += record.hoursOT || 0;
    });
    
    res.json({
      success: true,
      employee: employee ? {
        name: employee.personal.name,
        role: employee.org?.role,
        department: employee.org?.department
      } : null,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalOT: parseFloat(totalOT.toFixed(2)),
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
      "Hours Worked": record.hoursWorked || 0,
      "OT Hours": record.hoursOT || 0
    }));
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const colWidths = [
      { wch: 5 },
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 }
    ];
    worksheet['!cols'] = colWidths;
    
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
    
    const summary = {
      date: new Date(targetDate).toISOString().split('T')[0],
      totalEmployees,
      present: 0,
      absent: 0,
      leave: 0,
      wfh: 0,
      weeklyOff: 0,
      holiday: 0
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

// Add this route to /routes/attendance.js
router.get("/summary/all", authenticate, requireAdmin, async (req, res) => {
    try {
      const { month, year, department, role } = req.query;
      
      // Calculate date range for the month
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();
      
      const startDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
      
      // Build employee filter
      const employeeFilter = { isActive: true };
      if (department) {
        employeeFilter["org.department"] = department;
      }
      if (role) {
        employeeFilter["org.role"] = role;
      }
      
      // Get all active employees
      const employees = await Employee.find(
        employeeFilter,
        {
          "personal.employeeId": 1,
          "personal.name": 1,
          "org.role": 1,
          "org.department": 1,
          "personal.dateOfJoining": 1
        }
      ).lean();
      
      const results = [];
      
      for (const emp of employees) {
        const employeeId = emp.personal.employeeId;
        
        // Get attendance for the month
        const attendance = await Attendance.find({
          employeeId,
          date: { $gte: startDate, $lte: endDate }
        }).lean();
        
        // Calculate totals
        let totalDays = attendance.length;
        let presentDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let wfhDays = 0;
        let weeklyOffDays = 0;
        let holidayDays = 0;
        let totalHours = 0;
        let totalOT = 0;
        let lateArrivals = 0;
        let earlyDepartures = 0;
        
        attendance.forEach(record => {
          const status = record.status ? record.status.toLowerCase() : '';
          
          if (status.includes('present')) {
            presentDays++;
            
            // Check for late arrival (after 10:00 AM)
            if (record.inTime) {
              const [hours] = record.inTime.split(':').map(Number);
              if (hours >= 10) lateArrivals++;
            }
            
            // Check for early departure (before 6:00 PM)
            if (record.outTime) {
              const [hours] = record.outTime.split(':').map(Number);
              if (hours < 18) earlyDepartures++;
            }
            
          } else if (status.includes('absent')) {
            absentDays++;
          } else if (status.includes('leave')) {
            leaveDays++;
          } else if (status.includes('wfh')) {
            wfhDays++;
          } else if (status.includes('weeklyoff')) {
            weeklyOffDays++;
          } else if (status.includes('holiday')) {
            holidayDays++;
          }
          
          totalHours += record.hoursWorked || 0;
          totalOT += record.hoursOT || 0;
        });
        
        // Calculate working days in month
        const workingDays = getWorkingDaysInMonth(currentYear, currentMonth);
        const expectedHours = workingDays * 8; // Assuming 8 hours per day
        const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;
        const utilizationRate = expectedHours > 0 ? ((totalHours / expectedHours) * 100).toFixed(2) : 0;
        
        results.push({
          employeeId,
          name: emp.personal.name,
          role: emp.org?.role || '',
          department: emp.org?.department || '',
          dateOfJoining: emp.personal.dateOfJoining,
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
      
      // Sort by name
      results.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({
        success: true,
        month: currentMonth + 1,
        year: currentYear,
        startDate,
        endDate,
        totalEmployees: results.length,
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
  
  // Helper function to calculate working days in month
  function getWorkingDaysInMonth(year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    let workingDays = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday (0) and Saturday (6)
        workingDays++;
      }
    }
    
    return workingDays;
  }
  
  // Add employee calendar data endpoint
  router.get("/employee/:employeeId/calendar", authenticate, requireAdmin, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { month, year } = req.query;
      
      // Calculate date range for the month
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
          "personal.dateOfJoining": 1
        }
      ).lean();
      
      if (!employee) {
        return res.status(404).json({ 
          success: false, 
          message: "Employee not found" 
        });
      }
      
      // Get attendance for the month
      const attendance = await Attendance.find({
        employeeId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Create calendar data
      const calendarData = [];
      const currentDate = new Date(startDate);
      
      // Get all holidays in this month
      const holidays = await Holiday.find({
        date: { $gte: startDate, $lte: endDate }
      }).lean();
      
      const holidayMap = {};
      holidays.forEach(holiday => {
        const dateStr = new Date(holiday.date).toISOString().split('T')[0];
        holidayMap[dateStr] = holiday;
      });
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Find attendance record for this date
        const attendanceRecord = attendance.find(record => 
          new Date(record.date).toISOString().split('T')[0] === dateStr
        );
        
        // Check if holiday
        const holiday = holidayMap[dateStr];
        
        let status = 'Not Marked';
        let statusClass = 'bg-gray-100 text-gray-800';
        
        if (holiday) {
          status = holiday.type === 'RESTRICTED' ? 'Restricted Holiday' : 'Holiday';
          statusClass = 'bg-indigo-100 text-indigo-800';
        } else if (attendanceRecord) {
          status = attendanceRecord.status;
          const statusLower = status.toLowerCase();
          if (statusLower.includes('present')) statusClass = 'bg-green-100 text-green-800';
          else if (statusLower.includes('absent')) statusClass = 'bg-red-100 text-red-800';
          else if (statusLower.includes('leave')) statusClass = 'bg-blue-100 text-blue-800';
          else if (statusLower.includes('wfh')) statusClass = 'bg-purple-100 text-purple-800';
          else if (statusLower.includes('weeklyoff')) statusClass = 'bg-yellow-100 text-yellow-800';
        } else if (isWeekend) {
          status = 'Weekend';
          statusClass = 'bg-gray-200 text-gray-600';
        }
        
        calendarData.push({
          date: dateStr,
          day: currentDate.getUTCDate(),
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
          isWeekend,
          isHoliday: !!holiday,
          holidayName: holiday ? holiday.name : null,
          attendance: attendanceRecord ? {
            inTime: attendanceRecord.inTime,
            outTime: attendanceRecord.outTime,
            workHours: attendanceRecord.hoursWorked,
            otHours: attendanceRecord.hoursOT,
            remarks: attendanceRecord.remarks,
            status: attendanceRecord.status
          } : null,
          status,
          statusClass
        });
        
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
      
      // Calculate summary for the month
      let summary = {
        totalDays: calendarData.length,
        workingDays: calendarData.filter(d => !d.isWeekend && !d.isHoliday).length,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        wfhDays: 0,
        totalHours: 0,
        totalOT: 0
      };
      
      attendance.forEach(record => {
        const status = record.status ? record.status.toLowerCase() : '';
        if (status.includes('present')) summary.presentDays++;
        else if (status.includes('absent')) summary.absentDays++;
        else if (status.includes('leave')) summary.leaveDays++;
        else if (status.includes('wfh')) summary.wfhDays++;
        
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
          dateOfJoining: employee.personal.dateOfJoining
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
    const employee = await Employee.findOne({ 
      "personal.employeeId": employeeId 
    }, { "personal.name": 1 });
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: "Employee not found" 
      });
    }
    
    const attendanceData = {
      employeeId,
      date: attendanceDate,
      name: employee.personal.name,
      inTime: inTime || "",
      outTime: outTime || "",
      status: status || "Present",
      remarks: remarks || "",
      correctedBy: req.user?._id,
      correctionNote: "Manually entered"
    };
    
    if (inTime && outTime) {
      const inMinutes = Attendance.timeToMinutes(inTime);
      const outMinutes = Attendance.timeToMinutes(outTime);
      if (inMinutes !== null && outMinutes !== null) {
        const workMinutes = outMinutes - inMinutes;
        if (workMinutes > 0) {
          attendanceData.workDuration = Attendance.minutesToTime(workMinutes);
          attendanceData.totalDuration = attendanceData.workDuration;
          attendanceData.hoursWorked = workMinutes / 60;
        }
      }
    }
    
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date: attendanceDate },
      { $set: attendanceData },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: "Attendance saved",
      attendance
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

module.exports = router;