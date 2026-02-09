const express = require("express");
const router = express.Router();

const { authenticate, requireAdmin } = require("../middleware/hrmsAuth");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const RestrictedHolidayRequest = require("../models/RestrictedHolidayRequest");
const SalaryRecord = require("../models/SalaryRecord");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseDateString(dateString) {
  if (!dateString) return new Date();
  const parts = String(dateString).split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  const d = new Date(dateString);
  return d;
}

function toISODate(d) {
  return new Date(d).toISOString().split("T")[0];
}

function clamp2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeStatus(s) {
  return String(s || "").trim().toLowerCase();
}

function isSpecialLeaveFromAttendance(att) {
  return !!att?.specialLeaveType;
}

function getHoursForAttendance(att, expectedHoursPerDay) {
  if (!att) return 0;

  // special leave = fixed 9h
  if (isSpecialLeaveFromAttendance(att)) return expectedHoursPerDay;

  const status = normalizeStatus(att.status);
  const hoursWorked = Number(att.hoursWorked || 0);

  if (status.includes("½present") || status.includes("half") || status.includes("0.5")) {
    return expectedHoursPerDay * 0.5;
  }

  // Prefer stored hours if present
  if (hoursWorked > 0) return hoursWorked;

  // If present/wfh/weeklyoff present but hours missing -> assume full day hours
  if (status.includes("present") || status.includes("wfh") || (status.includes("weeklyoff") && status.includes("present"))) {
    return expectedHoursPerDay;
  }

  return 0;
}

// Sunday compliance: if payable working days in a week >= 3, Sunday is payable
function computePaidSunday(weekDates, payableWorkingDaysCount) {
  if (payableWorkingDaysCount < 3) return 0;
  const hasSunday = weekDates.some((d) => new Date(d).getUTCDay() === 0);
  return hasSunday ? 1 : 0;
}

// ISO week (Mon-Sun) splitting inside a period
function splitIntoIsoWeeks(periodStart, periodEnd) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // Normalize to UTC midnight
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  const weeks = [];
  let cursor = new Date(start);

  // move cursor to Monday of its week
  const day = cursor.getUTCDay(); // Sun=0..Sat=6
  const deltaToMonday = (day === 0 ? -6 : 1 - day);
  cursor.setUTCDate(cursor.getUTCDate() + deltaToMonday);

  while (cursor <= end) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    // Clamp week to period
    const clampedStart = new Date(Math.max(weekStart.getTime(), start.getTime()));
    const clampedEnd = new Date(Math.min(weekEnd.getTime(), end.getTime()));

    weeks.push({ weekStart: clampedStart, weekEnd: clampedEnd });

    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return weeks;
}

// Saturday off pattern
function isSaturdayOffByPattern(dateObj, pattern = "1st_3rd") {
  if (dateObj.getUTCDay() !== 6) return false; // Saturday
  const p = String(pattern || "1st_3rd").toLowerCase();
  if (p === "all") return true;
  if (p === "none") return false;

  const dayOfMonth = dateObj.getUTCDate();
  const weekIndex = Math.floor((dayOfMonth - 1) / 7) + 1; // 1..5

  if (p === "1st_3rd") return weekIndex === 1 || weekIndex === 3;
  if (p === "2nd_4th") return weekIndex === 2 || weekIndex === 4;

  return weekIndex === 1 || weekIndex === 3;
}

function isWeeklyOffByPolicy(dateObj, saturdaysPattern) {
  const dow = dateObj.getUTCDay();
  if (dow === 0) return true; // Sunday
  if (dow === 6 && isSaturdayOffByPattern(dateObj, saturdaysPattern)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetch helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getHolidaysInRange(startDate, endDate) {
  return Holiday.find({ date: { $gte: startDate, $lte: endDate } }).lean();
}

async function getAttendanceInRange(employeeId, startDate, endDate) {
  return Attendance.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate }
  }).lean();
}

async function getApprovedLeavesInRange(employeeId, startDate, endDate) {
  return Leave.find({
    employeeId,
    status: "approved",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  }).lean();
}

