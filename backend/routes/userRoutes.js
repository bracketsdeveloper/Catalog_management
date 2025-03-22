const express = require("express");
const User = require("../models/User");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/edit", authenticate, async (req, res) => {
  const { name, dateOfBirth, address } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update fields
    user.name = name || user.name;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.address = address || user.address;

    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Fetch all users
router.get("/users", authenticate, async (req, res) => {
  console.log("Request to fetch all users received.");
  try {
    const users = await User.find({}, "name dateOfBirth address email phone role");
    console.log("Users fetched successfully:", users);
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

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

// Update user role
router.put("/users/:id/role", authenticate, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  console.log(`Request to update role for user ${id} to ${role}.`);
  if (!["GENERAL", "ADMIN"].includes(role)) {
    console.error("Invalid role specified:", role);
    return res.status(400).json({ message: "Invalid role specified" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      console.error("User not found:", id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User role updated successfully:", user);
    res.status(200).json({ message: "Role updated successfully", user });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ message: "Server error while updating role" });
  }
});

module.exports = router;
