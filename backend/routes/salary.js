const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const { authenticate, requireAdmin } = require("../middleware/hrmsAuth");
const SalaryConfig = require("../models/Salaryconfig");
const SalaryRecord = require("../models/Salaryrecord");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const RestrictedHolidayRequest = require("../models/RestrictedHolidayRequest");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the nth Saturday of a month (1st, 2nd, 3rd, 4th, 5th)
 */
function getNthSaturdayOfMonth(year, month, n) {
  const firstDay = new Date(year, month, 1);
  const firstSaturday = new Date(year, month, 1 + (6 - firstDay.getDay() + 7) % 7);
  const nthSaturday = new Date(firstSaturday);
  nthSaturday.setDate(firstSaturday.getDate() + (n - 1) * 7);
  
  // Check if still in same month
  if (nthSaturday.getMonth() !== month) {
    return null;
  }
  return nthSaturday;
}

/**
 * Get all Saturdays off in a month based on config
 */
function getSaturdaysOff(year, month, saturdaysOffConfig = [1, 3]) {
  const saturdaysOff = [];
  
  for (const n of saturdaysOffConfig) {
    const saturday = getNthSaturdayOfMonth(year, month, n);
    if (saturday) {
      saturdaysOff.push(saturday.toISOString().split('T')[0]);
    }
  }
  
  return saturdaysOff;
}

/**
 * Get all Sundays in a month
 */
function getSundaysInMonth(year, month) {
  const sundays = [];
  const date = new Date(year, month, 1);
  
  while (date.getMonth() === month) {
    if (date.getDay() === 0) {
      sundays.push(new Date(date).toISOString().split('T')[0]);
    }
    date.setDate(date.getDate() + 1);
  }
  
  return sundays;
}

/**
 * Get all dates in a month
 */
function getAllDatesInMonth(year, month) {
  const dates = [];
  const date = new Date(year, month, 1);
  
  while (date.getMonth() === month) {
    dates.push(new Date(date).toISOString().split('T')[0]);
    date.setDate(date.getDate() + 1);
  }
  
  return dates;
}

/**
 * Check if employee worked 3+ days around a Sunday (for Sunday pay rule)
 */
function checkSundayPayEligibility(sundayDate, attendanceMap, minDays = 3) {
  const sunday = new Date(sundayDate);
  
  // Check Thursday, Friday, Saturday before Sunday
  // and Monday, Tuesday, Wednesday after Sunday
  const daysToCheck = [];
  
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue; // Skip Sunday itself
    const checkDate = new Date(sunday);
    checkDate.setDate(sunday.getDate() + i);
    daysToCheck.push(checkDate.toISOString().split('T')[0]);
  }
  
  let daysWorked = 0;
  for (const dateStr of daysToCheck) {
    const attendance = attendanceMap[dateStr];
    if (attendance && attendance.status?.toLowerCase().includes('present')) {
      daysWorked++;
    }
  }
  
  return daysWorked >= minDays;
}

/**
 * Calculate bi-weekly periods for a month
 */
function getBiWeeklyPeriods(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // First period: 1st to 15th
  // Second period: 16th to end of month
  return [
    {
      weekNumber: 1,
      periodStart: new Date(Date.UTC(year, month, 1)),
      periodEnd: new Date(Date.UTC(year, month, 15, 23, 59, 59, 999))
    },
    {
      weekNumber: 2,
      periodStart: new Date(Date.UTC(year, month, 16)),
      periodEnd: new Date(Date.UTC(year, month, daysInMonth, 23, 59, 59, 999))
    }
  ];
}

/**
 * Parse time string to get hours
 */
function parseTimeToHours(timeStr) {
  if (!timeStr) return 0;
  
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return parseInt(match[1]) + parseInt(match[2]) / 60;
  }
  
  const num = parseFloat(timeStr);
  if (!isNaN(num)) return num;
  
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALARY CONFIG ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get salary config for an employee
 */
