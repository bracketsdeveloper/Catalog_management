// server/models/Employee.js
const mongoose = require("mongoose");

// --- Personal (visible to self + admins) ---
const personalSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true, index: true },
    dob: { type: Date },
    address: { type: String },
    phone: { type: String, index: true },
    emergencyPhone: { type: String },
    aadhar: { type: String },
    bloodGroup: { type: String },
    dateOfJoining: { type: Date, index: true },
    medicalIssues: { type: String, default: "" },
  },
  { _id: false }
);

// --- Org (visible to self + admins) ---
const orgSchema = new mongoose.Schema(
  {
    role: { type: String, index: true },
    department: { type: String, index: true },
  },
  { _id: false }
);

// --- Assets (visible to self + admins) ---
const assetsSchema = new mongoose.Schema(
  {
    laptopSerial: { type: String },
    mousepad: { type: Boolean, default: false },
    mouse: { type: Boolean, default: false },
    mobileImei: { type: String },
    mobileNumber: { type: String },
    mobileCharger: { type: Boolean, default: false },
    neckband: { type: Boolean, default: false },
    bottle: { type: Boolean, default: false },
    diary: { type: Boolean, default: false },
    pen: { type: Boolean, default: false },
    laptopBag: { type: Boolean, default: false },
    rainCoverIssued: { type: Boolean, default: false },
    idCardsIssued: { type: Boolean, default: false },
    additionalProducts: [
      {
        name: { type: String, default: "" },
        serialOrDesc: { type: String, default: "" },
        issuedOn: { type: Date },
      },
    ],
  },
  { _id: false }
);

// --- Financial (visible ONLY to super admins) ---
const financialSchema = new mongoose.Schema(
  {
    bankName: { type: String },
    bankAccountNumber: { type: String },
    currentCTC: { type: Number, default: 0 },
    currentTakeHome: { type: Number, default: 0 },
    lastRevisedSalaryAt: { type: Date },
    nextAppraisalOn: { type: Date },
  },
  { _id: false }
);

// --- Schedule (expected work timings) ---
const scheduleSchema = new mongoose.Schema(
  {
    expectedLoginTime: { type: String, default: "" }, // "09:00 AM"
    expectedLogoutTime: { type: String, default: "" }, // "06:00 PM"
  },
  { _id: false }
);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function defaultLeaveMonthlyAllocation() {
  return MONTHS.map((m) => ({ month: m, earned: 0, sick: 0, additional: 0, special: 0 }));
}

// ✅ Monthly leave allocation schema (per employee)
const leaveMonthlyAllocationItemSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, enum: MONTHS },
    earned: { type: Number, default: 0, min: 0 },
    sick: { type: Number, default: 0, min: 0 },
    additional: { type: Number, default: 0, min: 0 },
    special: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    personal: { type: personalSchema, required: true },
    org: { type: orgSchema, default: {} },
    assets: { type: assetsSchema, default: {} },
    financial: { type: financialSchema, default: {} },
    schedule: { type: scheduleSchema, default: {} },

    biometricId: { type: String, index: true, default: "" },
    mappedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // ✅ Always normalize to 12 months for consistency (old employees auto-heal on save)
    leaveMonthlyAllocation: {
      type: [leaveMonthlyAllocationItemSchema],
      default: defaultLeaveMonthlyAllocation,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ "personal.name": "text", "org.role": "text", "org.department": "text" });

employeeSchema.pre("save", function (next) {
  if (this?.personal?.employeeId) {
    this.personal.employeeId = String(this.personal.employeeId).trim();
  }

  // ensure leaveMonthlyAllocation always has 12 months in correct order
  const current = Array.isArray(this.leaveMonthlyAllocation) ? this.leaveMonthlyAllocation : [];
  const map = new Map(current.map((x) => [String(x?.month || "").trim(), x]));
  const base = defaultLeaveMonthlyAllocation();

  this.leaveMonthlyAllocation = base.map((row) => {
    const got = map.get(row.month) || {};
    const n = (v) => (Number.isFinite(+v) ? Math.max(0, +(+v).toFixed(2)) : 0);
    return {
      month: row.month,
      earned: n(got.earned),
      sick: n(got.sick),
      additional: n(got.additional),
      special: n(got.special),
    };
  });

  next();
});

module.exports = mongoose.model("Employee", employeeSchema);
