const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* Canonical role list (alphabetical) */
const ROLE_ENUM = [
  "ACCOUNTS",
  "ADMIN",
  "CRM",
  "DESIGN",
  "HR",
  "PROCESS",
  "PRODUCTION",
  "PURCHASE",
  "SALES",
];

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Basics
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true },

    // Auth
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false },

    // Account status (kept for backwards-compat where GENERAL meant deactivated)
    role: {
      type: String,
      enum: ["ADMIN", "GENERAL", "VIEWER"],
      default: "GENERAL",
    },

    // NEW: multi-role access
    roles: {
      type: [String],
      enum: ROLE_ENUM,
      default: [],
      index: true,
    },

    // Legacy “handles” kept for compatibility (you can phase out later)
    handles: {
      type: [String],
      enum: ["CRM", "PURCHASE", "PRODUCTION", "SALES"],
      default: [],
    },

    // Fine-grained permission flags (already used elsewhere)
    permissions: { type: [String], default: [] },

    // Product visibility gates
    accessibleProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    visibleAttributes: { type: [String], default: [] },

    // Session constraints
    maxLogins: { type: Number, default: 1 },
    loginCount: { type: Number, default: 0 },
    singleSession: { type: Boolean, default: false },
    sessionUsed: { type: Boolean, default: false },

    // Password reset
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpires: { type: Date },

    // Profile extras used by your routes
    dateOfBirth: { type: Date },
    address: { type: String, default: "" },
    profiles: { type: [profileSchema], default: [] },
  },
  { timestamps: true }
);

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
module.exports.ROLE_ENUM = ROLE_ENUM;