router.get("/config/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    let config = await SalaryConfig.findOne({ employeeId }).lean();
    
    if (!config) {
      // Return default config
      const employee = await Employee.findOne(
        { "personal.employeeId": employeeId },
        { "financial": 1 }
      ).lean();
      
      config = {
        employeeId,
        salaryOffered: employee?.financial?.currentCTC || 0,
        dailyWorkHours: 9,
        saturdaysOff: [1, 3],
        sundayOff: true,
        hourlyDeductionRate: 500,
        pfEnabled: true,
        pfPercentage: 12,
        professionalTaxEnabled: true,
        professionalTaxAmount: 200,
        paidLeavesPerMonth: 1.5,
        isDefault: true
      };
    }
    
    res.json({ success: true, config });
    
  } catch (error) {
    console.error("Get config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Create/Update salary config
 */
router.post("/config", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId, ...configData } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID required" });
    }
    
    const config = await SalaryConfig.findOneAndUpdate(
      { employeeId },
      { 
        ...configData,
        employeeId,
        lastRevisedAt: new Date(),
        revisedBy: req.user?._id
      },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json({ success: true, message: "Config saved", config });
    
  } catch (error) {
    console.error("Save config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get all salary configs
 */
router.get("/configs", authenticate, requireAdmin, async (req, res) => {
  try {
    const configs = await SalaryConfig.find({ isActive: true })
      .sort({ employeeId: 1 })
      .lean();
    
    res.json({ success: true, configs });
    
  } catch (error) {
    console.error("Get configs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SALARY CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate salary for a single employee
 */
router.post("/calculate/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year, overrides = {} } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year required" });
    }
    
    const result = await calculateEmployeeSalary(employeeId, month, year, req.user?._id, overrides);
    
    res.json({ success: true, salary: result });
    
  } catch (error) {
    console.error("Calculate salary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Calculate salary for all employees
 */
router.post("/calculate-all", authenticate, requireAdmin, async (req, res) => {
  try {
    const { month, year, department, recalculate = false } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year required" });
    }
    
    // Get all active employees
    const filter = { isActive: true };
    if (department) {
      filter["org.department"] = department;
    }
    
    const employees = await Employee.find(filter, { "personal.employeeId": 1 }).lean();
    
    const results = {
      total: employees.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    for (const emp of employees) {
      try {
        const existingRecord = await SalaryRecord.findOne({
          employeeId: emp.personal.employeeId,
          month,
          year
        });
        
        if (existingRecord && !recalculate) {
          results.skipped++;
          continue;
        }
        
        await calculateEmployeeSalary(emp.personal.employeeId, month, year, req.user?._id);
        results.success++;
        
      } catch (err) {
        results.failed++;
        results.errors.push({
          employeeId: emp.personal.employeeId,
          error: err.message
        });
      }
    }
    
    res.json({ success: true, results });
    
  } catch (error) {
    console.error("Calculate all error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Main salary calculation function
 */
async function calculateEmployeeSalary(employeeId, month, year, calculatedBy, overrides = {}) {
  const monthIndex = month - 1; // JavaScript months are 0-indexed
  
  // Get employee details
  const employee = await Employee.findOne(
    { "personal.employeeId": employeeId }
  ).lean();
  
  if (!employee) {
    throw new Error(`Employee not found: ${employeeId}`);
  }
  
  // Get salary config (or use defaults)
  let config = await SalaryConfig.findOne({ employeeId }).lean();
  
  if (!config) {
    config = {
      salaryOffered: employee.financial?.currentCTC || 0,
      dailyWorkHours: 9,
      saturdaysOff: [1, 3],
      sundayOff: true,
      hourlyDeductionRate: 500,
      pfEnabled: true,
      pfPercentage: 12,
      professionalTaxEnabled: true,
      professionalTaxAmount: 200,
      paidLeavesPerMonth: 1.5,
      minDaysForSundayPay: 3
    };
  }
  
  // Apply overrides
  const finalConfig = { ...config, ...overrides };
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Calculate days
  // ─────────────────────────────────────────────────────────────────────────
  const daysInMonth = new Date(year, month, 0).getDate();
  const periodStart = new Date(Date.UTC(year, monthIndex, 1));
  const periodEnd = new Date(Date.UTC(year, monthIndex, daysInMonth, 23, 59, 59, 999));
  
  // Get all Sundays
  const sundays = getSundaysInMonth(year, monthIndex);
  
  // Get Saturdays off based on config
  const saturdaysOffDates = getSaturdaysOff(year, monthIndex, finalConfig.saturdaysOff);
  
  // Get all Saturdays that are working days
  const allDates = getAllDatesInMonth(year, monthIndex);
  const allSaturdays = allDates.filter(d => new Date(d).getDay() === 6);
  const saturdaysWorking = allSaturdays.filter(d => !saturdaysOffDates.includes(d));
  
  // Get public holidays
  const publicHolidays = await Holiday.find({
    type: "PUBLIC",
    date: { $gte: periodStart, $lte: periodEnd }
  }).lean();
  const publicHolidayDates = publicHolidays.map(h => 
    new Date(h.date).toISOString().split('T')[0]
  );
  
  // Get restricted holidays (approved for this employee)
  const restrictedHolidayRequests = await RestrictedHolidayRequest.find({
    employeeId,
    status: "approved",
    holidayDate: { $gte: periodStart, $lte: periodEnd }
  }).lean();
  const restrictedHolidayDates = restrictedHolidayRequests.map(r => 
    new Date(r.holidayDate).toISOString().split('T')[0]
  );
  
  // Calculate total working days
  let totalWorkingDays = 0;
  const nonWorkingDates = new Set([
    ...sundays,
    ...saturdaysOffDates,
    ...publicHolidayDates,
    ...restrictedHolidayDates
  ]);
  
  for (const dateStr of allDates) {
    if (!nonWorkingDates.has(dateStr)) {
      totalWorkingDays++;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Get attendance data
  // ─────────────────────────────────────────────────────────────────────────
  const attendance = await Attendance.find({
    employeeId,
    date: { $gte: periodStart, $lte: periodEnd }
  }).lean();
  
  // Create attendance map for quick lookup
  const attendanceMap = {};
  attendance.forEach(a => {
    const dateStr = new Date(a.date).toISOString().split('T')[0];
    attendanceMap[dateStr] = a;
  });
  
  // Count days attended
  let daysAttended = 0;
  let totalHoursWorked = 0;
  let overtimeHours = 0;
  
  attendance.forEach(a => {
    const status = a.status?.toLowerCase() || '';
    if (status.includes('present') || status.includes('wfh')) {
      daysAttended++;
      totalHoursWorked += a.hoursWorked || 0;
      overtimeHours += a.hoursOT || 0;
    }
  });
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Get leave data
  // ─────────────────────────────────────────────────────────────────────────
  const leaves = await Leave.find({
    employeeId,
    status: "approved",
    startDate: { $lte: periodEnd },
    endDate: { $gte: periodStart }
  }).lean();
  
  let totalLeavesTaken = 0;
  let paidLeavesUsed = 0;
  
  leaves.forEach(leave => {
    // Calculate days within this month
    const leaveStart = new Date(Math.max(new Date(leave.startDate), periodStart));
    const leaveEnd = new Date(Math.min(new Date(leave.endDate), periodEnd));
    
    const leaveDays = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
    totalLeavesTaken += leaveDays;
    
    // All approved leaves are considered paid (up to monthly limit)
    if (leave.type === 'earned' || leave.type === 'sick') {
      paidLeavesUsed += leaveDays;
    }
  });
  
  // Cap paid leaves to monthly allowance
  const maxPaidLeaves = finalConfig.paidLeavesPerMonth || 1.5;
  paidLeavesUsed = Math.min(paidLeavesUsed, Math.ceil(maxPaidLeaves));
  
  const unpaidLeaves = Math.max(0, totalLeavesTaken - paidLeavesUsed);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Calculate pay loss days
  // ─────────────────────────────────────────────────────────────────────────
  // Pay Loss Days = (Working Days - Days Attended) - Paid Leaves
  const absentDays = Math.max(0, totalWorkingDays - daysAttended - totalLeavesTaken);
  const payLossDays = absentDays + unpaidLeaves;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Calculate Sunday pay (3-day rule)
  // ─────────────────────────────────────────────────────────────────────────
  let sundaysPaid = 0;
  
  for (const sunday of sundays) {
    if (checkSundayPayEligibility(sunday, attendanceMap, finalConfig.minDaysForSundayPay)) {
      sundaysPaid++;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Days to be paid for
  // ─────────────────────────────────────────────────────────────────────────
  const daysToBePaidFor = daysAttended + paidLeavesUsed + sundaysPaid + 
    publicHolidayDates.length + restrictedHolidayDates.length;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 7: Calculate hours and bi-weekly deductions
  // ─────────────────────────────────────────────────────────────────────────
  const dailyWorkHours = finalConfig.dailyWorkHours || 9;
  const totalExpectedHours = totalWorkingDays * dailyWorkHours;
  
  // Bi-weekly calculations
  const biWeeklyPeriods = getBiWeeklyPeriods(year, monthIndex);
  const biWeeklyCalculations = [];
  let totalHourlyDeduction = 0;
  
  for (const period of biWeeklyPeriods) {
    // Count working days in this period
    let periodWorkingDays = 0;
    let periodHoursWorked = 0;
    
    const periodStartStr = period.periodStart.toISOString().split('T')[0];
    const periodEndStr = period.periodEnd.toISOString().split('T')[0];
    
    for (const dateStr of allDates) {
      if (dateStr >= periodStartStr && dateStr <= periodEndStr) {
        if (!nonWorkingDates.has(dateStr)) {
          periodWorkingDays++;
        }
        
        // Check attendance for this date
        const att = attendanceMap[dateStr];
        if (att && (att.status?.toLowerCase().includes('present') || att.status?.toLowerCase().includes('wfh'))) {
          periodHoursWorked += att.hoursWorked || 0;
        }
        
        // Also count leave days as "worked" for hour calculation
        const isOnLeave = leaves.some(l => {
          const lStart = new Date(l.startDate).toISOString().split('T')[0];
          const lEnd = new Date(l.endDate).toISOString().split('T')[0];
          return dateStr >= lStart && dateStr <= lEnd;
        });
        
        if (isOnLeave && !nonWorkingDates.has(dateStr)) {
          periodHoursWorked += dailyWorkHours; // Count leave day as full hours
        }
      }
    }
    
    const expectedPeriodHours = periodWorkingDays * dailyWorkHours;
    const hoursShortfall = Math.max(0, expectedPeriodHours - periodHoursWorked);
    const periodDeduction = Math.floor(hoursShortfall) * finalConfig.hourlyDeductionRate;
    
    biWeeklyCalculations.push({
      weekNumber: period.weekNumber,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      expectedHours: expectedPeriodHours,
      actualHours: Math.round(periodHoursWorked * 100) / 100,
      hoursShortfall: Math.round(hoursShortfall * 100) / 100,
      deductionAmount: periodDeduction
    });
    
    totalHourlyDeduction += periodDeduction;
  }
  
  const hoursShortfall = Math.max(0, totalExpectedHours - totalHoursWorked);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 8: Salary calculation
  // ─────────────────────────────────────────────────────────────────────────
  const salaryOffered = finalConfig.salaryOffered || 0;
  const perDaySalary = salaryOffered / daysInMonth;
  const grossSalary = Math.round(perDaySalary * daysToBePaidFor);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 9: Calculate deductions
  // ─────────────────────────────────────────────────────────────────────────
  const deductions = {
    hourlyDeduction: totalHourlyDeduction,
    hourlyDeductionRate: finalConfig.hourlyDeductionRate,
    payLossDeduction: Math.round(perDaySalary * payLossDays),
    pfDeduction: 0,
    esiDeduction: 0,
    professionalTax: 0,
    tdsDeduction: 0,
    damages: 0,
    advanceSalaryRecovery: 0,
    otherDeductions: 0
  };
  
  // PF calculation (on basic, usually 50% of gross)
  if (finalConfig.pfEnabled) {
    const basicSalary = grossSalary * 0.5; // Assuming basic is 50% of gross
    if (finalConfig.pfFixedAmount > 0) {
      deductions.pfDeduction = finalConfig.pfFixedAmount;
    } else {
      deductions.pfDeduction = Math.round(basicSalary * (finalConfig.pfPercentage / 100));
    }
  }
  
  // ESI calculation
  if (finalConfig.esiEnabled && grossSalary <= 21000) {
    deductions.esiDeduction = Math.round(grossSalary * (finalConfig.esiPercentage / 100));
  }
  
  // Professional Tax
  if (finalConfig.professionalTaxEnabled) {
    deductions.professionalTax = finalConfig.professionalTaxAmount || 200;
  }
  
  // TDS
  if (finalConfig.tdsEnabled && finalConfig.tdsPercentage > 0) {
    deductions.tdsDeduction = Math.round(grossSalary * (finalConfig.tdsPercentage / 100));
  }
  
  const totalDeductions = Object.values(deductions).reduce((sum, val) => {
    if (typeof val === 'number') return sum + val;
    return sum;
  }, 0);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 10: Calculate net payable
  // ─────────────────────────────────────────────────────────────────────────
  const netPayable = grossSalary - totalDeductions;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 11: Save salary record
  // ─────────────────────────────────────────────────────────────────────────
  const salaryRecord = await SalaryRecord.findOneAndUpdate(
    { employeeId, month, year },
    {
      employeeId,
      employeeName: employee.personal.name,
      month,
      year,
      periodStart,
      periodEnd,
      
      // Days
      daysInMonth,
      totalWorkingDays,
      daysAttended,
      totalLeavesTaken,
      paidLeavesUsed,
      unpaidLeaves,
      payLossDays,
      sundaysInMonth: sundays.length,
      saturdaysOff: saturdaysOffDates.length,
      saturdaysWorking: saturdaysWorking.length,
      publicHolidays: publicHolidayDates.length,
      restrictedHolidays: restrictedHolidayDates.length,
      sundaysPaid,
      daysToBePaidFor,
      
      // Hours
      expectedWorkHoursPerDay: dailyWorkHours,
      totalExpectedHours,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      hoursShortfall: Math.round(hoursShortfall * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      biWeeklyCalculations,
      
      // Salary
      salaryOffered,
      perDaySalary: Math.round(perDaySalary * 100) / 100,
      grossSalary,
      deductions,
      totalDeductions,
      additions: {
        incentive: 0,
        bonus: 0,
        overtimePay: 0,
        reimbursements: 0,
        otherAdditions: 0
      },
      totalAdditions: 0,
      netPayable,
      
      // Status
      status: 'calculated',
      calculatedAt: new Date(),
      calculatedBy,
      
      // Calculation details for audit
      calculationDetails: {
        config: finalConfig,
        sundays,
        saturdaysOffDates,
        publicHolidayDates,
        restrictedHolidayDates,
        attendanceCount: attendance.length
      }
    },
    { new: true, upsert: true, runValidators: true }
  );
  
  return salaryRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALARY RECORDS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get salary records for a month
 */
router.get("/records", authenticate, requireAdmin, async (req, res) => {
  try {
    const { month, year, status, department } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year required" });
    }
    
    let query = { month: parseInt(month), year: parseInt(year) };
    if (status) query.status = status;
    
    let records = await SalaryRecord.find(query)
      .sort({ employeeName: 1 })
      .lean();
    
    // Filter by department if needed
    if (department) {
      const employeesInDept = await Employee.find(
        { "org.department": department },
        { "personal.employeeId": 1 }
      ).lean();
      const empIds = new Set(employeesInDept.map(e => e.personal.employeeId));
      records = records.filter(r => empIds.has(r.employeeId));
    }
    
    // Calculate summary
    const summary = {
      totalEmployees: records.length,
      totalGross: records.reduce((sum, r) => sum + r.grossSalary, 0),
      totalDeductions: records.reduce((sum, r) => sum + r.totalDeductions, 0),
      totalNet: records.reduce((sum, r) => sum + r.netPayable, 0),
      byStatus: {}
    };
    
    records.forEach(r => {
      summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + 1;
    });
    
    res.json({ success: true, records, summary });
    
  } catch (error) {
    console.error("Get records error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get single salary record
 */
router.get("/record/:employeeId/:month/:year", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId, month, year } = req.params;
    
    const record = await SalaryRecord.findOne({
      employeeId,
      month: parseInt(month),
      year: parseInt(year)
    }).lean();
    
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    
    res.json({ success: true, record });
    
  } catch (error) {
    console.error("Get record error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Update salary record (for manual adjustments)
 */
router.put("/record/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Prevent updating certain fields
    delete updates._id;
    delete updates.employeeId;
    delete updates.month;
    delete updates.year;
    delete updates.calculatedAt;
    delete updates.calculatedBy;
    
    const record = await SalaryRecord.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    
    res.json({ success: true, message: "Record updated", record });
    
  } catch (error) {
    console.error("Update record error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Add manual adjustment
 */
router.post("/record/:id/adjustment", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, type } = req.body;
    
    if (!description || !amount || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Description, amount, and type required" 
      });
    }
    
    const record = await SalaryRecord.findByIdAndUpdate(
      id,
      {
        $push: {
          manualAdjustments: {
            description,
            amount,
            type,
            adjustedBy: req.user?._id,
            adjustedAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    
    res.json({ success: true, message: "Adjustment added", record });
    
  } catch (error) {
    console.error("Add adjustment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Approve salary record
 */
router.post("/record/:id/approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await SalaryRecord.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user?._id
      },
      { new: true }
    );
    
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    
    res.json({ success: true, message: "Record approved", record });
    
  } catch (error) {
    console.error("Approve error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Mark as paid
 */
router.post("/record/:id/mark-paid", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentReference, paymentMode } = req.body;
    
    const record = await SalaryRecord.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paidAt: new Date(),
        paymentReference,
        paymentMode: paymentMode || 'bank_transfer'
      },
      { new: true }
    );
    
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    
    res.json({ success: true, message: "Marked as paid", record });
    
  } catch (error) {
    console.error("Mark paid error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export salary records to Excel
 */
router.get("/export", authenticate, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year required" });
    }
    
    const records = await SalaryRecord.find({
      month: parseInt(month),
      year: parseInt(year)
    }).sort({ employeeName: 1 }).lean();
    
    if (records.length === 0) {
      return res.status(404).json({ success: false, message: "No records found" });
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const excelData = records.map((r, i) => ({
      "S.No": i + 1,
      "Employee ID": r.employeeId,
      "Employee Name": r.employeeName,
      "Days in Month": r.daysInMonth,
      "Working Days": r.totalWorkingDays,
      "Days Attended": r.daysAttended,
      "Total Leaves": r.totalLeavesTaken,
      "Paid Leaves": r.paidLeavesUsed,
      "Pay Loss Days": r.payLossDays,
      "Days to Pay": r.daysToBePaidFor,
      "Expected Hours": r.totalExpectedHours,
      "Hours Worked": r.totalHoursWorked,
      "Hours Shortfall": r.hoursShortfall,
      "Salary Offered": r.salaryOffered,
      "Per Day Salary": r.perDaySalary,
      "Gross Salary": r.grossSalary,
      "Hourly Deduction": r.deductions.hourlyDeduction,
      "PF Deduction": r.deductions.pfDeduction,
      "PT Deduction": r.deductions.professionalTax,
      "Other Deductions": r.deductions.otherDeductions,
      "Total Deductions": r.totalDeductions,
      "Incentive": r.additions.incentive,
      "Bonus": r.additions.bonus,
      "Total Additions": r.totalAdditions,
      "Net Payable": r.netPayable,
      "Status": r.status
    }));
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Salary");
    
    const filename = `Salary_${monthNames[month - 1]}_${year}.xlsx`;
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get salary preview (without saving)
 */
router.post("/preview/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.body;
    
    // Similar to calculate but don't save
    // For now, just calculate and return without saving
    const result = await calculateEmployeeSalary(employeeId, month, year, req.user?._id);
    
    res.json({ success: true, preview: result });
    
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;