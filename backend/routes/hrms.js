// server/routes/hrms.js
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const mongoose = require("mongoose");
const { isValidObjectId } = mongoose;

const path = require("node:path");
const fs = require("node:fs");
const multer = require("multer");

const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const WFH = require("../models/WFH");
const User = require("../models/User");
const {
  notifyLeaveApplication,
  notifyLeaveStatusChange,
} = require("../utils/leaveNotifications");

// Holidays + RH request
const Holiday = require("../models/Holiday");
const RestrictedHolidayRequest = require("../models/RestrictedHolidayRequest");

const {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
  financialProjectionFor,
} = require("../middleware/hrmsAuth");

const XLSX = require("xlsx");

/* ========================= Upload dir / multer ========================= */
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "attendance_tmp");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const base = file.originalname.replace(/\s+/g, "_");
      cb(null, `${ts}_${base}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx?|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only .xls, .xlsx, .csv allowed"), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

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
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dd.getDay()];
}
function isWeekend(d) {
  const day = new Date(d).getDay();
  return day === 0 || day === 6;
}
function monthBounds(ym) {
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

/** Robust user id extractor (handles varied auth middlewares) */
function getUserId(req) {
  return (
    req?.user?._id ||
    req?.user?.id ||
    req?.userId ||
    req?.auth?.userId ||
    req?.auth?.id ||
    null
  );
}

/** Hardening: derive req.user from Authorization Bearer if upstream didn't attach it */
function ensureAuthUser(req, res, next) {
  if (getUserId(req)) return next();
  const auth = req.headers?.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || null;
    const payload = secret ? jwt.verify(token, secret) : jwt.decode(token);
    const uid = payload?.id || payload?._id || payload?.userId || payload?.sub || null;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });
    req.user = { _id: uid };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

/** Find employeeId for a given userId (mappedUser) */
async function employeeIdForUserId(userId) {
  if (!userId) return null;
  const emp = await Employee.findOne({ mappedUser: userId }, { "personal.employeeId": 1 }).lean();
  return emp?.personal?.employeeId || null;
}

function getCalendarYearBounds(d = new Date()) {
  const y = d.getFullYear();
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59, 999) };
}

/* ===== Extra helpers for file import ===== */
function normalizeHeader(h) {
  return String(h || "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] != null) out[k] = obj[k];
  return out;
}

// Accepts "09:32", "9:32", "09:32:10", "9:32 AM", "18:03", "18.03", numeric excel fractions etc.
function parseTimeToMinutes(raw) {
  if (raw == null || raw === "") return null;
  let s = String(raw).trim();

  // numeric Excel fraction of day
  if (!isNaN(+s) && s !== "") {
    const n = +s;
    if (n >= 0 && n <= 1) {
      return Math.round(n * 24 * 60);
    }
  }

  s = s.replace(/\./g, ":");
  const ampmMatch = /\b(am|pm)\b/i.test(s);
  const parts = String(s).replace(/[^0-9a-z: ]/gi, "").split(/[:\s]/).filter(Boolean);
  let [hh, mm] = parts;
  if (hh == null || mm == null) return null;

  let H = parseInt(hh, 10);
  const M = parseInt(mm, 10) || 0;
  if (isNaN(H) || isNaN(M)) return null;

  if (ampmMatch) {
    const isPM = /pm/i.test(s);
    const isAM = /am/i.test(s);
    if (isPM && H < 12) H += 12;
    if (isAM && H === 12) H = 0;
  }

  if (H < 0 || H > 23 || M < 0 || M > 59) return null;
  return H * 60 + M;
}

function parseExcelDateCell(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return v;
  if (!isNaN(+v) && +v > 0) {
    try {
      const dec = XLSX.SSF.parse_date_code(+v);
      if (dec) {
        return new Date(Date.UTC(dec.y, dec.m - 1, dec.d));
      }
    } catch {}
  }
  const d = new Date(String(v));
  if (!isNaN(d)) return d;
  const m = String(v).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = +m[1],
      mm = +m[2],
      yy = +m[3];
    const Y = yy < 100 ? 2000 + yy : yy;
    const dt = new Date(Y, mm - 1, dd);
    if (!isNaN(dt)) return dt;
  }
  return null;
}

async function isHolidayDate(d) {
  const sameDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sameDayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const h = await Holiday.findOne({ date: { $gte: sameDayStart, $lte: sameDayEnd } }).lean();
  return !!h;
}

/* =======================================================================
   FIX: Never mix include/exclude in a Mongo projection
   ======================================================================= */
function buildSafeEmployeeProjection(req, includeFields = {}) {
  const finProj = financialProjectionFor(req.user) || {};
  const isExclusion = Object.values(finProj).some((v) => v === 0);

  // If exclusion projection, do not add includes (would mix include + exclude)
  if (isExclusion) return finProj;

  // Include-based: safe to add includeFields
  return { ...finProj, ...includeFields };
}

/* ========================= Leave Allocation helpers ========================= */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildDefaultLeaveMonthlyAllocation() {
  return MONTHS.map((m) => ({ month: m, earned: 0, sick: 0, additional: 0, special: 0 }));
}

function normalizeLeaveMonthlyAllocation(input) {
  const base = buildDefaultLeaveMonthlyAllocation();

  // Allow unset/empty -> default
  if (!Array.isArray(input) || input.length === 0) return base;

  const allowedMonths = new Set(MONTHS);
  const map = new Map(input.map((x) => [String(x?.month || "").trim(), x]));

  // ensure only valid months; duplicates naturally overwritten by map; we explicitly reject duplicates:
  const seen = new Set();
  for (const row of input) {
    const m = String(row?.month || "").trim();
    if (!allowedMonths.has(m)) {
      throw new Error(`Invalid month in leaveMonthlyAllocation: ${m || "(empty)"}`);
    }
    if (seen.has(m)) {
      throw new Error(`Duplicate month in leaveMonthlyAllocation: ${m}`);
    }
    seen.add(m);
  }

  // enforce all 12 months (your current UI always sends 12)
  if (seen.size !== 12) {
    throw new Error("leaveMonthlyAllocation must contain all 12 months (Jan..Dec).");
  }

  const n = (v) => (Number.isFinite(+v) ? Math.max(0, +(+v).toFixed(2)) : 0);

  return base.map((row) => {
    const got = map.get(row.month) || {};
    return {
      month: row.month,
      earned: n(got.earned),
      sick: n(got.sick),
      additional: n(got.additional),
      special: n(got.special),
    };
  });
}

/* ========================= Employees ========================= */

// CREATE / UPDATE (upsert) employee (entered by HR only)
router.post("/hrms/employees", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      personal,
      org,
      assets,
      financial,
      schedule,
      biometricId,
      mappedUser,
      leaveMonthlyAllocation,
    } = req.body;

    if (!personal?.employeeId || !personal?.name) {
      return res.status(400).json({ message: "employeeId and name are required." });
    }

    // normalize employeeId on write
    personal.employeeId = String(personal.employeeId).trim();

    // normalize additionalProducts (supports old string array OR new object array)
    let normalizedAssets = assets || {};
    if (normalizedAssets && Array.isArray(normalizedAssets.additionalProducts)) {
      normalizedAssets = { ...normalizedAssets };
      normalizedAssets.additionalProducts = normalizedAssets.additionalProducts
        .map((p) => {
          if (p == null) return null;
          if (typeof p === "string") {
            return { name: p, serialOrDesc: "", issuedOn: undefined };
          }
          return {
            name: String(p.name || "").trim(),
            serialOrDesc: String(p.serialOrDesc || "").trim(),
            issuedOn: p.issuedOn ? new Date(p.issuedOn) : undefined,
          };
        })
        .filter(Boolean);
    }

    let normalizedLeaveMonthly = undefined;
    if (leaveMonthlyAllocation !== undefined) {
      try {
        normalizedLeaveMonthly = normalizeLeaveMonthlyAllocation(leaveMonthlyAllocation);
      } catch (e) {
        return res.status(400).json({ message: e.message || "Invalid leaveMonthlyAllocation" });
      }
    }

    const update = { personal, org, assets: normalizedAssets, financial };

    if (schedule) update.schedule = schedule;
    if (typeof biometricId === "string") update.biometricId = biometricId.trim();
    if (mappedUser) update.mappedUser = mappedUser;

    // ✅ always set allocation: if provided use it; else default 12 months
    update.leaveMonthlyAllocation = normalizedLeaveMonthly || buildDefaultLeaveMonthlyAllocation();

    const up = await Employee.findOneAndUpdate(
      { "personal.employeeId": personal.employeeId },
      update,
      { new: true, upsert: true, runValidators: true }
    ).populate("mappedUser", "name email phone role isSuperAdmin");

    res.json(up);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// UPDATE specific employee by employeeId (edit modal save)
router.put("/hrms/employees/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      personal,
      org,
      assets,
      financial,
      schedule,
      biometricId,
      mappedUser,
      isActive,
      leaveMonthlyAllocation,
    } = req.body;

    const $set = {};

    // ✅ Personal: update fields individually (do NOT replace personal object)
    if (personal) {
      const p = { ...personal };
      delete p.employeeId; // still prevent changing it
      for (const [k, v] of Object.entries(p)) {
        $set[`personal.${k}`] = v;
      }
    }

    // Org
    if (org) {
      for (const [k, v] of Object.entries(org)) {
        $set[`org.${k}`] = v;
      }
    }

    // Assets (keep your normalization, but set the whole assets object is OK because it has no required fields)
    if (assets) {
      let normalizedAssets = assets;
      if (normalizedAssets && Array.isArray(normalizedAssets.additionalProducts)) {
        normalizedAssets = { ...normalizedAssets };
        normalizedAssets.additionalProducts = normalizedAssets.additionalProducts
          .map((p) => {
            if (p == null) return null;
            if (typeof p === "string") return { name: p, serialOrDesc: "", issuedOn: undefined };
            return {
              name: String(p.name || "").trim(),
              serialOrDesc: String(p.serialOrDesc || "").trim(),
              issuedOn: p.issuedOn ? new Date(p.issuedOn) : undefined,
            };
          })
          .filter(Boolean);
      }
      $set.assets = normalizedAssets;
    }

    // Financial / Schedule
    if (financial) $set.financial = financial;
    if (schedule) $set.schedule = schedule;

    // Other fields
    if (typeof biometricId === "string") $set.biometricId = biometricId.trim();
    if (typeof isActive === "boolean") $set.isActive = isActive;

    if (mappedUser === null) {
      $set.mappedUser = undefined;
    } else if (mappedUser) {
      $set.mappedUser = mappedUser;
    }

    // Leave allocation
    if (leaveMonthlyAllocation !== undefined) {
      try {
        $set.leaveMonthlyAllocation = normalizeLeaveMonthlyAllocation(leaveMonthlyAllocation);
      } catch (e) {
        return res.status(400).json({ message: e.message || "Invalid leaveMonthlyAllocation" });
      }
    }

    const row = await Employee.findOneAndUpdate(
      {
        $expr: {
          $eq: [
            { $toUpper: { $trim: { input: "$personal.employeeId" } } },
            String(req.params.employeeId || "").trim().toUpperCase(),
          ],
        },
      },
      { $set },
      { new: true, runValidators: true }
    ).populate("mappedUser", "name email phone role isSuperAdmin");

    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE employee by employeeId
router.delete("/hrms/employees/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const del = await Employee.findOneAndDelete({
      $expr: {
        $eq: [
          { $toUpper: { $trim: { input: "$personal.employeeId" } } },
          String(req.params.employeeId || "").trim().toUpperCase(),
        ],
      },
    });
    if (!del) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted", employeeId: req.params.employeeId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// LIST with search/filter/sort  (FIXED projection)
router.get("/hrms/employees", authenticate, requireAdmin, async (req, res) => {
  try {
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

    const projection = buildSafeEmployeeProjection(req, {
      biometricId: 1,
      mappedUser: 1,
      "personal.employeeId": 1,
      "personal.name": 1,
      "org.role": 1,
      "org.department": 1,
      isActive: 1,

      // ✅ include allocation if you want it available in list calls too
      leaveMonthlyAllocation: 1,
    });

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: dir === "desc" ? -1 : 1 };

    const [rows, total] = await Promise.all([
      Employee.find(filter, projection)
        .populate("mappedUser", "name email phone role isSuperAdmin")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Employee.countDocuments(filter),
    ]);
    res.json({ rows, total });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET single (resilient; always include name + normalized match) (FIXED projection)
router.get("/hrms/employees/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const projection = buildSafeEmployeeProjection(req, {
      personal: 1,
      org: 1,
      assets: 1,
      financial: 1,
      schedule: 1,
      biometricId: 1,
      mappedUser: 1,
      isActive: 1,
      createdAt: 1,
      updatedAt: 1,

      // ✅ CRITICAL: return allocation so edit modal can load it
      leaveMonthlyAllocation: 1,
    });

    const idParam = String(req.params.employeeId || "");
    const emp = await Employee.findOne(
      {
        $expr: {
          $eq: [
            { $toUpper: { $trim: { input: "$personal.employeeId" } } },
            idParam.trim().toUpperCase(),
          ],
        },
      },
      projection
    ).populate("mappedUser", "name email phone role isSuperAdmin");

    if (!emp) return res.status(404).json({ message: "Not found" });
    res.json(emp);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ========================= Users search (typeahead for mapping) ========================= */
router.get("/hrms/users/search", authenticate, requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json({ rows: [] });

    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const rows = await User.find(
      { $or: [{ name: re }, { email: re }, { phone: re }] },
      "name email phone role isSuperAdmin"
    )
      .sort({ name: 1 })
      .limit(15)
      .lean();

    res.json({ rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ========================= Attendance ========================= */

// IMPORT attendance (programmatic JSON upsert)
router.post("/hrms/attendance/import", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ message: "rows[] required" });

    const ops = rows.map((r) => {
      const when = toDateOnly(r.date);
      if (!isValidDate(when)) throw new Error(`Invalid date in import: ${r.date}`);
      return {
        updateOne: {
          filter: { employeeId: String(r.employeeId || "").trim(), date: when },
          update: { $set: { ...r, employeeId: String(r.employeeId || "").trim(), date: when } },
          upsert: true,
        },
      };
    });
    await Attendance.bulkWrite(ops);
    res.json({ imported: rows.length });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// BULK MARK ATTENDANCE (manual)
router.post("/hrms/attendance/bulk", authenticate, requireAdmin, async (req, res) => {
  try {
    const { date, records } = req.body || {};
    if (!date) return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });
    if (!Array.isArray(records) || !records.length)
      return res.status(400).json({ message: "records[] required" });

    const when = toDateOnly(date);
    if (!isValidDate(when)) return res.status(400).json({ message: "Invalid date format" });
    const dayName = dayNameOf(when);
    const weekend = isWeekend(when);
    const approvedBy = getUserId(req) || undefined;

    const ids = records.map((r) => String(r.employeeId || "").trim()).filter(Boolean);
    const existing = await Employee.find(
      { "personal.employeeId": { $in: ids } },
      { "personal.employeeId": 1 }
    ).lean();
    const existingSet = new Set(existing.map((e) => String(e.personal.employeeId || "").trim()));
    const invalid = ids.filter((id) => !existingSet.has(id));
    if (invalid.length) {
      return res.status(400).json({ message: `Unknown employeeId(s): ${invalid.join(", ")}` });
    }

    const attendanceOps = [];
    for (const r of records) {
      const empId = String(r.employeeId || "").trim();
      const status = (r.status || "Present").trim();
      let payload = {
        employeeId: empId,
        date: when,
        dayName,
        isWeekend: weekend,
        isHoliday: false,
        note: "",
      };

      if (status === "Present")
        payload = { ...payload, hours: 8, login: "", logout: "", note: "Present" };
      else if (status === "Leave")
        payload = { ...payload, hours: 0, login: "", logout: "", note: "Leave" };
      else if (status === "WFH")
        payload = { ...payload, hours: 8, login: "", logout: "", note: "WFH" };
      else payload = { ...payload, hours: 8, login: "", logout: "", note: status || "Present" };

      attendanceOps.push({
        updateOne: { filter: { employeeId: empId, date: when }, update: { $set: payload }, upsert: true },
      });
    }
    if (attendanceOps.length) await Attendance.bulkWrite(attendanceOps);

    const wfhOps = records
      .filter((r) => (r.status || "Present").trim() === "WFH")
      .map((r) => {
        const empId = String(r.employeeId || "").trim();
        return {
          updateOne: {
            filter: { employeeId: empId, date: when },
            update: {
              $set: { employeeId: empId, date: when, reason: "Marked via bulk", ...(approvedBy ? { approvedBy } : {}) },
            },
            upsert: true,
          },
        };
      });
    if (wfhOps.length) await WFH.bulkWrite(wfhOps);

    res.json({ saved: records.length, date: when });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post(
  "/hrms/attendance/import-file",
  authenticate,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    const filePath = req.file?.path;
    if (!filePath) return res.status(400).json({ message: "file is required" });

    let wb = null;
    try {
      wb = XLSX.readFile(filePath, { cellDates: false, raw: false });
    } catch (e) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ message: `Failed to read file: ${e.message}` });
    }

    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length) {
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (Array.isArray(aoa) && aoa.length > 1) {
        const headers = aoa[0].map((h) =>
          String(h || "")
            .replace(/\r?\n/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase()
        );
        rows = aoa.slice(1).map((r) => {
          const o = {};
          headers.forEach((h, i) => (o[h] = r[i]));
          return o;
        });
      }
    }

    const headerMap = {};
    if (rows.length) {
      Object.keys(rows[0]).forEach((k) => {
        const norm = String(k || "")
          .replace(/\r?\n/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        headerMap[norm] = k;
      });
    } else {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ message: "No rows found in the first sheet" });
    }

    function pickCol(...candidates) {
      for (const cand of candidates) {
        const norm = String(cand || "")
          .replace(/\r?\n/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        if (headerMap[norm]) return headerMap[norm];
      }
      for (const cand of candidates) {
        const norm = String(cand || "")
          .replace(/\r?\n/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        if (norm in rows[0]) return norm;
      }
      return null;
    }

    const colEmployee = pickCol("E. Code", "E Code", "ecode", "employee code", "emp code");
    const colDate = pickCol("Date", "Punch Date", "Attendance Date", "Att Date");
    const colIn = pickCol("InTime", "In Time", "In", "First In", "Punch In");
    const colOut = pickCol("OutTime", "Out Time", "Out", "Last Out", "Punch Out");
    const colWorkDur = pickCol("Work Dur.", "Work Dur", "Working Hours", "Work Duration", "Duration");
    const colTotDur = pickCol("Tot. Dur.", "Tot Dur.", "Total Dur.", "Total Hours", "Tot. Hours");
    const colStatus = pickCol("Status");
    const colRemarks = pickCol("Remarks", "Remark", "Note", "Notes");

    if (!colEmployee) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ message: "Required header not found: E. Code" });
    }

    let defaultDate = null;
    if (!colDate) {
      const qp = (req.query?.date || req.body?.date || "").toString().trim();
      if (!qp) {
        fs.unlink(filePath, () => {});
        return res.status(400).json({
          message: "Date column not found. Pass ?date=YYYY-MM-DD or include a Date column.",
        });
      }
      const d = new Date(qp);
      if (isNaN(d)) {
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: "Invalid ?date=YYYY-MM-DD" });
      }
      defaultDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];
    const bulkOps = [];

    for (let i = 0; i < rows.length; i++) {
      const src = rows[i];

      const employeeIdRaw = String(src[colEmployee] || "").trim();
      if (!employeeIdRaw) {
        skipped++;
        continue;
      }

      let dateOnly = null;
      if (colDate) {
        const v = src[colDate];
        let d = null;
        if (v instanceof Date && !isNaN(v)) d = v;
        else if (!isNaN(+v) && +v > 0) {
          try {
            const dec = XLSX.SSF.parse_date_code(+v);
            if (dec) d = new Date(Date.UTC(dec.y, dec.m - 1, dec.d));
          } catch {}
        }
        if (!d) d = new Date(String(v));
        if (!isNaN(d)) {
          dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
      } else {
        dateOnly = defaultDate;
      }

      if (!dateOnly || isNaN(dateOnly)) {
        skipped++;
        continue;
      }

      const inStr = colIn ? String(src[colIn] || "").trim() : "";
      const outStr = colOut ? String(src[colOut] || "").trim() : "";

      const minIn = inStr ? parseTimeToMinutes(inStr) : null;
      const minOut = outStr ? parseTimeToMinutes(outStr) : null;

      let hours = 0;
      const hv = colWorkDur ? src[colWorkDur] : undefined;
      const tv = colTotDur ? src[colTotDur] : undefined;

      function toHours(val) {
        if (val == null || val === "") return null;
        if (!isNaN(+val)) return +(+val).toFixed(2);
        const m = String(val).match(/^(\d{1,2})[:.](\d{2})$/);
        if (m) return +((+m[1] + +m[2] / 60).toFixed(2));
        return null;
      }

      hours = toHours(hv);
      if (hours == null) hours = toHours(tv);
      if (hours == null) {
        const diff = minIn != null && minOut != null ? minOut - minIn : 0;
        hours = diff > 0 ? +(diff / 60).toFixed(2) : 0;
      }

      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateOnly.getDay()];
      const weekend = dateOnly.getDay() === 0 || dateOnly.getDay() === 6;
      let holiday = false;
      try {
        holiday = await isHolidayDate(dateOnly);
      } catch {}

      const statusRaw = colStatus ? String(src[colStatus] || "").trim() : "";
      const remarksRaw = colRemarks ? String(src[colRemarks] || "").trim() : "";

      let note = remarksRaw || statusRaw || "";
      if (/^leave$/i.test(statusRaw)) {
        hours = 0;
        note = note || "Leave";
      }
      if (/^wfh$/i.test(statusRaw)) {
        note = note || "WFH";
      }

      const login =
        minIn != null
          ? `${String(Math.floor(minIn / 60)).padStart(2, "0")}:${String(minIn % 60).padStart(2, "0")}`
          : "";
      const logout =
        minOut != null
          ? `${String(Math.floor(minOut / 60)).padStart(2, "0")}:${String(minOut % 60).padStart(2, "0")}`
          : "";

      const payload = {
        employeeId: employeeIdRaw,
        date: dateOnly,
        dayName,
        login,
        logout,
        hours: hours || 0,
        isWeekend: weekend,
        isHoliday: holiday,
        note,
      };

      bulkOps.push({
        updateOne: {
          filter: { employeeId: employeeIdRaw, date: dateOnly },
          update: { $set: payload },
          upsert: true,
        },
      });
      imported++;
    }

    if (bulkOps.length) {
      try {
        await Attendance.bulkWrite(bulkOps, { ordered: false });
      } catch (e) {
        errors.push(e.message || String(e));
      }
    }

    fs.unlink(filePath, () => {});
    res.json({ imported, skipped, errors });
  }
);

// ATTENDANCE SUMMARY + TABLE
router.get("/hrms/attendance/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { range = "last-1m", from, to } = req.query;

    let { start, end } = rangeToBounds(range, from, to);

    if (range === "custom") {
      if (!from || !to) return res.status(400).json({ message: "from and to are required for custom range" });
    }
    if (!isValidDate(start) || !isValidDate(end)) return res.status(400).json({ message: "Invalid date range" });

    const rows = await Attendance.find({
      employeeId: String(req.params.employeeId || "").trim(),
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
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// EXPORT attendance to Excel
router.get("/hrms/attendance/:employeeId/export", authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await Attendance.find({ employeeId: String(req.params.employeeId || "").trim() }).sort({ date: 1 });

    const aoa = [["Date", "Day", "Login", "Logout", "# of hours", "Holiday?", "Weekend?", "Note"]].concat(
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
      `attachment; filename="attendance_${String(req.params.employeeId || "").trim()}.xlsx"`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ========================= Leaves (admin) ========================= */

// LIST ALL LEAVES with filters, header search, sorting, pagination
router.get("/hrms/leaves", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      q = "",
      employeeId = "",
      employeeName = "",
      type = "",
      status = "",
      from = "",
      to = "",
      sortBy = "startDate",
      dir = "desc",
      page = 1,
      limit = 50,
      includeEmployee = "1",
    } = req.query;

    const filter = {};
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ purpose: re }, { employeeId: re }];
    }
    if (employeeId) filter.employeeId = String(employeeId).trim();
    if (type) filter.type = String(type).trim();
    if (status) filter.status = String(status).trim();

    if (from || to) {
      const start = from ? new Date(from) : new Date("1970-01-01");
      const end = to ? new Date(to) : new Date("2999-12-31");
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: "Invalid from/to date" });
      }
      filter.$and = (filter.$and || []).concat([{ startDate: { $lte: end } }, { endDate: { $gte: start } }]);
    }

    const sortWhitelist = { startDate: 1, endDate: 1, createdAt: 1, updatedAt: 1 };
    const sortKey = sortWhitelist[sortBy] ? sortBy : "startDate";
    const sort = { [sortKey]: dir === "asc" ? 1 : -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const lim = Math.min(Math.max(Number(limit), 1), 200);

    if (!employeeName) {
      const [rows, total] = await Promise.all([
        Leave.find(filter).sort(sort).skip(skip).limit(lim).lean(),
        Leave.countDocuments(filter),
      ]);

      if (includeEmployee === "1" && rows.length) {
        const empIds = [...new Set(rows.map((r) => String(r.employeeId || "").trim()))];
        const emps = await Employee.find(
          { "personal.employeeId": { $in: empIds } },
          { "personal.employeeId": 1, "personal.name": 1, "org.department": 1, "org.role": 1 }
        ).lean();

        const nameMap = new Map(emps.map((e) => [String(e.personal.employeeId || "").trim().toUpperCase(), e]));

        for (const r of rows) {
          const key = String(r.employeeId || "").trim().toUpperCase();
          const e = nameMap.get(key);
          if (e) {
            r.employee = {
              employeeId: e.personal.employeeId,
              name: e.personal.name,
              role: e.org?.role || "",
              department: e.org?.department || "",
            };
          }
        }
      }

      return res.json({ rows, total });
    }

    const reName = new RegExp(employeeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const $match = filter;

    const pipeline = [
      { $match },
      {
        $lookup: {
          from: "employees",
          let: { empId: "$employeeId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toUpper: { $trim: { input: "$personal.employeeId" } } },
                    { $toUpper: { $trim: { input: "$$empId" } } },
                  ],
                },
              },
            },
            {
              $project: {
                employeeId: "$personal.employeeId",
                name: "$personal.name",
                role: "$org.role",
                department: "$org.department",
              },
            },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      { $match: employeeName ? { "employee.name": { $regex: reName } } : {} },
      { $sort: sort },
      { $skip: skip },
      { $limit: lim },
    ];

    const [rows, countAgg] = await Promise.all([
      Leave.aggregate(pipeline),
      Leave.aggregate([
        { $match },
        {
          $lookup: {
            from: "employees",
            let: { empId: "$employeeId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $toUpper: { $trim: { input: "$personal.employeeId" } } },
                      { $toUpper: { $trim: { input: "$$empId" } } },
                    ],
                  },
                },
              },
              { $project: { employeeId: "$personal.employeeId", name: "$personal.name" } },
            ],
            as: "employee",
          },
        },
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        { $match: employeeName ? { "employee.name": { $regex: reName } } : {} },
        { $count: "t" },
      ]),
    ]);

    const total = countAgg?.[0]?.t || 0;
    return res.json({ rows, total });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// UPDATE STATUS (super admin can set any allowed status)
router.patch("/hrms/leaves/:id/status", authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["applied", "pending", "approved", "rejected", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
    }

    const uid = getUserId(req);
    const user = await User.findById(uid, "name").lean();

    const row = await Leave.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          approvedBy: uid,
          statusChangedBy: uid,
          statusChangedByName: user?.name || "Super Admin",
          statusChangedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!row) return res.status(404).json({ message: "Not found" });

    notifyLeaveStatusChange(row, user).catch((err) => console.error("Email notification error:", err));

    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ========================= Restricted Holidays (admin) ========================= */

router.get("/hrms/rh/requests", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      q = "",
      employeeId = "",
      employeeName = "",
      status = "",
      from = "",
      to = "",
      sortBy = "holidayDate",
      dir = "desc",
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ holidayName: re }, { note: re }, { employeeId: re }];
    }
    if (employeeId) filter.employeeId = String(employeeId).trim();
    if (status) filter.status = String(status).trim();

    if (from || to) {
      const start = from ? new Date(from) : new Date("1970-01-01");
      const end = to ? new Date(to) : new Date("2999-12-31");
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: "Invalid from/to date" });
      }
      filter.holidayDate = { $gte: start, $lte: end };
    }

    const sortWhitelist = { holidayDate: 1, createdAt: 1, updatedAt: 1 };
    const sortKey = sortWhitelist[sortBy] ? sortBy : "holidayDate";
    const sort = { [sortKey]: dir === "asc" ? 1 : -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const lim = Math.min(Math.max(Number(limit), 1), 200);

    if (!employeeName) {
      const [rows, total] = await Promise.all([
        RestrictedHolidayRequest.find(filter).sort(sort).skip(skip).limit(lim).lean(),
        RestrictedHolidayRequest.countDocuments(filter),
      ]);

      if (rows.length) {
        const empIds = [...new Set(rows.map((r) => String(r.employeeId || "").trim()).filter(Boolean))];
        if (empIds.length) {
          const emps = await Employee.find(
            { "personal.employeeId": { $in: empIds } },
            { "personal.employeeId": 1, "personal.name": 1, "org.department": 1, "org.role": 1 }
          ).lean();
          const map = new Map(emps.map((e) => [String(e.personal.employeeId || "").trim().toUpperCase(), e]));
          for (const r of rows) {
            const key = String(r.employeeId || "").trim().toUpperCase();
            const e = map.get(key);
            if (e) {
              r.employee = {
                employeeId: e.personal.employeeId,
                name: e.personal.name,
                role: e.org?.role || "",
                department: e.org?.department || "",
              };
            }
          }
        }
      }

      return res.json({ rows, total });
    }

    const reName = new RegExp(employeeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const $match = filter;

    const pipeline = [
      { $match },
      {
        $lookup: {
          from: "employees",
          let: { empId: "$employeeId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toUpper: { $trim: { input: "$personal.employeeId" } } },
                    { $toUpper: { $trim: { input: "$$empId" } } },
                  ],
                },
              },
            },
            {
              $project: {
                employeeId: "$personal.employeeId",
                name: "$personal.name",
                role: "$org.role",
                department: "$org.department",
              },
            },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      { $match: { "employee.name": { $regex: reName } } },
      { $sort: sort },
      { $skip: skip },
      { $limit: lim },
    ];

    const [rows, countAgg] = await Promise.all([
      RestrictedHolidayRequest.aggregate(pipeline),
      RestrictedHolidayRequest.aggregate([
        { $match },
        {
          $lookup: {
            from: "employees",
            let: { empId: "$employeeId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $toUpper: { $trim: { input: "$personal.employeeId" } } },
                      { $toUpper: { $trim: { input: "$$empId" } } },
                    ],
                  },
                },
              },
              { $project: { employeeId: "$personal.employeeId", name: "$personal.name" } },
            ],
            as: "employee",
          },
        },
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        { $match: { "employee.name": { $regex: reName } } },
        { $count: "t" },
      ]),
    ]);

    const total = countAgg?.[0]?.t || 0;
    return res.json({ rows, total });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch("/hrms/rh/:id/status", authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["applied", "pending", "approved", "rejected", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
    }
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const row = await RestrictedHolidayRequest.findByIdAndUpdate(
      id,
      { $set: { status, approvedBy: getUserId(req) } },
      { new: true }
    );
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Simple leaves by employeeId (admin)
router.get("/hrms/leaves/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await Leave.find({ employeeId: String(req.params.employeeId || "").trim() }).sort({ startDate: -1 });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create leave (admin)
router.post("/hrms/leaves", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, purpose } = req.body;
    if (!employeeId || !type || !startDate || !endDate) {
      return res.status(400).json({ message: "employeeId, type, startDate, endDate required" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isValidDate(start) || !isValidDate(end)) {
      return res.status(400).json({ message: "Invalid start/end date" });
    }
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const uid = getUserId(req);
    const user = await User.findById(uid, "name").lean();

    const leave = await Leave.create({
      employeeId: String(employeeId).trim(),
      type,
      startDate: start,
      endDate: end,
      days,
      purpose,
      status: "pending",
      requestedBy: uid,
      statusChangedBy: uid,
      statusChangedByName: user?.name || "Admin",
      statusChangedAt: new Date(),
    });

    notifyLeaveApplication(leave).catch((err) => console.error("Email notification error:", err));

    res.status(201).json(leave);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch("/hrms/leaves/:id/decision", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // approved | rejected
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be approved or rejected" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const uid = getUserId(req);
    const user = await User.findById(uid, "name").lean();

    const up = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status,
        approvedBy: uid,
        statusChangedBy: uid,
        statusChangedByName: user?.name || "Admin",
        statusChangedAt: new Date(),
      },
      { new: true }
    );

    if (!up) return res.status(404).json({ message: "Not found" });

    notifyLeaveStatusChange(up, user).catch((err) => console.error("Email notification error:", err));

    res.json(up);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ========================= WFH ========================= */

router.get("/hrms/wfh", authenticate, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};
    if (date) {
      const d = toDateOnly(date);
      if (!isValidDate(d)) return res.status(400).json({ message: "Invalid date" });
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }
    const rows = await WFH.find(filter).sort({ date: -1 });
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hrms/wfh", authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId, date, reason } = req.body;
    if (!employeeId || !date) return res.status(400).json({ message: "employeeId and date required" });
    const when = toDateOnly(date);
    if (!isValidDate(when)) return res.status(400).json({ message: "Invalid date" });
    const row = await WFH.findOneAndUpdate(
      { employeeId: String(employeeId).trim(), date: when },
      { $set: { employeeId: String(employeeId).trim(), date: when, reason, approvedBy: getUserId(req) } },
      { new: true, upsert: true }
    );
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ========================= Salary Engine ========================= */

async function countLeaves(employeeId, start, end) {
  const rows = await Leave.find({
    employeeId: String(employeeId).trim(),
    status: "approved",
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  const sum = (type) => rows.filter((r) => r.type === type).reduce((s, r) => s + r.days, 0);
  return { earned: sum("earned"), sick: sum("sick"), additional: sum("additional"), special: sum("special") };
}

router.get("/hrms/salary/calc", authenticate, requireAdmin, async (req, res) => {
  try {
    const { mode = "monthly", month, from, to, range = "last-1m" } = req.query;
    let start, end;

    if (mode === "monthly") {
      const ym = month || new Date().toISOString().slice(0, 7);
      ({ start, end } = monthBounds(ym));
    } else {
      if (range === "custom") {
        if (!from || !to)
          return res.status(400).json({ message: "from and to are required for custom cumulative range" });
        start = new Date(from);
        end = new Date(to);
      } else ({ start, end } = rangeToBounds(range, from, to));
    }

    if (!isValidDate(start) || !isValidDate(end)) return res.status(400).json({ message: "Invalid date range" });

    const empProjection = buildSafeEmployeeProjection(req, {
      biometricId: 1,
      mappedUser: 1,
      "personal.name": 1,
      "personal.employeeId": 1,
      "org.role": 1,
      "org.department": 1,
    });

    const employees = await Employee.find({ isActive: true }, empProjection);

    const rows = [];
    for (const emp of employees) {
      const id = String(emp.personal.employeeId || "").trim();
      const att = await Attendance.find({ employeeId: id, date: { $gte: start, $lte: end } });

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
              ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
              : undefined,
          salaryDeductionDays,
          remarks: salaryDeductionDays > 0 ? `${salaryDeductionDays} day(s) salary deduction per policy` : "Full pay",
        },
      });
    }

    res.json({ range: { start, end }, rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hrms/salary/finalize", authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { rows, periodLabel } = req.body;
    const inserts = [];
    for (const r of rows) {
      const e = r.allocation?.earnedToAdd || 0;
      if (e > 0) {
        const startDate = new Date();
        const endDate = new Date();
        inserts.push({
          employeeId: String(r.employeeId).trim(),
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
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ======================================================================
   SELF-SERVICE ENDPOINTS (authenticate + ensureAuthUser) + PROFILE APIs
   ====================================================================== */

router.get("/me/profile", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(uid).select("name email phone address dateOfBirth role isSuperAdmin permissions");

    const employee = await Employee.findOne({ mappedUser: uid })
      .populate("mappedUser", "name email phone")
      .lean();

    res.json({ user, employee });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/me/profile", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const { user: u, employee: e } = req.body || {};

    if (u) {
      await User.findByIdAndUpdate(
        uid,
        {
          $set: {
            name: u.name,
            phone: u.phone,
            address: u.address,
            ...(u.dateOfBirth ? { dateOfBirth: new Date(u.dateOfBirth) } : {}),
          },
        },
        { new: true }
      );
    }

    if (e) {
      let emp = await Employee.findOne({ mappedUser: uid });
      if (!emp && e.createIfMissing) {
        emp = new Employee({
          personal: {
            employeeId: String(e.personal?.employeeId || `EMP-${String(uid).slice(-6)}`).trim(),
            name: e.personal?.name || "",
          },
          mappedUser: uid,
          isActive: true,
        });
      }
      if (emp) {
        if (e.personal) {
          const p = e.personal;
          emp.personal = {
            ...emp.personal,
            ...p,
            employeeId: String(p.employeeId || emp.personal.employeeId || "").trim(),
            ...(p.dob ? { dob: new Date(p.dob) } : {}),
            ...(p.dateOfJoining ? { dateOfJoining: new Date(p.dateOfJoining) } : {}),
          };
        }
        if (e.org) emp.org = { ...emp.org, ...e.org };
        if (e.assets) emp.assets = { ...emp.assets, ...e.assets };
        if (e.financial) {
          const f = e.financial;
          emp.financial = {
            ...emp.financial,
            ...f,
            ...(f.lastRevisedSalaryAt ? { lastRevisedSalaryAt: new Date(f.lastRevisedSalaryAt) } : {}),
            ...(f.nextAppraisalOn ? { nextAppraisalOn: new Date(f.nextAppraisalOn) } : {}),
          };
        }
        if (typeof e.biometricId === "string") emp.biometricId = e.biometricId.trim();

        // ✅ allow self-service to update leaveMonthlyAllocation only if you want:
        // If not desired, remove this block.
        if (e.leaveMonthlyAllocation !== undefined) {
          try {
            emp.leaveMonthlyAllocation = normalizeLeaveMonthlyAllocation(e.leaveMonthlyAllocation);
          } catch {}
        }

        await emp.save();
      }
    }

    const freshUser = await User.findById(uid).select("name email phone address dateOfBirth role isSuperAdmin permissions");
    const freshEmp = await Employee.findOne({ mappedUser: uid }).populate("mappedUser", "name email phone").lean();

    res.json({ user: freshUser, employee: freshEmp });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/hrms/holidays/restricted", authenticate, ensureAuthUser, async (_req, res) => {
  try {
    const rows = await Holiday.find({ type: "RESTRICTED" }).sort({ date: 1 }).lean();
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/hrms/self/rh", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const rows = await RestrictedHolidayRequest.find({ userId: uid })
      .populate("holidayId")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hrms/self/rh", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const { holidayId, note = "" } = req.body || {};
    if (!holidayId || !isValidObjectId(holidayId)) return res.status(400).json({ message: "holidayId is required" });

    const empId = await employeeIdForUserId(uid);
    if (!empId) return res.status(400).json({ message: "No employee mapped to this user" });

    const holiday = await Holiday.findById(holidayId).lean();
    if (!holiday || holiday.type !== "RESTRICTED") {
      return res.status(404).json({ message: "Restricted holiday not found" });
    }

    const { start, end } = getCalendarYearBounds(new Date(holiday.date));
    const activeStatuses = ["applied", "pending", "approved"];
    const activeCount = await RestrictedHolidayRequest.countDocuments({
      userId: uid,
      createdAt: { $gte: start, $lte: end },
      status: { $in: activeStatuses },
    });
    if (activeCount >= 2) {
      return res.status(400).json({ message: "Limit reached: maximum 2 restricted holidays per year." });
    }

    const row = await RestrictedHolidayRequest.create({
      userId: uid,
      employeeId: String(empId).trim(),
      holidayId: holiday._id,
      holidayDate: holiday.date,
      holidayName: holiday.name || "Restricted Holiday",
      status: "applied",
      note,
    });
    res.status(201).json(row);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: "You already applied for this restricted holiday." });
    }
    res.status(500).json({ message: e.message });
  }
});

router.patch("/hrms/self/rh/:id/cancel", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const row = await RestrictedHolidayRequest.findOne({ _id: id, userId: uid });
    if (!row) return res.status(404).json({ message: "Request not found" });
    if (["approved", "rejected"].includes(row.status)) {
      return res.status(400).json({ message: `Cannot cancel a ${row.status} request` });
    }
    row.status = "cancelled";
    await row.save();
    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/hrms/self/leaves", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const empId = await employeeIdForUserId(uid);
    if (!empId) return res.json({ rows: [] });

    const rows = await Leave.find({ employeeId: String(empId).trim() }).sort({ createdAt: -1 }).lean();
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/hrms/self/leaves", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const { startDate, endDate, purpose } = req.body || {};
    if (!startDate || !endDate) return res.status(400).json({ message: "startDate and endDate are required" });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isValidDate(start) || !isValidDate(end) || end < start) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const empId = await employeeIdForUserId(uid);
    if (!empId) return res.status(400).json({ message: "No employee mapped to this user" });

    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const user = await User.findById(uid, "name").lean();

    const row = await Leave.create({
      employeeId: String(empId).trim(),
      type: "additional",
      startDate: start,
      endDate: end,
      days,
      purpose: purpose || "",
      status: "applied",
      requestedBy: uid,
      statusChangedBy: uid,
      statusChangedByName: user?.name || "Employee",
      statusChangedAt: new Date(),
    });

    notifyLeaveApplication(row).catch((err) => console.error("Email notification error:", err));

    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch("/hrms/self/leaves/:id/cancel", authenticate, ensureAuthUser, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const row = await Leave.findById(id);
    if (!row) return res.status(404).json({ message: "Leave not found" });
    if (String(row.requestedBy) !== String(uid)) {
      return res.status(403).json({ message: "Not your request" });
    }
    if (["approved", "rejected"].includes(row.status)) {
      return res.status(400).json({ message: `Cannot cancel a ${row.status} request` });
    }

    const user = await User.findById(uid, "name").lean();

    row.status = "cancelled";
    row.statusChangedBy = uid;
    row.statusChangedByName = user?.name || "Employee";
    row.statusChangedAt = new Date();
    await row.save();

    notifyLeaveStatusChange(row, user).catch((err) => console.error("Email notification error:", err));

    res.json(row);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
