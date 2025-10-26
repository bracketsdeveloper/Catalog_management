// routes/hrmsRoutes.js
const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const WFH = require("../models/WFH");
const {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  financialProjectionFor,
} = require("../middleware/hrmsAuth");
const XLSX = require("xlsx");

/* ========================= Helpers ========================= */
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}
function toDateOnly(d) {
  const dt = new Date(d);
  if (!isValidDate(dt)) return new Date("Invalid Date");
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
function dayNameOf(d) {
  const dd = new Date(d);
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][dd.getDay()];
}
function isWeekend(d) {
  const day = new Date(d).getDay();
  return day === 0 || day === 6; // Sun / Sat
}
function monthBounds(ym) {
  // ym format: "YYYY-MM"
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}
function rangeToBounds(range, from, to) {
  const now = new Date();
  let start, end;
  switch (range) {
    case "last-3m":
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      end = now;
      break;
    case "last-6m":
      start = new Date(now);
      start.setMonth(now.getMonth() - 6);
      end = now;
      break;
    case "last-1y":
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      end = now;
      break;
    case "custom": {
      start = new Date(from);
      end = new Date(to);
      break;
    }
    case "last-1m":
    default:
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      end = now;
  }
  return { start, end };
}

/* ========================= Employees ========================= */

// CREATE / UPDATE employee (entered by HR only)
router.post(
  "/hrms/employees",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { personal, org, assets, financial } = req.body;
      if (!personal?.employeeId || !personal?.name) {
        return res
          .status(400)
          .json({ message: "employeeId and name are required." });
      }
      const up = await Employee.findOneAndUpdate(
        { "personal.employeeId": personal.employeeId },
        { personal, org, assets, financial },
        { new: true, upsert: true }
      );
      res.json(up);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// LIST with search/filter/sort
router.get(
  "/hrms/employees",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const {
      q,
      role,
      dept,
      active,
      sortBy = "personal.name",
      dir = "asc",
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (q) filter.$text = { $search: q };
    if (role) filter["org.role"] = role;
    if (dept) filter["org.department"] = dept;
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const projection = financialProjectionFor(req.user);
    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: dir === "desc" ? -1 : 1 };

    const [rows, total] = await Promise.all([
      Employee.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Employee.countDocuments(filter),
    ]);
    res.json({ rows, total });
  }
);

// GET single (hide financial for non-superadmins)
router.get(
  "/hrms/employees/:employeeId",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const projection = financialProjectionFor(req.user);
    const emp = await Employee.findOne(
      { "personal.employeeId": req.params.employeeId },
      projection
    );
    if (!emp) return res.status(404).json({ message: "Not found" });
    res.json(emp);
  }
);

/* ========================= Attendance ========================= */

// IMPORT attendance (from external software) - CSV/JSON
router.post(
  "/hrms/attendance/import",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { rows } = req.body;
    if (!Array.isArray(rows))
      return res.status(400).json({ message: "rows[] required" });

    const ops = rows.map((r) => {
      const when = toDateOnly(r.date);
      if (!isValidDate(when)) {
        throw new Error(`Invalid date in import: ${r.date}`);
      }
      return {
        updateOne: {
          filter: { employeeId: r.employeeId, date: when },
          update: { $set: { ...r, date: when } },
          upsert: true,
        },
      };
    });
    await Attendance.bulkWrite(ops);
    res.json({ imported: rows.length });
  }
);

