// routes/adminMe.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");

// GET /api/admin/me - returns the authenticated admin's details
router.get("/me", authenticate, (req, res) => {
  // Assuming your authentication middleware attaches the user object to req.user
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json(req.user);
});

module.exports = router;