async function getApprovedRHRequestsInRange(employeeId, userId, startDate, endDate) {
  return RestrictedHolidayRequest.find({
    $or: [{ employeeId }, { userId }],
    status: "approved",
    holidayDate: { $gte: startDate, $lte: endDate }
  }).lean();
}

function expandLeaveDates(approvedLeaves) {
  const set = new Set();
  for (const leave of approvedLeaves || []) {
    const s = new Date(leave.startDate);
    const e = new Date(leave.endDate);
    s.setUTCHours(0, 0, 0, 0);
    e.setUTCHours(0, 0, 0, 0);
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      set.add(toISODate(d));
    }
  }
  return set;
}

function buildHolidayMaps(holidays, approvedRHRequests) {
  const publicSet = new Set();
  const restrictedByDate = new Map(); // date -> holiday
  const restrictedIdsApproved = new Set((approvedRHRequests || []).map((r) => String(r.holidayId)));

  for (const h of holidays || []) {
    const iso = toISODate(h.date);
    const type = String(h.type || "").toUpperCase();
    if (type === "PUBLIC") publicSet.add(iso);
    if (type === "RESTRICTED") {
      // include ONLY if approved for employee (policy: RH is working unless approved request)
      if (restrictedIdsApproved.has(String(h._id))) {
        restrictedByDate.set(iso, h);
      }
    }
  }

  return { publicSet, restrictedByDate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core salary computation
// ─────────────────────────────────────────────────────────────────────────────

function computeSalaryForEmployee({
  employee,
  attendance,
  holidays,
  approvedLeaves,
  approvedRHRequests,
  periodStart,
  periodEnd,
  expectedHoursPerDay = 9,
  saturdaysPattern = "1st_3rd",
  salaryOffered = 0,
  pfTaxDeduction = 0,
  incentive = 0,
  bonus = 0,
  damages = 0,
  advanceRecovery = 0
}) {
  const leaveDates = expandLeaveDates(approvedLeaves);
  const { publicSet: publicHolidayDates, restrictedByDate: approvedRestrictedHolidayByDate } =
    buildHolidayMaps(holidays, approvedRHRequests);

  // map attendance by date
  const attByDate = new Map();
  for (const a of attendance || []) {
    attByDate.set(toISODate(a.date), a);
  }

  // build all dates in period
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  const allDates = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    allDates.push(new Date(d));
  }

  // weekly breakdown
  const weeks = splitIntoIsoWeeks(start, end).map((w) => ({
    weekStart: w.weekStart,
    weekEnd: w.weekEnd,
    expectedHours: 0,
    actualHours: 0,
    missedHours: 0,
    hourlyDeduction: 0,
    payableWorkingDays: 0,
    paidSundays: 0,
    notes: ""
  }));

  const weekIndexForDate = (dateObj) => {
    const t = dateObj.getTime();
    for (let i = 0; i < weeks.length; i++) {
      if (t >= weeks[i].weekStart.getTime() && t <= weeks[i].weekEnd.getTime()) return i;
    }
    return -1;
  };

  let totalExpectedHours = 0;
  let totalActualHours = 0;

  // Payable days logic
  // - PUBLIC holiday payable
  // - Approved leave payable (as per your earlier approach)
  // - Approved RH payable (employee requested)
  // - Saturday off by pattern: payable weekly off
  // - Sunday payable only if >=3 payable working-days in that week
  // - Working days payable if attended (present/wfh/half/special) OR has approved leave
  let payableDays = 0;

  // First pass: compute week expected/actual + working day pay counts
  for (const dateObj of allDates) {
    const iso = toISODate(dateObj);
    const wi = weekIndexForDate(dateObj);
    const isWeeklyOff = isWeeklyOffByPolicy(dateObj, saturdaysPattern);

    const isPublicHoliday = publicHolidayDates.has(iso);
    const isApprovedRH = approvedRestrictedHolidayByDate.has(iso);
    const isOnLeave = leaveDates.has(iso);

    // Working day definition for expected-hours:
    // not weekly off, not public holiday, not approved RH, not leave
    const isWorkingDayForExpected = !isWeeklyOff && !isPublicHoliday && !isApprovedRH && !isOnLeave;

    const att = attByDate.get(iso);
    const status = normalizeStatus(att?.status);
    const hasPaidAttendance =
      isSpecialLeaveFromAttendance(att) ||
      status.includes("present") ||
      status.includes("wfh") ||
      status.includes("½present") ||
      status.includes("half") ||
      status.includes("0.5") ||
      (status.includes("weeklyoff") && status.includes("present"));

    if (isWorkingDayForExpected) {
      totalExpectedHours += expectedHoursPerDay;
      if (wi >= 0) weeks[wi].expectedHours += expectedHoursPerDay;
    }

    // actual hours counted only on working days for expected comparison
    if (isWorkingDayForExpected) {
      const h = getHoursForAttendance(att, expectedHoursPerDay);
      totalActualHours += h;
      if (wi >= 0) weeks[wi].actualHours += h;

      // payableWorkingDays counts only working days that are payable due to attendance (or leave)
      if (hasPaidAttendance) {
        if (wi >= 0) weeks[wi].payableWorkingDays += 1;
      }
    }

    // Payable days:
    if (isPublicHoliday || isApprovedRH || isOnLeave) {
      payableDays += 1;
      continue;
    }

    // Saturday off payable always (weekly off)
    if (dateObj.getUTCDay() === 6 && isSaturdayOffByPattern(dateObj, saturdaysPattern)) {
      payableDays += 1;
      continue;
    }

    // Working day payable if has paid attendance
    if (!isWeeklyOff && !isPublicHoliday && !isApprovedRH && !isOnLeave) {
      if (hasPaidAttendance) payableDays += 1;
      continue;
    }

    // Sunday handled in second pass (compliance rule)
  }

  // Second pass: Sunday compliance payment per week
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];

    // collect dates in this week
    const weekDates = [];
    for (let d = new Date(w.weekStart); d <= w.weekEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      weekDates.push(new Date(d));
    }

    const paidSunday = computePaidSunday(weekDates, w.payableWorkingDays);
    if (paidSunday) {
      // Count ONLY if that Sunday is inside the pay period and not already counted by holiday/leave
      const sunday = weekDates.find((d) => d.getUTCDay() === 0);
      if (sunday) {
        const iso = toISODate(sunday);
        const isPublicHoliday = publicHolidayDates.has(iso);
        const isApprovedRH = approvedRestrictedHolidayByDate.has(iso);
        const isOnLeave = leaveDates.has(iso);

        // don't double count if already payable
        if (!isPublicHoliday && !isApprovedRH && !isOnLeave) {
          payableDays += 1;
          w.paidSundays = 1;
          w.notes = "Sunday paid (>=3 working days attended in week)";
        }
      }
    }

    // weekly deduction
    w.expectedHours = clamp2(w.expectedHours);
    w.actualHours = clamp2(w.actualHours);

    w.missedHours = clamp2(Math.max(0, w.expectedHours - w.actualHours));
    const missedRounded = Math.ceil(w.missedHours);
    w.hourlyDeduction = missedRounded * 500;
  }

  totalExpectedHours = clamp2(totalExpectedHours);
  totalActualHours = clamp2(totalActualHours);
  const totalMissed = clamp2(Math.max(0, totalExpectedHours - totalActualHours));
  const totalHourlyDeduction = weeks.reduce((s, w) => s + Number(w.hourlyDeduction || 0), 0);

  // Gross salary: prorate from salaryOffered based on payableDays out of calendar days in period
  const totalCalendarDays = allDates.length || 1;
  const perDay = Number(salaryOffered || 0) / totalCalendarDays;
  const grossSalary = clamp2(perDay * payableDays);

  const takeHome = clamp2(
    grossSalary
      - Number(totalHourlyDeduction || 0)
      - Number(pfTaxDeduction || 0)
      - Number(damages || 0)
      - Number(advanceRecovery || 0)
      + Number(incentive || 0)
      + Number(bonus || 0)
  );

  return {
    employeeId: employee?.personal?.employeeId,
    employeeName: employee?.personal?.name || "",
    department: employee?.org?.department || "",
    role: employee?.org?.role || "",

    periodStart: start,
    periodEnd: end,

    salaryOffered: Number(salaryOffered || 0),
    payableDays: clamp2(payableDays),
    grossSalary,

    expectedHours: totalExpectedHours,
    actualHours: totalActualHours,
    missedHours: totalMissed,

    hourlyDeduction: totalHourlyDeduction,

    pfTaxDeduction: Number(pfTaxDeduction || 0),
    incentive: Number(incentive || 0),
    bonus: Number(bonus || 0),
    damages: Number(damages || 0),
    advanceRecovery: Number(advanceRecovery || 0),

    takeHome,
    weeks
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PREVIEW salary for one employee or all employees
 * GET /salary/preview?startDate=2026-02-01&endDate=2026-02-14&employeeId=EMP001
 */
router.get("/preview", authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }

    const periodStart = parseDateString(startDate);
    const periodEnd = parseDateString(endDate);
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    const empFilter = { isActive: true };
    if (employeeId) empFilter["personal.employeeId"] = String(employeeId);

    const employees = await Employee.find(empFilter, {
      personal: 1,
      org: 1,
      schedule: 1,
      mappedUser: 1
    }).lean();

    const holidays = await getHolidaysInRange(periodStart, periodEnd);

    const results = [];

    for (const emp of employees) {
      const empId = emp?.personal?.employeeId;
      if (!empId) continue;

      const attendance = await getAttendanceInRange(empId, periodStart, periodEnd);
      const approvedLeaves = await getApprovedLeavesInRange(empId, periodStart, periodEnd);
      const approvedRHRequests = await getApprovedRHRequestsInRange(
        empId,
        emp.mappedUser,
        periodStart,
        periodEnd
      );

      const saturdaysPattern =
        emp?.schedule?.saturdaysOffPattern ||
        emp?.schedule?.saturdaysPattern ||
        "1st_3rd";

      const expectedHoursPerDay = 9;

      // Salary offered: pick from employee.salaryConfig if you have it; fallback 0
      const salaryOffered = Number(emp?.salary?.offered || emp?.org?.salaryOffered || 0);

      const computed = computeSalaryForEmployee({
        employee: emp,
        attendance,
        holidays,
        approvedLeaves,
        approvedRHRequests,
        periodStart,
        periodEnd,
        expectedHoursPerDay,
        saturdaysPattern,
        salaryOffered,
        pfTaxDeduction: 0,
        incentive: 0,
        bonus: 0,
        damages: 0,
        advanceRecovery: 0
      });

      results.push(computed);
    }

    res.json({
      success: true,
      startDate: toISODate(periodStart),
      endDate: toISODate(periodEnd),
      count: results.length,
      results
    });
  } catch (error) {
    console.error("Salary preview error:", error);
    res.status(500).json({ success: false, message: "Error generating salary preview", error: error.message });
  }
});

