// middleware/authenticate.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Basic authentication middleware
async function authenticate(req, res, next) {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Admin authorization middleware
function authorizeAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
}

// Expert authorization middleware

module.exports = {
  authenticate,
  authorizeAdmin,
};
