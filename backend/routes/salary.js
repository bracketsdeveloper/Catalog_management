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
const CompanyConfig = require("../models/CompanyConfig");

// ─────────────────────────────────────────────────────────────────────────────
// UPDATED HELPER FUNCTIONS FOR NEW REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the nth Saturday of a month (1st, 2nd, 3rd, 4th, 5th)
 */
function getNthSaturdayOfMonth(year, month, n) {
  const firstDay = new Date(year, month, 1);
  const firstSaturday = new Date(year, month, 1 + (6 - firstDay.getDay() + 7) % 7);
  const nthSaturday = new Date(firstSaturday);
  nthSaturday.setDate(firstSaturday.getDate() + (n - 1) * 7);
  
  if (nthSaturday.getMonth() !== month) {
    return null;
  }
  return nthSaturday;
}

/**
 * Get all Saturdays off based on pattern
 */
function getSaturdaysOffByPattern(year, month, pattern) {
  const saturdaysOff = [];
  const monthIndex = month - 1;
  
  if (pattern === 'none') return saturdaysOff;
  if (pattern === 'all') {
    const allDates = getAllDatesInMonth(year, monthIndex);
    return allDates.filter(d => new Date(d).getDay() === 6);
  }
  
  if (pattern === '1st_3rd') {
    const firstSat = getNthSaturdayOfMonth(year, monthIndex, 1);
    const thirdSat = getNthSaturdayOfMonth(year, monthIndex, 3);
    if (firstSat) saturdaysOff.push(firstSat.toISOString().split('T')[0]);
    if (thirdSat) saturdaysOff.push(thirdSat.toISOString().split('T')[0]);
  } else if (pattern === '2nd_4th') {
    const secondSat = getNthSaturdayOfMonth(year, monthIndex, 2);
    const fourthSat = getNthSaturdayOfMonth(year, monthIndex, 4);
    if (secondSat) saturdaysOff.push(secondSat.toISOString().split('T')[0]);
    if (fourthSat) saturdaysOff.push(fourthSat.toISOString().split('T')[0]);
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
 * Calculate bi-weekly periods for 99-hour rule
 */
function getBiWeeklyPeriods99Hour(year, month) {
  const monthIndex = month - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  return [
    {
      periodNumber: 1,
      startDate: new Date(Date.UTC(year, monthIndex, 1)),
      endDate: new Date(Date.UTC(year, monthIndex, 15, 23, 59, 59, 999)),
      workingDays: 0,
      expectedHours: 0,
      actualHours: 0,
      shortfallHours: 0,
      deduction: 0
    },
    {
      periodNumber: 2,
      startDate: new Date(Date.UTC(year, monthIndex, 16)),
      endDate: new Date(Date.UTC(year, monthIndex, daysInMonth, 23, 59, 59, 999)),
      workingDays: 0,
      expectedHours: 0,
      actualHours: 0,
      shortfallHours: 0,
      deduction: 0
    }
  ];
}

/**
 * Calculate 99-hour rule deduction
 */
function calculate99HourDeduction(shortfallHours, gracePeriodHours, deductionRate) {
  if (shortfallHours <= gracePeriodHours) {
    return 0;
  }
  return (shortfallHours - gracePeriodHours) * deductionRate;
}

/**
 * Calculate weekend deductions based on excess leave days
 */
function calculateWeekendDeduction(excessDays, weekendTiers, dailyRate, sundaysInMonth) {
  if (!weekendTiers || weekendTiers.length === 0) return 0;
  
  for (const tier of weekendTiers) {
    if (excessDays >= tier.minExcessDays && excessDays <= tier.maxExcessDays) {
      const sundaysToDeduct = Math.min(tier.sundaysDeducted, sundaysInMonth);
      return sundaysToDeduct * dailyRate;
    }
  }
  return 0;
}

/**
 * Calculate WFH deductions
 */
function calculateWFHDeduction(emergencyWFHDays, casualWFHDays, dailyRate, emergencyDeductionRate, casualDeductionRate) {
  const emergencyDeduction = emergencyWFHDays * dailyRate * emergencyDeductionRate;
  const casualDeduction = casualWFHDays * dailyRate * casualDeductionRate;
  return emergencyDeduction + casualDeduction;
}

/**
 * Check if employee is in probation
 */
function isInProbation(joiningDate, probationPeriodDays) {
  if (!joiningDate) return true;
  
  const probationEnd = new Date(joiningDate);
  probationEnd.setDate(probationEnd.getDate() + probationPeriodDays);
  
  return new Date() < probationEnd;
}

/**
 * Get effective configuration for employee (with inheritance)
 */
async function getEffectiveConfig(employeeId) {
  const companyConfig = await CompanyConfig.findOne({ isActive: true }).lean();
  const employeeConfig = await SalaryConfig.findOne({ employeeId }).lean();
  const employee = await Employee.findOne({ "personal.employeeId": employeeId }).lean();
  
  // Default effective config
  const effective = {
    // Basic
    salaryOffered: employee?.financial?.currentCTC || 0,
    
    // Attendance
    dailyWorkHours: 9,
    biWeeklyTargetHours: 99,
    gracePeriodHours: 2,
    hourlyDeductionRate: 500,
    saturdaysOffPattern: '1st_3rd',
    
    // Leave
    sickLeavePerMonth: 1,
    earnedLeavePer20Days: 1.25,
    maxCarryForwardEL: 30,
    deathInFamilyLeave: 10,
    selfMarriageLeave: 2,
    compulsoryHolidaysPerYear: 10,
    restrictedHolidaysPerYear: 2,
    
    // WFH
    emergencyWFHDeduction: 0.25,
    casualWFHDeduction: 0.50,
    
    // Penalties
    missedPunchPenalty: 250,
    
    // Probation
    probationPeriodDays: 30,
    isProbationary: true,
    
    // Weekend deduction tiers
    weekendDeductionTiers: [
      { minExcessDays: 0, maxExcessDays: 2, sundaysDeducted: 0, description: "No weekend deduction" },
      { minExcessDays: 3, maxExcessDays: 4, sundaysDeducted: 1, description: "1 Sunday deduction" },
      { minExcessDays: 5, maxExcessDays: 6, sundaysDeducted: 2, description: "2 Sundays deduction" },
      { minExcessDays: 7, maxExcessDays: 999, sundaysDeducted: 4, description: "All Sundays (LOP for weekends)" }
    ],
    
    // Statutory
    pfEnabled: true,
    pfPercentage: 12,
    esiEnabled: false,
    esiPercentage: 0.75,
    esiSalaryThreshold: 21000,
    professionalTaxEnabled: true,
    professionalTaxAmount: 200,
    tdsEnabled: false,
    tdsPercentage: 0,
    
    // Attendance bonus
    attendanceBonusAmount: 1000,
    attendanceBonusMonths: 4
  };
  
  // Override with company config
  if (companyConfig) {
    effective.dailyWorkHours = companyConfig.attendanceSettings?.dailyWorkHours || effective.dailyWorkHours;
    effective.biWeeklyTargetHours = companyConfig.biWeeklyRule?.targetHours || effective.biWeeklyTargetHours;
    effective.gracePeriodHours = companyConfig.biWeeklyRule?.gracePeriodHours || effective.gracePeriodHours;
    effective.hourlyDeductionRate = companyConfig.biWeeklyRule?.deductionPerHour || effective.hourlyDeductionRate;
    effective.saturdaysOffPattern = companyConfig.saturdaysPattern || effective.saturdaysOffPattern;
    
    effective.sickLeavePerMonth = companyConfig.leavePolicy?.sickLeave?.perMonth || effective.sickLeavePerMonth;
    effective.earnedLeavePer20Days = companyConfig.leavePolicy?.earnedLeave?.per20WorkingDays || effective.earnedLeavePer20Days;
    effective.maxCarryForwardEL = companyConfig.leavePolicy?.earnedLeave?.maxCarryForward || effective.maxCarryForwardEL;
    effective.deathInFamilyLeave = companyConfig.leavePolicy?.specialLeaves?.deathInFamily || effective.deathInFamilyLeave;
    effective.selfMarriageLeave = companyConfig.leavePolicy?.specialLeaves?.selfMarriage || effective.selfMarriageLeave;
    
    effective.emergencyWFHDeduction = companyConfig.wfhPolicy?.emergencyWFH?.deductionPercentage || effective.emergencyWFHDeduction;
    effective.casualWFHDeduction = companyConfig.wfhPolicy?.casualWFH?.deductionPercentage || effective.casualWFHDeduction;
    
    effective.missedPunchPenalty = companyConfig.disciplinePolicy?.missedPunchPenalty || effective.missedPunchPenalty;
    effective.probationPeriodDays = companyConfig.eligibilityPolicy?.probationPeriodDays || effective.probationPeriodDays;
    
    effective.weekendDeductionTiers = companyConfig.leavePolicy?.weekendDeductionTiers || effective.weekendDeductionTiers;
    
    effective.attendanceBonusAmount = companyConfig.incentives?.attendanceBonus?.amount || effective.attendanceBonusAmount;
    effective.attendanceBonusMonths = companyConfig.incentives?.attendanceBonus?.consecutiveMonths || effective.attendanceBonusMonths;
    
    effective.pfPercentage = companyConfig.statutoryDefaults?.pfPercentage || effective.pfPercentage;
    effective.esiPercentage = companyConfig.statutoryDefaults?.esiPercentage || effective.esiPercentage;
    effective.esiSalaryThreshold = companyConfig.statutoryDefaults?.esiSalaryThreshold || effective.esiSalaryThreshold;
    effective.professionalTaxAmount = companyConfig.statutoryDefaults?.professionalTax || effective.professionalTaxAmount;
  }
  
  // Override with employee-specific config
  if (employeeConfig) {
    // If employee config has useGlobalSettings = false, override all
    if (!employeeConfig.useGlobalSettings) {
      Object.keys(effective).forEach(key => {
        if (employeeConfig[key] !== undefined && employeeConfig[key] !== null) {
          effective[key] = employeeConfig[key];
        }
      });
    } else {
      // Only override specific values that are set in employee config
      const overrideKeys = [
        'salaryOffered', 'dailyWorkHours', 'biWeeklyTargetHours', 'gracePeriodHours',
        'hourlyDeductionRate', 'saturdaysOffPattern', 'sickLeavePerMonth',
        'earnedLeavePer20Days', 'maxCarryForwardEL', 'emergencyWFHDeduction',
        'casualWFHDeduction', 'missedPunchPenalty', 'probationPeriodDays',
        'pfEnabled', 'pfPercentage', 'esiEnabled', 'esiPercentage',
        'professionalTaxEnabled', 'professionalTaxAmount', 'tdsEnabled', 'tdsPercentage'
      ];
      
      overrideKeys.forEach(key => {
        if (employeeConfig[key] !== undefined && employeeConfig[key] !== null) {
          effective[key] = employeeConfig[key];
        }
      });
      
      // Handle weekend tiers specifically
      if (employeeConfig.weekendDeductionTiers && employeeConfig.weekendDeductionTiers.length > 0) {
        effective.weekendDeductionTiers = employeeConfig.weekendDeductionTiers;
      }
    }
  }
  
  // Calculate probation status
  if (employee?.personal?.dateOfJoining) {
    effective.isProbationary = isInProbation(
      employee.personal.dateOfJoining,
      effective.probationPeriodDays
    );
  }
  
  return effective;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATED MAIN CALCULATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function calculateEmployeeSalary(employeeId, month, year, calculatedBy, overrides = {}) {
  const monthIndex = month - 1;
  
  // Get employee details
  const employee = await Employee.findOne(
    { "personal.employeeId": employeeId }
  ).lean();
  
  if (!employee) {
    throw new Error(`Employee not found: ${employeeId}`);
  }
  
  // Get effective configuration
  const effectiveConfig = await getEffectiveConfig(employeeId);
  
  // Apply overrides
  const finalConfig = { ...effectiveConfig, ...overrides };
  
  // Check probation status
  const isProbationary = isInProbation(
    employee.personal?.dateOfJoining,
    finalConfig.probationPeriodDays
  );
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Calculate days and dates
  // ─────────────────────────────────────────────────────────────────────────
  const daysInMonth = new Date(year, month, 0).getDate();
  const periodStart = new Date(Date.UTC(year, monthIndex, 1));
  const periodEnd = new Date(Date.UTC(year, monthIndex, daysInMonth, 23, 59, 59, 999));
  
  // Get all dates in month
  const allDates = getAllDatesInMonth(year, monthIndex);
  
  // Get Sundays
  const sundays = getSundaysInMonth(year, monthIndex);
  
  // Get Saturdays off based on pattern
  const saturdaysOffDates = getSaturdaysOffByPattern(year, monthIndex, finalConfig.saturdaysOffPattern);
  
  // Get public holidays
  const publicHolidays = await Holiday.find({
    type: "PUBLIC",
    date: { $gte: periodStart, $lte: periodEnd }
  }).lean();
  const publicHolidayDates = publicHolidays.map(h => 
    new Date(h.date).toISOString().split('T')[0]
  );
  
  // Get restricted holidays (approved)
  const restrictedHolidayRequests = await RestrictedHolidayRequest.find({
    employeeId,
    status: "approved",
    holidayDate: { $gte: periodStart, $lte: periodEnd }
  }).lean();
  const restrictedHolidayDates = restrictedHolidayRequests.map(r => 
    new Date(r.holidayDate).toISOString().split('T')[0]
  );
  
  // Calculate total working days (excluding Sundays, off Saturdays, holidays)
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
  // STEP 2: Get attendance and calculate hours
  // ─────────────────────────────────────────────────────────────────────────
  const attendance = await Attendance.find({
    employeeId,
    date: { $gte: periodStart, $lte: periodEnd }
  }).lean();
  
  // Create attendance map
  const attendanceMap = {};
  let daysPresent = 0;
  let daysAbsent = 0;
  let totalHoursWorked = 0;
  let emergencyWFHDays = 0;
  let casualWFHDays = 0;
  let missedPunches = 0;
  let overtimeHours = 0;
  
  attendance.forEach(a => {
    const status = a.status?.toLowerCase() || '';
    const dateStr = new Date(a.date).toISOString().split('T')[0];
    attendanceMap[dateStr] = a;
    
    if (status.includes('present') || status.includes('wfh')) {
      daysPresent++;
      totalHoursWorked += a.hoursWorked || 0;
      overtimeHours += a.hoursOT || 0;
      
      // Check for WFH
      if (status.includes('wfh')) {
        if (a.remarks?.toLowerCase().includes('emergency')) {
          emergencyWFHDays++;
        } else {
          casualWFHDays++;
        }
      }
      
      // Check for missed punches
      if ((!a.inTime && !a.outTime) || status.includes('nopunch') || status.includes('missed')) {
        missedPunches++;
      }
    } else if (status.includes('absent')) {
      daysAbsent++;
    }
  });
  
  // Calculate expected hours
  const totalExpectedHours = totalWorkingDays * finalConfig.dailyWorkHours;
  const hoursShortfall = Math.max(0, totalExpectedHours - totalHoursWorked);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Bi-weekly 99-hour rule calculation
  // ─────────────────────────────────────────────────────────────────────────
  const biWeeklyPeriods = getBiWeeklyPeriods99Hour(year, month);
  let totalHourlyDeduction = 0;
  
  for (const period of biWeeklyPeriods) {
    let periodHoursWorked = 0;
    let periodWorkingDays = 0;
    
    const periodStartStr = period.startDate.toISOString().split('T')[0];
    const periodEndStr = period.endDate.toISOString().split('T')[0];
    
    // Calculate for this period
    for (const dateStr of allDates) {
      if (dateStr >= periodStartStr && dateStr <= periodEndStr) {
        // Check if it's a working day
        if (!nonWorkingDates.has(dateStr)) {
          periodWorkingDays++;
        }
        
        // Get hours worked on this date
        const att = attendanceMap[dateStr];
        if (att && (att.status?.toLowerCase().includes('present') || att.status?.toLowerCase().includes('wfh'))) {
          periodHoursWorked += att.hoursWorked || 0;
        }
      }
    }
    
    const periodExpectedHours = periodWorkingDays * finalConfig.dailyWorkHours;
    const periodShortfall = Math.max(0, periodExpectedHours - periodHoursWorked);
    
    // Apply 99-hour rule deduction (only if not in probation)
    let periodDeduction = 0;
    if (!isProbationary) {
      periodDeduction = calculate99HourDeduction(
        periodShortfall,
        finalConfig.gracePeriodHours,
        finalConfig.hourlyDeductionRate
      );
    }
    
    // Update period object
    period.workingDays = periodWorkingDays;
    period.expectedHours = periodExpectedHours;
    period.actualHours = periodHoursWorked;
    period.shortfallHours = periodShortfall;
    period.deduction = periodDeduction;
    
    totalHourlyDeduction += periodDeduction;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Leave calculations
  // ─────────────────────────────────────────────────────────────────────────
  const leaves = await Leave.find({
    employeeId,
    status: "approved",
    startDate: { $lte: periodEnd },
    endDate: { $gte: periodStart }
  }).lean();
  
  let sickLeavesUsed = 0;
  let earnedLeavesUsed = 0;
  let specialLeavesUsed = 0;
  let totalLeavesTaken = 0;
  
  leaves.forEach(leave => {
    // Calculate days within this month
    const leaveStart = new Date(Math.max(new Date(leave.startDate), periodStart));
    const leaveEnd = new Date(Math.min(new Date(leave.endDate), periodEnd));
    
    const leaveDays = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
    totalLeavesTaken += leaveDays;
    
    // Categorize by type
    if (leave.type === 'sick') {
      sickLeavesUsed += leaveDays;
    } else if (leave.type === 'earned') {
      earnedLeavesUsed += leaveDays;
    } else if (leave.type === 'special') {
      specialLeavesUsed += leaveDays;
    }
  });
  
  // Calculate available leaves (only if not in probation)
  const sickLeaveAvailable = isProbationary ? 0 : finalConfig.sickLeavePerMonth;
  const earnedLeaveAvailable = isProbationary ? 0 : 0; // This should come from leave balance
  
  // Calculate excess leaves (beyond available)
  const excessSickLeaves = Math.max(0, sickLeavesUsed - sickLeaveAvailable);
  const excessEarnedLeaves = Math.max(0, earnedLeavesUsed - earnedLeaveAvailable);
  const totalExcessLeaves = excessSickLeaves + excessEarnedLeaves;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Weekend deductions for excess leaves
  // ─────────────────────────────────────────────────────────────────────────
  let weekendDeduction = 0;
  if (!isProbationary && totalExcessLeaves > 0) {
    weekendDeduction = calculateWeekendDeduction(
      totalExcessLeaves,
      finalConfig.weekendDeductionTiers,
      finalConfig.salaryOffered / daysInMonth,
      sundays.length
    );
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Other deductions
  // ─────────────────────────────────────────────────────────────────────────
  // WFH deductions
  const wfhDeduction = calculateWFHDeduction(
    emergencyWFHDays,
    casualWFHDays,
    finalConfig.salaryOffered / daysInMonth,
    finalConfig.emergencyWFHDeduction,
    finalConfig.casualWFHDeduction
  );
  
  // Missed punch penalty
  const missedPunchPenalty = missedPunches * finalConfig.missedPunchPenalty;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 7: Salary calculation
  // ─────────────────────────────────────────────────────────────────────────
  const perDaySalary = finalConfig.salaryOffered / daysInMonth;
  
  // Calculate days to be paid for
  let daysToBePaidFor = daysPresent;
  
  // Add paid leaves (if not in probation)
  if (!isProbationary) {
    // Sick leaves (up to available)
    daysToBePaidFor += Math.min(sickLeavesUsed, sickLeaveAvailable);
    
    // Earned leaves (up to available)
    daysToBePaidFor += Math.min(earnedLeavesUsed, earnedLeaveAvailable);
    
    // Special leaves (always paid)
    daysToBePaidFor += specialLeavesUsed;
    
    // Holidays (always paid)
    daysToBePaidFor += publicHolidayDates.length + restrictedHolidayDates.length;
    
    // Off Saturdays (paid if not in probation)
    daysToBePaidFor += saturdaysOffDates.length;
    
    // Sundays (all Sundays paid if not in probation)
    daysToBePaidFor += sundays.length;
  } else {
    // In probation: only pay for days present
    daysToBePaidFor = daysPresent;
  }
  
  const grossSalary = Math.round(perDaySalary * daysToBePaidFor);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 8: Calculate all deductions
  // ─────────────────────────────────────────────────────────────────────────
  const deductions = {
    // 99-hour rule deductions
    hourlyShortfallDeduction: totalHourlyDeduction,
    hourlyDeductionRate: finalConfig.hourlyDeductionRate,
    
    // Weekend deductions for excess leaves
    weekendExcessLeaveDeduction: weekendDeduction,
    excessLeaves: totalExcessLeaves,
    
    // WFH deductions
    emergencyWFHDeduction: Math.round(emergencyWFHDays * perDaySalary * finalConfig.emergencyWFHDeduction),
    casualWFHDeduction: Math.round(casualWFHDays * perDaySalary * finalConfig.casualWFHDeduction),
    totalWFHDeduction: wfhDeduction,
    
    // Penalties
    missedPunchPenalty: missedPunchPenalty,
    missedPunchCount: missedPunches,
    
    // Statutory deductions
    pfDeduction: 0,
    esiDeduction: 0,
    professionalTax: finalConfig.professionalTaxAmount || 200,
    tdsDeduction: 0,
    
    // Other
    otherDeductions: 0
  };
  
  // Calculate statutory deductions (only if not in probation)
  if (!isProbationary) {
    if (finalConfig.pfEnabled) {
      const basicSalary = grossSalary * 0.5; // Assuming basic is 50% of gross
      deductions.pfDeduction = Math.round(basicSalary * (finalConfig.pfPercentage / 100));
    }
    
    if (finalConfig.esiEnabled && grossSalary <= finalConfig.esiSalaryThreshold) {
      deductions.esiDeduction = Math.round(grossSalary * (finalConfig.esiPercentage / 100));
    }
  }
  
  const totalDeductions = Object.values(deductions).reduce((sum, val) => {
    if (typeof val === 'number') return sum + val;
    return sum;
  }, 0);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 9: Calculate net payable
  // ─────────────────────────────────────────────────────────────────────────
  const netPayable = grossSalary - totalDeductions;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 10: Save salary record with new structure
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
      
      // Probation status
      isProbationary,
      dateOfJoining: employee.personal?.dateOfJoining,
      
      // Days breakdown
      daysInMonth,
      totalWorkingDays,
      daysPresent,
      daysAbsent,
      totalLeavesTaken,
      sickLeavesUsed,
      earnedLeavesUsed,
      specialLeavesUsed,
      sickLeaveAvailable,
      earnedLeaveAvailable,
      excessLeaves: totalExcessLeaves,
      
      // Dates
      sundaysInMonth: sundays.length,
      saturdaysOff: saturdaysOffDates.length,
      publicHolidays: publicHolidayDates.length,
      restrictedHolidays: restrictedHolidayDates.length,
      daysToBePaidFor,
      
      // Hours
      expectedWorkHoursPerDay: finalConfig.dailyWorkHours,
      totalExpectedHours,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      hoursShortfall: Math.round(hoursShortfall * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      
      // 99-hour rule details
      biWeeklyCalculations: biWeeklyPeriods,
      totalHourlyDeduction,
      
      // WFH details
      emergencyWFHDays,
      casualWFHDays,
      
      // Penalties
      missedPunchCount: missedPunches,
      
      // Salary
      salaryOffered: finalConfig.salaryOffered,
      perDaySalary: Math.round(perDaySalary * 100) / 100,
      grossSalary,
      deductions,
      totalDeductions,
      
      // Additions
      additions: {
        attendanceBonus: 0,
        performanceBonus: 0,
        otherAdditions: 0
      },
      totalAdditions: 0,
      
      // Final
      netPayable,
      
      // Status
      status: 'calculated',
      calculatedAt: new Date(),
      calculatedBy,
      
      // Configuration used
      configurationUsed: finalConfig,
      
      // Calculation details
      calculationDetails: {
        config: finalConfig,
        sundays,
        saturdaysOffDates,
        publicHolidayDates,
        restrictedHolidayDates,
        attendanceCount: attendance.length,
        isProbationary
      }
    },
    { new: true, upsert: true, runValidators: true }
  );
  
  return salaryRecord;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALARY CONFIG ENDPOINTS (UPDATED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get salary config for an employee with inheritance
 */
router.get("/config/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const effectiveConfig = await getEffectiveConfig(employeeId);
    
    res.json({ success: true, config: effectiveConfig });
    
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
// NEW: COMPANY CONFIGURATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get company configuration
 */
router.get("/company-config", authenticate, requireAdmin, async (req, res) => {
  try {
    let config = await CompanyConfig.findOne({ isActive: true }).lean();
    
    if (!config) {
      // Create default config
      config = new CompanyConfig();
      await config.save();
      config = config.toObject();
    }
    
    res.json({ success: true, config });
    
  } catch (error) {
    console.error("Get company config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Update company configuration
 */
router.post("/company-config", authenticate, requireAdmin, async (req, res) => {
  try {
    const configData = req.body;
    
    const config = await CompanyConfig.findOneAndUpdate(
      { isActive: true },
      { 
        ...configData,
        lastUpdatedBy: req.user?._id,
        lastUpdatedAt: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json({ success: true, message: "Company config saved", config });
    
  } catch (error) {
    console.error("Save company config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Apply company config to all employees
 */
router.post("/apply-company-config", authenticate, requireAdmin, async (req, res) => {
  try {
    const { overrideExisting = false, department = null } = req.body;
    
    const companyConfig = await CompanyConfig.findOne({ isActive: true }).lean();
    if (!companyConfig) {
      return res.status(404).json({ success: false, message: "Company config not found" });
    }
    
    // Get all active employees
    const filter = { isActive: true };
    if (department) {
      filter["org.department"] = department;
    }
    
    const employees = await Employee.find(filter, { "personal.employeeId": 1 }).lean();
    
    const results = {
      total: employees.length,
      updated: 0,
      skipped: 0,
      errors: []
    };
    
    for (const emp of employees) {
      try {
        const existingConfig = await SalaryConfig.findOne({ employeeId: emp.personal.employeeId });
        
        if (existingConfig && !overrideExisting) {
          results.skipped++;
          continue;
        }
        
        // Create employee config from company defaults
        const employeeConfig = {
          employeeId: emp.personal.employeeId,
          useGlobalSettings: true,
          
          // Copy settings from company config
          dailyWorkHours: companyConfig.attendanceSettings.dailyWorkHours,
          biWeeklyTargetHours: companyConfig.biWeeklyRule.targetHours,
          gracePeriodHours: companyConfig.biWeeklyRule.gracePeriodHours,
          hourlyDeductionRate: companyConfig.biWeeklyRule.deductionPerHour,
          saturdaysOffPattern: companyConfig.saturdaysPattern,
          
          // Leave settings
          sickLeavePerMonth: companyConfig.leavePolicy.sickLeave.perMonth,
          earnedLeavePer20Days: companyConfig.leavePolicy.earnedLeave.per20WorkingDays,
          maxCarryForwardEL: companyConfig.leavePolicy.earnedLeave.maxCarryForward,
          
          // WFH settings
          emergencyWFHDeduction: companyConfig.wfhPolicy.emergencyWFH.deductionPercentage,
          casualWFHDeduction: companyConfig.wfhPolicy.casualWFH.deductionPercentage,
          
          // Penalties
          missedPunchPenalty: companyConfig.disciplinePolicy.missedPunchPenalty,
          
          // Probation
          probationPeriodDays: companyConfig.eligibilityPolicy.probationPeriodDays,
          
          // Bonus
          attendanceBonusAmount: companyConfig.incentives.attendanceBonus.amount,
          attendanceBonusMonths: companyConfig.incentives.attendanceBonus.consecutiveMonths,
          
          // Weekend tiers
          weekendDeductionTiers: companyConfig.leavePolicy.weekendDeductionTiers,
          
          // Statutory
          pfPercentage: companyConfig.statutoryDefaults.pfPercentage,
          esiPercentage: companyConfig.statutoryDefaults.esiPercentage,
          esiSalaryThreshold: companyConfig.statutoryDefaults.esiSalaryThreshold,
          professionalTaxAmount: companyConfig.statutoryDefaults.professionalTax,
          
          // If overriding existing config, keep employee-specific overrides
          ...(existingConfig ? {
            salaryOffered: existingConfig.salaryOffered,
            salaryComponents: existingConfig.salaryComponents,
            bankDetails: existingConfig.bankDetails
          } : {})
        };
        
        await SalaryConfig.findOneAndUpdate(
          { employeeId: emp.personal.employeeId },
          employeeConfig,
          { new: true, upsert: true, runValidators: true }
        );
        
        results.updated++;
        
      } catch (err) {
        results.errors.push({
          employeeId: emp.personal.employeeId,
          error: err.message
        });
      }
    }
    
    res.json({ success: true, results });
    
  } catch (error) {
    console.error("Apply company config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SALARY CALCULATION ENDPOINTS (UPDATED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate salary for a single employee (NEW LOGIC)
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
 * Calculate salary for all employees (NEW LOGIC)
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

// ─────────────────────────────────────────────────────────────────────────────
// SALARY RECORDS ENDPOINTS (UPDATED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get salary records for a month (ENHANCED)
 */
router.get("/records", authenticate, requireAdmin, async (req, res) => {
  try {
    const { month, year, status, department, probationStatus } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year required" });
    }
    
    let query = { month: parseInt(month), year: parseInt(year) };
    if (status) query.status = status;
    if (probationStatus === 'true') query.isProbationary = true;
    if (probationStatus === 'false') query.isProbationary = false;
    
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
    
    // Calculate enhanced summary
    const summary = {
      totalEmployees: records.length,
      probationEmployees: records.filter(r => r.isProbationary).length,
      regularEmployees: records.filter(r => !r.isProbationary).length,
      totalGross: records.reduce((sum, r) => sum + r.grossSalary, 0),
      totalDeductions: records.reduce((sum, r) => sum + r.totalDeductions, 0),
      total99HourDeductions: records.reduce((sum, r) => sum + (r.deductions?.hourlyShortfallDeduction || 0), 0),
      totalWFHDeductions: records.reduce((sum, r) => sum + (r.deductions?.totalWFHDeduction || 0), 0),
      totalPenalties: records.reduce((sum, r) => sum + (r.deductions?.missedPunchPenalty || 0), 0),
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
 * Get single salary record with enhanced details
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
    
    // Get employee details
    const employee = await Employee.findOne(
      { "personal.employeeId": employeeId }
    ).lean();
    
    // Get attendance for the month
    const monthIndex = parseInt(month) - 1;
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const periodStart = new Date(Date.UTC(parseInt(year), monthIndex, 1));
    const periodEnd = new Date(Date.UTC(parseInt(year), monthIndex, daysInMonth, 23, 59, 59, 999));
    
    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: periodStart, $lte: periodEnd }
    }).sort({ date: 1 }).lean();
    
    // Get leaves for the month
    const leaves = await Leave.find({
      employeeId,
      status: "approved",
      startDate: { $lte: periodEnd },
      endDate: { $gte: periodStart }
    }).lean();
    
    res.json({ 
      success: true, 
      record,
      employee: employee || null,
      attendance: attendance || [],
      leaves: leaves || []
    });
    
  } catch (error) {
    console.error("Get record error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Update salary record (for manual adjustments) - ENHANCED
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
    delete updates.configurationUsed;
    
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
 * Add manual adjustment - ENHANCED
 */
router.post("/record/:id/adjustment", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, type, category } = req.body;
    
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
            category: category || 'other',
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
    
    // Recalculate net payable
    record.netPayable = record.grossSalary - record.totalDeductions + record.totalAdditions;
    
    // Add manual adjustments
    if (record.manualAdjustments && record.manualAdjustments.length > 0) {
      record.manualAdjustments.forEach(adj => {
        if (adj.type === 'addition') {
          record.netPayable += adj.amount;
        } else {
          record.netPayable -= adj.amount;
        }
      });
    }
    
    await record.save();
    
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
    const { paymentReference, paymentMode, paymentDate } = req.body;
    
    const record = await SalaryRecord.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paidAt: paymentDate ? new Date(paymentDate) : new Date(),
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
// EXPORT - ENHANCED FOR NEW REQUIREMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export salary records to Excel (ENHANCED)
 */
router.get("/export", authenticate, requireAdmin, async (req, res) => {
  try {
    const { month, year, department } = req.query;
    
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
      "Probation": r.isProbationary ? "Yes" : "No",
      "Days in Month": r.daysInMonth,
      "Working Days": r.totalWorkingDays,
      "Days Present": r.daysPresent,
      "Total Leaves": r.totalLeavesTaken,
      "Sick Leaves Used": r.sickLeavesUsed,
      "Earned Leaves Used": r.earnedLeavesUsed,
      "Excess Leaves": r.excessLeaves || 0,
      "Days to Pay": r.daysToBePaidFor,
      "Expected Hours": r.totalExpectedHours,
      "Hours Worked": r.totalHoursWorked?.toFixed(1),
      "Hours Shortfall": r.hoursShortfall?.toFixed(1),
      "99-Hour Deduction": r.deductions?.hourlyShortfallDeduction || 0,
      "Emergency WFH Days": r.emergencyWFHDays || 0,
      "Casual WFH Days": r.casualWFHDays || 0,
      "WFH Deduction": r.deductions?.totalWFHDeduction || 0,
      "Missed Punches": r.missedPunchCount || 0,
      "Missed Punch Penalty": r.deductions?.missedPunchPenalty || 0,
      "Weekend Deduction": r.deductions?.weekendExcessLeaveDeduction || 0,
      "Salary Offered": r.salaryOffered,
      "Per Day Salary": r.perDaySalary?.toFixed(2),
      "Gross Salary": r.grossSalary,
      "PF Deduction": r.deductions?.pfDeduction || 0,
      "ESI Deduction": r.deductions?.esiDeduction || 0,
      "Professional Tax": r.deductions?.professionalTax || 0,
      "Total Deductions": r.totalDeductions,
      "Net Payable": r.netPayable,
      "Status": r.status
    }));
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Salary");
    
    // Add summary sheet
    const summaryData = [
      ["Salary Summary", monthNames[month - 1], year],
      ["Total Employees", records.length],
      ["Probation Employees", records.filter(r => r.isProbationary).length],
      ["Regular Employees", records.filter(r => !r.isProbationary).length],
      ["Total Gross Salary", records.reduce((sum, r) => sum + r.grossSalary, 0)],
      ["Total 99-Hour Deductions", records.reduce((sum, r) => sum + (r.deductions?.hourlyShortfallDeduction || 0), 0)],
      ["Total WFH Deductions", records.reduce((sum, r) => sum + (r.deductions?.totalWFHDeduction || 0), 0)],
      ["Total Penalties", records.reduce((sum, r) => sum + (r.deductions?.missedPunchPenalty || 0), 0)],
      ["Total Deductions", records.reduce((sum, r) => sum + r.totalDeductions, 0)],
      ["Total Net Payable", records.reduce((sum, r) => sum + r.netPayable, 0)]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    
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
    const { month, year, overrides = {} } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year required" });
    }
    
    // Calculate without saving
    const result = await calculateEmployeeSalary(employeeId, month, year, req.user?._id, overrides);
    
    res.json({ success: true, preview: result });
    
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: CONFIGURATION TEMPLATE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get configuration templates
 */
router.get("/config-templates", authenticate, requireAdmin, async (req, res) => {
  try {
    // Default templates based on department
    const templates = {
      sales: {
        departmentWeightage: {
          revenueWeightage: 80,
          attendanceWeightage: 20
        },
        notes: "Sales team: 80% revenue weightage, 20% attendance"
      },
      operations: {
        departmentWeightage: {
          revenueWeightage: 30,
          attendanceWeightage: 70
        },
        notes: "Operations team: 30% revenue weightage, 70% attendance"
      },
      default: {
        departmentWeightage: {
          revenueWeightage: 50,
          attendanceWeightage: 50
        },
        notes: "Default template"
      }
    };
    
    res.json({ success: true, templates });
    
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Apply template to department
 */
router.post("/apply-template", authenticate, requireAdmin, async (req, res) => {
  try {
    const { department, templateName } = req.body;
    
    if (!department) {
      return res.status(400).json({ success: false, message: "Department required" });
    }
    
    const employees = await Employee.find(
      { "org.department": department, isActive: true },
      { "personal.employeeId": 1 }
    ).lean();
    
    const template = {
      sales: {
        departmentWeightage: { revenueWeightage: 80, attendanceWeightage: 20 }
      },
      operations: {
        departmentWeightage: { revenueWeightage: 30, attendanceWeightage: 70 }
      },
      default: {
        departmentWeightage: { revenueWeightage: 50, attendanceWeightage: 50 }
      }
    };
    
    const selectedTemplate = template[templateName] || template.default;
    
    const results = {
      department,
      total: employees.length,
      updated: 0,
      errors: []
    };
    
    for (const emp of employees) {
      try {
        await SalaryConfig.findOneAndUpdate(
          { employeeId: emp.personal.employeeId },
          { 
            $set: selectedTemplate,
            useDepartmentSettings: true
          },
          { upsert: true }
        );
        results.updated++;
      } catch (err) {
        results.errors.push({
          employeeId: emp.personal.employeeId,
          error: err.message
        });
      }
    }
    
    res.json({ success: true, results });
    
  } catch (error) {
    console.error("Apply template error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;