/**
 * GENERATE (save) salary records
 * POST /salary/generate
 * body: { startDate, endDate, employeeId?, overrides? }
 */
router.post("/generate", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      employeeId,
      frequency = "custom",
      overrides = {} // { salaryOffered, pfTaxDeduction, incentive, bonus, damages, advanceRecovery }
    } = req.body || {};

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required" });
    }

    const periodStart = parseDateString(startDate);
    const periodEnd = parseDateString(endDate);
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    const empFilter = { isActive: true };
    if (employeeId) empFilter["personal.employeeId"] = String(employeeId);

    const employees = await Employee.find(empFilter, {
      personal: 1,
      org: 1,
      schedule: 1,
      mappedUser: 1
    }).lean();

    const holidays = await getHolidaysInRange(periodStart, periodEnd);

    const saved = [];
    const skipped = [];

    for (const emp of employees) {
      const empId = emp?.personal?.employeeId;
      if (!empId) continue;

      const attendance = await getAttendanceInRange(empId, periodStart, periodEnd);
      const approvedLeaves = await getApprovedLeavesInRange(empId, periodStart, periodEnd);
      const approvedRHRequests = await getApprovedRHRequestsInRange(empId, emp.mappedUser, periodStart, periodEnd);

      const saturdaysPattern =
        emp?.schedule?.saturdaysOffPattern ||
        emp?.schedule?.saturdaysPattern ||
        "1st_3rd";

      const expectedHoursPerDay = 9;

      const baseSalaryOffered = Number(emp?.salary?.offered || emp?.org?.salaryOffered || 0);

      const computed = computeSalaryForEmployee({
        employee: emp,
        attendance,
        holidays,
        approvedLeaves,
        approvedRHRequests,
        periodStart,
        periodEnd,
        expectedHoursPerDay,
        saturdaysPattern,

        salaryOffered: Number(overrides.salaryOffered ?? baseSalaryOffered),
        pfTaxDeduction: Number(overrides.pfTaxDeduction ?? 0),
        incentive: Number(overrides.incentive ?? 0),
        bonus: Number(overrides.bonus ?? 0),
        damages: Number(overrides.damages ?? 0),
        advanceRecovery: Number(overrides.advanceRecovery ?? 0)
      });

      try {
        const doc = await SalaryRecord.findOneAndUpdate(
          { employeeId: computed.employeeId, periodStart: computed.periodStart, periodEnd: computed.periodEnd },
          {
            $set: {
              ...computed,
              frequency,
              meta: { createdBy: req.user?._id, note: "" }
            }
          },
          { new: true, upsert: true }
        );
        saved.push(doc);
      } catch (e) {
        // duplicate unique index can happen with race; just skip
        skipped.push({ employeeId: empId, reason: e.message });
      }
    }

    res.json({
      success: true,
      savedCount: saved.length,
      skippedCount: skipped.length,
      saved,
      skipped
    });
  } catch (error) {
    console.error("Salary generate error:", error);
    res.status(500).json({ success: false, message: "Error generating salary records", error: error.message });
  }
});

