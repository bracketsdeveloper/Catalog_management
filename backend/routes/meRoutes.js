// routes/me.js
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/authenticate");
const User = require("../models/User");
const Employee = require("../models/Employee");

/* utils */
function toDateOrUndef(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(+d) ? undefined : d;
}
function deepMerge(target, src) {
  if (!src) return target;
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      target[k] = deepMerge(target[k] || {}, v);
    } else if (v !== undefined) {
      target[k] = v;
    }
  }
  return target;
}
function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

/**
 * GET /api/me/profile
 * Returns merged view:
 * {
 *   user: { _id, name, email, phone, address, dateOfBirth, ...no password },
 *   employee: { personal, org, assets, financial, biometricId, mappedUser }
 * }
 */
router.get("/me/profile", authenticate, async (req, res) => {
  try {
    const uid = req.user?._id || req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const me = await User.findById(uid).select("-password").lean();
    if (!me) return res.status(404).json({ message: "User not found" });

    const employee = await Employee.findOne({ mappedUser: me._id })
      .populate("mappedUser", "name email phone role isSuperAdmin")
      .lean();

    return res.json({ user: me, employee });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
});

/**
 * PUT /api/me/profile
 * Body: { user: {...}, employee: {...} }
 * - email is ignored (not editable)
 * - password is never read/written here
 * - creates Employee if missing (when employee.createIfMissing = true)
 */
router.put("/me/profile", authenticate, async (req, res) => {
  try {
    const uid = req.user?._id || req.user?.id;
    if (!uid) return res.status(401).json({ message: "Unauthorized" });

    const userUpdate = req.body?.user || {};
    const employeeUpdate = req.body?.employee || {};

    /* -------- Update User (no email change) -------- */
    const user = await User.findById(uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    const allowedUserFields = ["name", "phone", "address", "dateOfBirth"];
    const safeUser = pick(userUpdate, allowedUserFields);

    if (safeUser.name !== undefined) user.name = String(safeUser.name).trim();
    if (safeUser.phone !== undefined) user.phone = String(safeUser.phone).trim();
    if (safeUser.address !== undefined) user.address = String(safeUser.address).trim();
    if (safeUser.dateOfBirth !== undefined) user.dateOfBirth = toDateOrUndef(safeUser.dateOfBirth);

    await user.save();

    /* -------- Upsert/Update Employee mapped to this user -------- */
    let employee = await Employee.findOne({ mappedUser: user._id });

    if (!employee && employeeUpdate.createIfMissing) {
      const empId = employeeUpdate?.personal?.employeeId || `EMP-${String(user._id).slice(-6)}`;
      employee = new Employee({
        personal: {
          employeeId: empId,
          name: employeeUpdate?.personal?.name || user.name || "",
        },
        mappedUser: user._id,
      });
    }

    if (employee) {
      // Personal
      if (employeeUpdate.personal) {
        const p = employeeUpdate.personal;
        employee.personal = deepMerge(employee.personal || {}, {
          employeeId: p.employeeId !== undefined ? String(p.employeeId).trim() : undefined,
          name: p.name !== undefined ? String(p.name).trim() : undefined,
          dob: p.dob !== undefined ? toDateOrUndef(p.dob) : undefined,
          address: p.address !== undefined ? String(p.address).trim() : undefined,
          phone: p.phone !== undefined ? String(p.phone).trim() : undefined,
          emergencyPhone: p.emergencyPhone !== undefined ? String(p.emergencyPhone).trim() : undefined,
          aadhar: p.aadhar !== undefined ? String(p.aadhar).trim() : undefined,
          bloodGroup: p.bloodGroup !== undefined ? String(p.bloodGroup).trim() : undefined,
          dateOfJoining: p.dateOfJoining !== undefined ? toDateOrUndef(p.dateOfJoining) : undefined,
          medicalIssues: p.medicalIssues !== undefined ? String(p.medicalIssues) : undefined,
        });
      }

      // Org
      if (employeeUpdate.org) {
        const o = employeeUpdate.org;
        employee.org = deepMerge(employee.org || {}, {
          role: o.role !== undefined ? String(o.role).trim() : undefined,
          department: o.department !== undefined ? String(o.department).trim() : undefined,
        });
      }

      // Assets
      if (employeeUpdate.assets) {
        const a = employeeUpdate.assets;
        employee.assets = deepMerge(employee.assets || {}, {
          laptopSerial: a.laptopSerial !== undefined ? String(a.laptopSerial).trim() : undefined,
          mousepad: a.mousepad !== undefined ? !!a.mousepad : undefined,
          mouse: a.mouse !== undefined ? !!a.mouse : undefined,
          mobileImei: a.mobileImei !== undefined ? String(a.mobileImei).trim() : undefined,
          mobileNumber: a.mobileNumber !== undefined ? String(a.mobileNumber).trim() : undefined,
          mobileCharger: a.mobileCharger !== undefined ? !!a.mobileCharger : undefined,
          neckband: a.neckband !== undefined ? !!a.neckband : undefined,
          bottle: a.bottle !== undefined ? !!a.bottle : undefined,
          diary: a.diary !== undefined ? !!a.diary : undefined,
          pen: a.pen !== undefined ? !!a.pen : undefined,
          laptopBag: a.laptopBag !== undefined ? !!a.laptopBag : undefined,
          rainCoverIssued: a.rainCoverIssued !== undefined ? !!a.rainCoverIssued : undefined,
          idCardsIssued: a.idCardsIssued !== undefined ? !!a.idCardsIssued : undefined,
          additionalProducts: Array.isArray(a.additionalProducts) ? a.additionalProducts : undefined,
        });
      }

      // Financial (allow edit here since this is “My Profile”)
      if (employeeUpdate.financial) {
        const f = employeeUpdate.financial;
        employee.financial = deepMerge(employee.financial || {}, {
          bankName: f.bankName !== undefined ? String(f.bankName).trim() : undefined,
          bankAccountNumber: f.bankAccountNumber !== undefined ? String(f.bankAccountNumber).trim() : undefined,
          currentCTC: f.currentCTC !== undefined ? Number(f.currentCTC) : undefined,
          currentTakeHome: f.currentTakeHome !== undefined ? Number(f.currentTakeHome) : undefined,
          lastRevisedSalaryAt: f.lastRevisedSalaryAt !== undefined ? toDateOrUndef(f.lastRevisedSalaryAt) : undefined,
          nextAppraisalOn: f.nextAppraisalOn !== undefined ? toDateOrUndef(f.nextAppraisalOn) : undefined,
        });
      }

      // Biometric + mapping
      if (employeeUpdate.biometricId !== undefined) {
        employee.biometricId = String(employeeUpdate.biometricId).trim();
      }
      employee.mappedUser = user._id;

      await employee.save();
    }

    const freshUser = await User.findById(uid).select("-password").lean();
    const freshEmployee = await Employee.findOne({ mappedUser: freshUser._id })
      .populate("mappedUser", "name email phone role isSuperAdmin")
      .lean();

    return res.json({ user: freshUser, employee: freshEmployee });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
});

module.exports = router;