// BULK MARK ATTENDANCE (Present/Leave/WFH) for a given date
// Body: { date: "YYYY-MM-DD", records: [{ employeeId, status: "Present"|"Leave"|"WFH" }] }
router.post(
  "/hrms/attendance/bulk",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { date, records } = req.body || {};
    if (!date)
      return res
        .status(400)
        .json({ message: "date is required (YYYY-MM-DD)" });
    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ message: "records[] required" });
    }

    const when = toDateOnly(date);
    if (!isValidDate(when)) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    const dayName = dayNameOf(when);
    const weekend = isWeekend(when);
    const approvedBy = req.user?.id || req.user?._id || undefined;

    // Validate employees quickly (optional)
    const ids = records.map((r) => r.employeeId).filter(Boolean);
    const existing = await Employee.find(
      { "personal.employeeId": { $in: ids } },
      { "personal.employeeId": 1 }
    ).lean();
    const existingSet = new Set(existing.map((e) => e.personal.employeeId));
    const invalid = ids.filter((id) => !existingSet.has(id));
    if (invalid.length) {
      return res
        .status(400)
        .json({ message: `Unknown employeeId(s): ${invalid.join(", ")}` });
    }

    // Attendance ops
    const attendanceOps = [];
    for (const r of records) {
      const status = (r.status || "Present").trim();
      let payload = {
        employeeId: r.employeeId,
        date: when,
        dayName,
        isWeekend: weekend,
        isHoliday: false,
        note: "",
      };

      if (status === "Present") {
        payload = { ...payload, hours: 8, login: "", logout: "", note: "Present" };
      } else if (status === "Leave") {
        payload = { ...payload, hours: 0, login: "", logout: "", note: "Leave" };
      } else if (status === "WFH") {
        payload = { ...payload, hours: 8, login: "", logout: "", note: "WFH" };
      } else {
        payload = { ...payload, hours: 8, login: "", logout: "", note: status || "Present" };
      }

      attendanceOps.push({
        updateOne: {
          filter: { employeeId: r.employeeId, date: when },
          update: { $set: payload },
          upsert: true,
        },
      });
    }
    if (attendanceOps.length) await Attendance.bulkWrite(attendanceOps);

    // WFH ops
    const wfhOps = records
      .filter((r) => (r.status || "Present").trim() === "WFH")
      .map((r) => ({
        updateOne: {
          filter: { employeeId: r.employeeId, date: when },
          update: {
            $set: {
              employeeId: r.employeeId,
              date: when,
              reason: "Marked via bulk",
              ...(approvedBy ? { approvedBy } : {}),
            },
          },
          upsert: true,
        },
      }));
    if (wfhOps.length) await WFH.bulkWrite(wfhOps);

    res.json({ saved: records.length, date: when });
  }
);

// ATTENDANCE SUMMARY + TABLE
router.get(
  "/hrms/attendance/:employeeId",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { range = "last-1m", from, to } = req.query;

    let { start, end } = rangeToBounds(range, from, to);

    if (range === "custom") {
      if (!from || !to) {
        return res
          .status(400)
          .json({ message: "from and to are required for custom range" });
      }
    }
    if (!isValidDate(start) || !isValidDate(end)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const rows = await Attendance.find({
      employeeId: req.params.employeeId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const daysWorked = rows.filter((r) => r.hours > 0 && !r.isHoliday).length;
    const totalHours = rows.reduce((s, r) => s + (r.hours || 0), 0);
    const totalDays = rows.length;
    const holidays = rows.filter((r) => r.isHoliday).length;
    const weekends = rows.filter((r) => r.isWeekend).length;

    res.json({
      range: { start, end },
      summary: { daysWorked, totalDays, totalHours, holidays, weekends },
      rows,
    });
  }
);

// EXPORT attendance to Excel
router.get(
  "/hrms/attendance/:employeeId/export",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const rows = await Attendance.find({
      employeeId: req.params.employeeId,
    }).sort({ date: 1 });

    const aoa = [
      [
        "Date",
        "Day",
        "Login",
        "Logout",
        "# of hours",
        "Holiday?",
        "Weekend?",
        "Note",
      ],
    ].concat(
      rows.map((r) => [
        r.date.toISOString().slice(0, 10),
        r.dayName || "",
        r.login || "",
        r.logout || "",
        r.hours || 0,
        r.isHoliday ? "Yes" : "No",
        r.isWeekend ? "Yes" : "No",
        r.note || "",
      ])
    );
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_${req.params.employeeId}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buf);
  }
);

/* ========================= Leaves ========================= */

// List pre-approved
router.get(
  "/hrms/leaves/:employeeId",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const rows = await Leave.find({
      employeeId: req.params.employeeId,
    }).sort({ startDate: -1 });
    res.json(rows);
  }
);

// Create leave
router.post("/hrms/leaves", authenticate, requireAdmin, async (req, res) => {
  const { employeeId, type, startDate, endDate, purpose } = req.body;
  if (!employeeId || !type || !startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "employeeId, type, startDate, endDate required" });
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!isValidDate(start) || !isValidDate(end)) {
    return res.status(400).json({ message: "Invalid start/end date" });
  }
  const days = Math.max(
    1,
    Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
  );
  const leave = await Leave.create({
    employeeId,
    type,
    startDate: start,
    endDate: end,
    days,
    purpose,
    requestedBy: req.user?._id || req.user?.id,
  });
  // TODO: send mail to super admins for approval
  res.status(201).json(leave);
});

// Approve/reject
router.patch(
  "/hrms/leaves/:id/decision",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { status } = req.body; // approved | rejected
    const up = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, approvedBy: req.user?._id || req.user?.id },
      { new: true }
    );
    res.json(up);
  }
);

/* ========================= WFH ========================= */
router.get("/hrms/wfh", authenticate, requireAdmin, async (req, res) => {
  const { date } = req.query;
  const filter = {};
  if (date) {
    const d = toDateOnly(date);
    if (!isValidDate(d)) {
      return res.status(400).json({ message: "Invalid date" });
    }
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    filter.date = { $gte: d, $lt: next };
  }
  const rows = await WFH.find(filter).sort({ date: -1 });
  res.json({ rows }); // consistent shape
});