/**
 * LIST salary records
 * GET /salary/records?startDate=...&endDate=...
 */
router.get("/records", authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, employeeId, page = 1, limit = 50 } = req.query;

    const query = {};
    if (employeeId) query.employeeId = String(employeeId);

    if (startDate && endDate) {
      const s = parseDateString(startDate);
      const e = parseDateString(endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        query.periodStart = { $gte: s };
        query.periodEnd = { $lte: e };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rows, total] = await Promise.all([
      SalaryRecord.find(query).sort({ periodStart: -1, employeeName: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      SalaryRecord.countDocuments(query)
    ]);

    res.json({
      success: true,
      rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Salary records error:", error);
    res.status(500).json({ success: false, message: "Error fetching salary records", error: error.message });
  }
});

/**
 * UPDATE record adjustments
 * PATCH /salary/records/:id
 * body: { pfTaxDeduction, incentive, bonus, damages, advanceRecovery, metaNote }
 */
router.patch("/records/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      salaryOffered,
      pfTaxDeduction,
      incentive,
      bonus,
      damages,
      advanceRecovery,
      metaNote
    } = req.body || {};

    const rec = await SalaryRecord.findById(id);
    if (!rec) return res.status(404).json({ success: false, message: "Record not found" });

    if (salaryOffered !== undefined) rec.salaryOffered = Number(salaryOffered || 0);
    if (pfTaxDeduction !== undefined) rec.pfTaxDeduction = Number(pfTaxDeduction || 0);
    if (incentive !== undefined) rec.incentive = Number(incentive || 0);
    if (bonus !== undefined) rec.bonus = Number(bonus || 0);
    if (damages !== undefined) rec.damages = Number(damages || 0);
    if (advanceRecovery !== undefined) rec.advanceRecovery = Number(advanceRecovery || 0);
    if (metaNote !== undefined) rec.meta = { ...(rec.meta || {}), note: String(metaNote || "") };

    // recompute takeHome (weekly calc stays same)
    rec.takeHome =
      Number(rec.grossSalary || 0)
      - Number(rec.hourlyDeduction || 0)
      - Number(rec.pfTaxDeduction || 0)
      - Number(rec.damages || 0)
      - Number(rec.advanceRecovery || 0)
      + Number(rec.incentive || 0)
      + Number(rec.bonus || 0);

    await rec.save();

    res.json({ success: true, record: rec });
  } catch (error) {
    console.error("Salary patch error:", error);
    res.status(500).json({ success: false, message: "Error updating salary record", error: error.message });
  }
});

module.exports = router;
