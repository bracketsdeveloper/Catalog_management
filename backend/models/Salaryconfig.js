const mongoose = require("mongoose");

const salaryConfigSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, index: true },

  salaryOffered: { type: Number, required: true, min: 0 },

  salaryComponents: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  dailyWorkHours: { type: Number, default: 9 },
  biWeeklyTargetHours: { type: Number, default: 99 },
  gracePeriodHours: { type: Number, default: 2 },
  hourlyDeductionRate: { type: Number, default: 500 },

  saturdaysOffPattern: {
    type: String,
    enum: ["1st_3rd", "2nd_4th", "all", "none"],
    default: "1st_3rd"
  },

  sickLeavePerMonth: { type: Number, default: 1 },
  sickLeaveNonCumulative: { type: Boolean, default: true },

  earnedLeavePer20Days: { type: Number, default: 1.25 },
  maxCarryForwardEL: { type: Number, default: 30 },
  elEncashmentAtYearEnd: { type: Boolean, default: true },

  deathInFamilyLeave: { type: Number, default: 10 },
  selfMarriageLeave: { type: Number, default: 2 },

  compulsoryHolidaysPerYear: { type: Number, default: 10 },
  restrictedHolidaysPerYear: { type: Number, default: 2 },

  weekendDeductionTiers: [
    new mongoose.Schema(
      {
        minExcessDays: { type: Number, default: 0 },
        maxExcessDays: { type: Number, default: 0 },
        sundaysDeducted: { type: Number, default: 0 },
        description: { type: String, default: "" }
      },
      { _id: false }
    )
  ],

  defaultWeekendTiers: {
    type: mongoose.Schema.Types.Mixed,
    default: [
      { minExcessDays: 0, maxExcessDays: 2, sundaysDeducted: 0, description: "No weekend deduction" },
      { minExcessDays: 3, maxExcessDays: 4, sundaysDeducted: 1, description: "1 Sunday deduction" },
      { minExcessDays: 5, maxExcessDays: 6, sundaysDeducted: 2, description: "2 Sundays deduction" },
      { minExcessDays: 7, maxExcessDays: 999, sundaysDeducted: 4, description: "All Sundays (LOP for weekends)" }
    ]
  },

  emergencyWFHDeduction: { type: Number, default: 0.25 },
  casualWFHDeduction: { type: Number, default: 0.5 },

  missedPunchPenalty: { type: Number, default: 250 },
  probationPeriodDays: { type: Number, default: 30 },

  attendanceBonusAmount: { type: Number, default: 1000 },
  attendanceBonusMonths: { type: Number, default: 4 },

  // ✅ NEW: Accuracy Bonus per employee
  accuracyBonusAmount: { type: Number, default: 1000 },
  accuracyBonusFrequency: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly"
  },

  departmentWeightage: {
    revenueWeightage: { type: Number, default: 80 },
    attendanceWeightage: { type: Number, default: 20 }
  },

  pfEnabled: { type: Boolean, default: true },
  pfPercentage: { type: Number, default: 12 },
  pfFixedAmount: { type: Number, default: 0 },

  esiEnabled: { type: Boolean, default: false },
  esiPercentage: { type: Number, default: 0.75 },
  esiSalaryThreshold: { type: Number, default: 21000 },

  professionalTaxEnabled: { type: Boolean, default: true },
  professionalTaxAmount: { type: Number, default: 200 },

  tdsEnabled: { type: Boolean, default: false },
  tdsPercentage: { type: Number, default: 0 },

  bankName: { type: String, trim: true },
  bankAccountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  uanNumber: { type: String, trim: true },

  isActive: { type: Boolean, default: true },
  isProbation: { type: Boolean, default: true },

  useGlobalSettings: { type: Boolean, default: true },
  useDepartmentSettings: { type: Boolean, default: false },

  effectiveFrom: { type: Date, default: Date.now },
  lastRevisedAt: { type: Date },
  revisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  notes: { type: String, trim: true }
}, { timestamps: true });

salaryConfigSchema.index({ isActive: 1 });
salaryConfigSchema.index({ effectiveFrom: 1 });

salaryConfigSchema.pre("save", function (next) {
  if (!this.weekendDeductionTiers || this.weekendDeductionTiers.length === 0) {
    this.weekendDeductionTiers = this.defaultWeekendTiers || [
      { minExcessDays: 0, maxExcessDays: 2, sundaysDeducted: 0, description: "No weekend deduction" },
      { minExcessDays: 3, maxExcessDays: 4, sundaysDeducted: 1, description: "1 Sunday deduction" },
      { minExcessDays: 5, maxExcessDays: 6, sundaysDeducted: 2, description: "2 Sundays deduction" },
      { minExcessDays: 7, maxExcessDays: 999, sundaysDeducted: 4, description: "All Sundays (LOP for weekends)" }
    ];
  }

  // ✅ ensure defaults exist even if older docs
  if (this.accuracyBonusAmount === undefined || this.accuracyBonusAmount === null) {
    this.accuracyBonusAmount = 1000;
  }
  if (!this.accuracyBonusFrequency) {
    this.accuracyBonusFrequency = "monthly";
  }

  next();
});

module.exports = mongoose.model("SalaryConfig", salaryConfigSchema);
