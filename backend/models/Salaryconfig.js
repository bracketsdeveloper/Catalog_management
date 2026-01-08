const mongoose = require("mongoose");

/**
 * SalaryConfig - Employee-specific salary configuration with new requirements
 */
const salaryConfigSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BASIC SALARY DETAILS
  // ─────────────────────────────────────────────────────────────────────────
  salaryOffered: { 
    type: Number, 
    required: true,
    min: 0 
  },
  
  salaryComponents: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // NEW: 99-HOUR RULE CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  dailyWorkHours: { 
    type: Number, 
    default: 9  // 10 AM to 7 PM = 9 hours
  },
  
  biWeeklyTargetHours: {
    type: Number,
    default: 99  // 11 working days × 9 hours
  },
  
  gracePeriodHours: {
    type: Number,
    default: 2  // No deduction for first 2 hours shortfall
  },
  
  hourlyDeductionRate: { 
    type: Number, 
    default: 500
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SATURDAYS OFF CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  saturdaysOffPattern: {
    type: String,
    enum: ['1st_3rd', '2nd_4th', 'all', 'none'],
    default: '1st_3rd'
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // LEAVE ENTITLEMENTS (NEW REQUIREMENTS)
  // ─────────────────────────────────────────────────────────────────────────
  // Sick Leave
  sickLeavePerMonth: {
    type: Number,
    default: 1
  },
  sickLeaveNonCumulative: {
    type: Boolean,
    default: true
  },
  
  // Earned Leave
  earnedLeavePer20Days: {
    type: Number,
    default: 1.25  // 1.25 days per 20 working days
  },
  maxCarryForwardEL: {
    type: Number,
    default: 30
  },
  elEncashmentAtYearEnd: {
    type: Boolean,
    default: true
  },
  
  // Special Leaves
  deathInFamilyLeave: {
    type: Number,
    default: 10
  },
  selfMarriageLeave: {
    type: Number,
    default: 2
  },
  
  // Holidays
  compulsoryHolidaysPerYear: {
    type: Number,
    default: 10
  },
  restrictedHolidaysPerYear: {
    type: Number,
    default: 2
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // WEEKEND DEDUCTION TIERS (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  weekendDeductionTiers: [
    new mongoose.Schema({
      minExcessDays: { type: Number, default: 0 },
      maxExcessDays: { type: Number, default: 0 },
      sundaysDeducted: { type: Number, default: 0 },
      description: { type: String, default: "" }
    }, { _id: false })
  ],
  
  // Default tiers (stored as a separate field, not in schema)
  defaultWeekendTiers: {
    type: mongoose.Schema.Types.Mixed,
    default: [
      { minExcessDays: 0, maxExcessDays: 2, sundaysDeducted: 0, description: "No weekend deduction" },
      { minExcessDays: 3, maxExcessDays: 4, sundaysDeducted: 1, description: "1 Sunday deduction" },
      { minExcessDays: 5, maxExcessDays: 6, sundaysDeducted: 2, description: "2 Sundays deduction" },
      { minExcessDays: 7, maxExcessDays: 999, sundaysDeducted: 4, description: "All Sundays (LOP for weekends)" }
    ]
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // WFH DEDUCTION RATES (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  emergencyWFHDeduction: {
    type: Number,
    default: 0.25  // 75% salary = deduct 25%
  },
  casualWFHDeduction: {
    type: Number,
    default: 0.50  // 50% salary = deduct 50%
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // PENALTIES (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  missedPunchPenalty: {
    type: Number,
    default: 250
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // PROBATION PERIOD (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  probationPeriodDays: {
    type: Number,
    default: 30
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ATTENDANCE BONUS (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  attendanceBonusAmount: {
    type: Number,
    default: 1000
  },
  attendanceBonusMonths: {
    type: Number,
    default: 4
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // DEPARTMENT WEIGHTAGE (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  departmentWeightage: {
    revenueWeightage: { type: Number, default: 80 }, // For sales
    attendanceWeightage: { type: Number, default: 20 }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUTORY DEDUCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  pfEnabled: { 
    type: Boolean, 
    default: true 
  },
  pfPercentage: { 
    type: Number, 
    default: 12
  },
  pfFixedAmount: {
    type: Number,
    default: 0
  },
  
  esiEnabled: { 
    type: Boolean, 
    default: false 
  },
  esiPercentage: { 
    type: Number, 
    default: 0.75
  },
  esiSalaryThreshold: {
    type: Number,
    default: 21000
  },
  
  professionalTaxEnabled: {
    type: Boolean,
    default: true
  },
  professionalTaxAmount: {
    type: Number,
    default: 200
  },
  
  tdsEnabled: {
    type: Boolean,
    default: false
  },
  tdsPercentage: {
    type: Number,
    default: 0
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BANK DETAILS
  // ─────────────────────────────────────────────────────────────────────────
  bankName: { type: String, trim: true },
  bankAccountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  uanNumber: { type: String, trim: true },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS & AUDIT
  // ─────────────────────────────────────────────────────────────────────────
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isProbation: { 
    type: Boolean, 
    default: true 
  },
  
  // Inheritance flags
  useGlobalSettings: { type: Boolean, default: true },
  useDepartmentSettings: { type: Boolean, default: false },
  
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  
  lastRevisedAt: {
    type: Date
  },
  
  revisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  
  notes: { type: String, trim: true }
  
}, { 
  timestamps: true 
});

// Indexes
salaryConfigSchema.index({ isActive: 1 });
salaryConfigSchema.index({ effectiveFrom: 1 });

// Pre-save to set default weekend tiers if not provided
salaryConfigSchema.pre('save', function(next) {
  if (!this.weekendDeductionTiers || this.weekendDeductionTiers.length === 0) {
    this.weekendDeductionTiers = this.defaultWeekendTiers || [
      { minExcessDays: 0, maxExcessDays: 2, sundaysDeducted: 0, description: "No weekend deduction" },
      { minExcessDays: 3, maxExcessDays: 4, sundaysDeducted: 1, description: "1 Sunday deduction" },
      { minExcessDays: 5, maxExcessDays: 6, sundaysDeducted: 2, description: "2 Sundays deduction" },
      { minExcessDays: 7, maxExcessDays: 999, sundaysDeducted: 4, description: "All Sundays (LOP for weekends)" }
    ];
  }
  next();
});

module.exports = mongoose.model("SalaryConfig", salaryConfigSchema);