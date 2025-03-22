const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["ADMIN", "GENERAL", "VIEWER"],
    default: "GENERAL",
  },
  isVerified: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  permissions: { type: [String], default: [] },
  // For VIEWER role:
  accessibleProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  visibleAttributes: { type: [String], default: [] },
  // New fields for login limits:
  maxLogins: { type: Number, default: 1 },   // e.g. 2 means user can log in twice
  loginCount: { type: Number, default: 0 },    // how many logins have been used
  // Retain these if needed (or remove if replacing entirely)
  singleSession: { type: Boolean, default: false },
  sessionUsed: { type: Boolean, default: false },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("User", userSchema);
