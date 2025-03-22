const express = require("express");
const { authenticate, authorizeAdmin } = require("../middlewares/authenticate");

const router = express.Router();

// Protected route for authenticated users
router.get("/protected", authenticate, (req, res) => {
  res.json({ message: "Access granted to protected route", user: req.user });
});

// Admin-only route
router.get("/admin", authenticate, authorizeAdmin, (req, res) => {
  res.json({ message: "Access granted to admin route" });
});

module.exports = router;
