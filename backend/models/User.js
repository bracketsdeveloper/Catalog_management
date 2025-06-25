const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
  handles: {
    type: [String],
    enum: ["CRM", "PURCHASE", "PRODUCTION", "SALES"],
    default: [],
  },
  isVerified: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  permissions: { type: [String], default: [] },
  accessibleProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  visibleAttributes: { type: [String], default: [] },
  maxLogins: { type: Number, default: 1 },
  loginCount: { type: Number, default: 0 },
  singleSession: { type: Boolean, default: false },
  sessionUsed: { type: Boolean, default: false },
  resetPasswordOtp: { type: String },
  resetPasswordOtpExpires: { type: Date },
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