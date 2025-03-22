// routes/subAdminRoutes.js

const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/User");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");


/**
 * GET /api/admin/sub-admins
 * Returns all users with role=ADMIN who are *not* the “super admin”
 * (assuming super admin = the user who is calling, or some condition)
 */
router.get("/admin/sub-admins", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // e.g. fetch all users with role=ADMIN
    const admins = await User.find({ role: "ADMIN" }).lean();

    // Optionally filter out "super admin" if you store that differently
    // For example, if super admin has some known email or user._id:
    // or store a separate field isSuperAdmin: true for the top-level admin.

    res.status(200).json(admins);
  } catch (error) {
    console.error("Error fetching sub-admins:", error);
    res.status(500).json({ message: "Failed to fetch sub-admins" });
  }
});

/**
 * POST /api/admin/sub-admins
 * Create a new sub-admin with certain permissions
 */
router.post("/admin/sub-admins", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, email, phone, password, permissions } = req.body;

    // Basic validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role=ADMIN (or SUB_ADMIN) and specified permissions
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,  // Store hashed password
      role: "ADMIN",             // or "SUB_ADMIN" if that's what you need
      isVerified: true,          // boolean 'true'
      permissions: permissions || [],
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating sub-admin:", error);
    res.status(500).json({ message: "Server error creating sub-admin" });
  }
});

/**
 * PUT /api/admin/sub-admins/:id
 * Update the sub-admin's permissions
 */
router.put("/admin/sub-admins/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Sub-admin user not found" });
    }
    if (user.role !== "ADMIN") {
      return res.status(400).json({ message: "User is not an admin" });
    }

    // Update the permissions
    user.permissions = permissions || [];
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    console.error("Error updating sub-admin:", error);
    res.status(500).json({ message: "Failed to update sub-admin" });
  }
});

/**
 * DELETE /api/admin/sub-admins/:id
 * Remove the sub-admin
 */
router.delete("/admin/sub-admins/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Sub-admin user not found" });
    }
    if (user.role !== "ADMIN") {
      return res.status(400).json({ message: "User is not an admin" });
    }

    // Possibly ensure we are not deleting the super admin
    await user.remove();
    res.status(200).json({ message: "Sub-admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting sub-admin:", error);
    res.status(500).json({ message: "Server error deleting sub-admin" });
  }
});

module.exports = router;
