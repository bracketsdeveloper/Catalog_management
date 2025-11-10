const express = require("express");
const User = require("../models/User");
const { ROLE_ENUM } = require("../models/User");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

/* ---------- helpers ---------- */
function validRolesArray(arr) {
  if (!Array.isArray(arr)) return false;
  return arr.every((r) => ROLE_ENUM.includes(r));
}

/* ---------- Fetch current user ---------- */
router.get("/", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Update user profile ---------- */
router.put("/edit", authenticate, async (req, res) => {
  const { name, dateOfBirth, address } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.name = name || user.name;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.address = typeof address === "string" ? address : user.address;

    await user.save();
    const safe = user.toObject();
    delete safe.password;
    res.status(200).json({ message: "Profile updated successfully", user: safe });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Fetch all users (with optional role filter & name sort) ----------
   Query params:
   - role=ADMIN|GENERAL|VIEWER (account status filter; optional)
   - sortName=asc|desc (default asc)
--------------------------------------------------------------------------- */
router.get("/users", authenticate, async (req, res) => {
  try {
    const { role, sortName = "asc" } = req.query;
    const q = {};
    if (role && ["ADMIN", "GENERAL", "VIEWER"].includes(role)) q.role = role;

    const users = await User.find(
      q,
      "name dateOfBirth address email phone role roles handles isSuperAdmin permissions"
    ).lean();

    users.sort((a, b) =>
      sortName === "desc"
        ? b.name.localeCompare(a.name)
        : a.name.localeCompare(b.name)
    );

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

/* ---------- Add profile ---------- */
router.post("/add-profile", authenticate, async (req, res) => {
  const { name, dateOfBirth } = req.body;

  if (!name || !dateOfBirth) {
    return res.status(400).json({ error: "Name and date of birth are required" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newProfile = { name, dateOfBirth };
    user.profiles.push(newProfile);

    await user.save();
    res.status(201).json({ message: "Profile added successfully", profile: newProfile });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Update account status (legacy single 'role') ---------- */
router.put("/users/:id/role", authenticate, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["GENERAL", "ADMIN", "VIEWER"].includes(role)) {
    return res.status(400).json({ message: "Invalid role specified" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Role updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error while updating role" });
  }
});

/* ---------- Update SuperAdmin flag ---------- */
router.put("/users/:id/superadmin", authenticate, async (req, res) => {
  const { id } = req.params;
  const { isSuperAdmin } = req.body;

  if (req.user.isSuperAdmin !== true) {
    return res.status(403).json({ message: "Only SuperAdmins can modify SuperAdmin status" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { isSuperAdmin: !!isSuperAdmin },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "SuperAdmin status updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error while updating SuperAdmin status" });
  }
});

/* ---------- Update legacy 'handles' (kept for compatibility) ---------- */
router.put("/users/:id/handles", authenticate, async (req, res) => {
  const { id } = req.params;
  const { handles } = req.body;

  const allowed = ["CRM", "PURCHASE", "PRODUCTION", "SALES"];
  if (!Array.isArray(handles) || !handles.every((h) => allowed.includes(h))) {
    return res.status(400).json({ message: "Invalid handles specified" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { handles },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Handles updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error while updating handles" });
  }
});

/* ---------- NEW: Update multi 'roles' ---------- */
router.put("/users/:id/roles", authenticate, async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!validRolesArray(roles)) {
    return res.status(400).json({
      message: "Invalid roles array",
      allowed: ROLE_ENUM,
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { roles: Array.from(new Set(roles)).sort((a, b) => a.localeCompare(b)) },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Roles updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error while updating roles" });
  }
});

/* ---------- Expose role enum (optional helper for clients) ---------- */
router.get("/role-enum", authenticate, (_req, res) => {
  res.json({ roles: ROLE_ENUM });
});

module.exports = router;