router.post("/hrms/wfh", authenticate, requireAdmin, async (req, res) => {
  const { employeeId, date, reason } = req.body;
  if (!employeeId || !date)
    return res
      .status(400)
      .json({ message: "employeeId and date required" });
  const when = toDateOnly(date);
  if (!isValidDate(when)) {
    return res.status(400).json({ message: "Invalid date" });
  }
  const row = await WFH.findOneAndUpdate(
    { employeeId, date: when },
    {
      $set: {
        employeeId,
        date: when,
        reason,
        approvedBy: req.user?._id || req.user?.id,
      },
    },
    { new: true, upsert: true }
  );
  res.json(row);
});

/* ========================= Salary Engine ========================= */

// Helper: count leaves by type in a period
async function countLeaves(employeeId, start, end) {
  const rows = await Leave.find({
    employeeId,
    status: "approved",
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  const sum = (type) =>
    rows.filter((r) => r.type === type).reduce((s, r) => s + r.days, 0);
  return {
    earned: sum("earned"),
    sick: sum("sick"),
    additional: sum("additional"),
    special: sum("special"),
  };
}

// Salary rules implementation (monthly OR cumulative)
router.get(
  "/hrms/salary/calc",
  authenticate,
  requireAdmin,
  async (req, res) => {
    const { mode = "monthly", month, from, to, range = "last-1m" } = req.query;

    let start, end;

    if (mode === "monthly") {
      const ym = month || new Date().toISOString().slice(0, 7);
      ({ start, end } = monthBounds(ym));
    } else {
      // cumulative: support quick ranges OR custom
      if (range === "custom") {
        if (!from || !to) {
          return res
            .status(400)
            .json({ message: "from and to are required for custom cumulative range" });
        }
        start = new Date(from);
        end = new Date(to);
      } else {
        ({ start, end } = rangeToBounds(range, from, to));
      }
    }

    if (!isValidDate(start) || !isValidDate(end)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const employees = await Employee.find(
      { isActive: true },
      financialProjectionFor(req.user)
    );

    const rows = [];
    for (const emp of employees) {
      const id = emp.personal.employeeId;
      const att = await Attendance.find({
        employeeId: id,
        date: { $gte: start, $lte: end },
      });

      const workingDays = att.filter((a) => !a.isHoliday).length;
      const daysWorked = att.filter((a) => a.hours > 0 && !a.isHoliday).length;
      const totalHours = att.reduce((s, a) => s + (a.hours || 0), 0);

      const lv = await countLeaves(id, start, end);
      const absentDays = Math.max(0, workingDays - daysWorked);

      let salaryDeductionDays = 0;
      let sickToAdd = 0;
      let additionalToAdd = 0;
      let earnedToAdd = 0;

      if (absentDays === 0) {
        earnedToAdd = 1.25;
      } else if (absentDays === 1) {
        sickToAdd = 1;
      } else if (absentDays >= 2) {
        sickToAdd = 1;
        additionalToAdd = absentDays - 1;
        salaryDeductionDays = 1;
      }

      rows.push({
        employeeId: id,
        name: emp.personal.name,
        role: emp.org.role,
        department: emp.org.department,
        workingDays,
        daysWorked,
        totalHours,
        existingLeaves: lv,
        allocation: { earnedToAdd, sickToAdd, additionalToAdd },
        salary: {
          mode,
          month:
            mode === "monthly"
              ? `${start.getFullYear()}-${String(
                  start.getMonth() + 1
                ).padStart(2, "0")}`
              : undefined,
          salaryDeductionDays,
          remarks:
            salaryDeductionDays > 0
              ? `${salaryDeductionDays} day(s) salary deduction per policy`
              : "Full pay",
        },
      });
    }

    res.json({ range: { start, end }, rows });
  }
);

// Persist earned-leave accrual
router.post(
  "/hrms/salary/finalize",
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    const { rows, periodLabel } = req.body;
    const inserts = [];
    for (const r of rows) {
      const e = r.allocation?.earnedToAdd || 0;
      if (e > 0) {
        const startDate = new Date();
        const endDate = new Date();
        inserts.push({
          employeeId: r.employeeId,
          type: "earned",
          startDate,
          endDate,
          days: e,
          purpose: `Auto accrual (${periodLabel || "period"})`,
          status: "approved",
        });
      }
    }
    if (inserts.length) await Leave.insertMany(inserts);
    res.json({ creditedEarnedLeaves: inserts.length });
  }
);

module.exports = router;
