const mongoose = require("mongoose");

// --- Personal (visible to self + admins) ---
const personalSchema = new mongoose.Schema({
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
}, { _id: false });

// --- Org (visible to self + admins) ---
const orgSchema = new mongoose.Schema({
  role: { type: String, index: true },
  department: { type: String, index: true },
}, { _id: false });

// --- Assets (visible to self + admins) ---
const assetsSchema = new mongoose.Schema({
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
  additionalProducts: [{
    name: String,
    serialOrDesc: String,
    issuedOn: Date
  }]
}, { _id: false });

// --- Financial (visible ONLY to super admins) ---
const financialSchema = new mongoose.Schema({
  bankName: { type: String },
  bankAccountNumber: { type: String },
  currentCTC: { type: Number, default: 0 },
  currentTakeHome: { type: Number, default: 0 },
  lastRevisedSalaryAt: { type: Date },
  nextAppraisalOn: { type: Date },
}, { _id: false });

// --- Schedule (expected work timings) ---
const scheduleSchema = new mongoose.Schema({
  expectedLoginTime: { type: String, default: "" },   // Format: "09:00 AM"
  expectedLogoutTime: { type: String, default: "" },  // Format: "06:00 PM"
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  personal: { type: personalSchema, required: true },
  org: { type: orgSchema, default: {} },
  assets: { type: assetsSchema, default: {} },
  financial: { type: financialSchema, default: {} },
  schedule: { type: scheduleSchema, default: {} },  // NEW: Schedule field

  biometricId: { type: String, index: true, default: "" }, // eSSL Biometric ID
  mappedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

employeeSchema.index({ "personal.name": "text", "org.role": "text", "org.department": "text" });

// normalize employeeId before save to avoid join mismatches
employeeSchema.pre("save", function(next) {
  if (this?.personal?.employeeId) {
    this.personal.employeeId = String(this.personal.employeeId).trim();
  }
  next();
});

module.exports = mongoose.model("Employee", employeeSchema);