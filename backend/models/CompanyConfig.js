// ...existing requires...
const mongoose = require("mongoose");

const companyConfigSchema = new mongoose.Schema({
  companyName: { type: String, default: "Ace Print Pack / Ace Gifting Solutions" },

  attendanceSettings: {
    dailyWorkHours: { type: Number, default: 9 },
    standardStartTime: { type: String, default: "10:00" },
    standardEndTime: { type: String, default: "19:00" },
    officeHoursStart: { type: String, default: "09:00" },
    officeHoursEnd: { type: String, default: "20:00" }
  },

  biWeeklyRule: {
    targetHours: { type: Number, default: 99 },
    gracePeriodHours: { type: Number, default: 2 },
    deductionPerHour: { type: Number, default: 500 }
  },

  saturdaysPattern: {
    type: String,
    enum: ["1st_3rd", "2nd_4th", "all", "none"],
    default: "1st_3rd"
  },

  leavePolicy: {
    sickLeave: {
      perMonth: { type: Number, default: 1 },
      nonCumulative: { type: Boolean, default: true },
      cannotBeBundled: { type: Boolean, default: true }
    },
    earnedLeave: {
      per20WorkingDays: { type: Number, default: 1.25 },
      maxCarryForward: { type: Number, default: 30 },
      encashAtYearEnd: { type: Boolean, default: true },
      requires7DaysNotice: { type: Boolean, default: true },
      cannotBeBundled: { type: Boolean, default: true }
    },
    specialLeaves: {
      deathInFamily: { type: Number, default: 10 },
      selfMarriage: { type: Number, default: 2 }
    },
    holidays: {
      compulsoryPerYear: { type: Number, default: 10 },
      restrictedPerYear: { type: Number, default: 2 },
      canConvertToEL: { type: Boolean, default: true }
    },
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
    ]
  },

  wfhPolicy: {
    emergencyWFH: {
      salaryPercentage: { type: Number, default: 75 },
      deductionPercentage: { type: Number, default: 25 }
    },
    casualWFH: {
      salaryPercentage: { type: Number, default: 50 },
      deductionPercentage: { type: Number, default: 50 }
    },
    requiresPermission: { type: Boolean, default: true }
  },

  disciplinePolicy: {
    missedPunchPenalty: { type: Number, default: 250 },
    ncncPenalty: {
      maxInstancesPerQuarter: { type: Number, default: 2 },
      action: { type: String, default: "termination" }
    },
    overtimePolicy: {
      noMonetaryCompensation: { type: Boolean, default: true },
      forAppraisalOnly: { type: Boolean, default: true }
    }
  },

  eligibilityPolicy: {
    probationPeriodDays: { type: Number, default: 30 },
    benefitsStartAfterProbation: { type: Boolean, default: true },
    firstMonthPayBasis: { type: String, default: "per_day_present" }
  },

  incentives: {
    attendanceBonus: {
      amount: { type: Number, default: 1000 },
      consecutiveMonths: { type: Number, default: 4 },
      requires100Percent: { type: Boolean, default: true }
    },

    // ✅ NEW: Accuracy Bonus (default ₹1000 every month)
    accuracyBonus: {
      amount: { type: Number, default: 1000 },
      frequency: { type: String, enum: ["monthly", "quarterly", "yearly"], default: "monthly" }
    },

    departmentWeightage: [
      new mongoose.Schema(
        {
          department: { type: String },
          revenueWeightage: { type: Number, default: 80 },
          attendanceWeightage: { type: Number, default: 20 }
        },
        { _id: false }
      )
    ]
  },

  defaultSalaryBreakdown: {
    basicPercentage: { type: Number, default: 45 },
    hraPercentage: { type: Number, default: 22.5 },
    conveyancePercentage: { type: Number, default: 12.5 },
    medicalPercentage: { type: Number, default: 0 },
    specialPercentage: { type: Number, default: 15 },
    otherPercentage: { type: Number, default: 5 }
  },

  statutoryDefaults: {
    pfPercentage: { type: Number, default: 12 },
    esiPercentage: { type: Number, default: 0.75 },
    esiSalaryThreshold: { type: Number, default: 21000 },
    professionalTax: { type: Number, default: 200 }
  },

  financialYear: {
    startMonth: { type: Number, default: 4 },
    startDay: { type: Number, default: 1 },
    endMonth: { type: Number, default: 3 },
    endDay: { type: Number, default: 31 }
  },

  isActive: { type: Boolean, default: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastUpdatedAt: { type: Date, default: Date.now },
  version: { type: String, default: "2026.1" },
  policyDocumentPath: { type: String }
}, { timestamps: true });

companyConfigSchema.pre("save", function (next) {
  if (!this.leavePolicy.weekendDeductionTiers || this.leavePolicy.weekendDeductionTiers.length === 0) {
    this.leavePolicy.weekendDeductionTiers = [
      { minExcessDays: 0, maxExcessDays: 2, sundaysDeducted: 0, description: "No weekend deduction" },
      { minExcessDays: 3, maxExcessDays: 4, sundaysDeducted: 1, description: "1 Sunday deduction" },
      { minExcessDays: 5, maxExcessDays: 6, sundaysDeducted: 2, description: "2 Sundays deduction" },
      { minExcessDays: 7, maxExcessDays: 999, sundaysDeducted: 4, description: "All Sundays (LOP for weekends)" }
    ];
  }

  // ✅ ensure accuracyBonus exists with defaults
  if (!this.incentives) this.incentives = {};
  if (!this.incentives.accuracyBonus) {
    this.incentives.accuracyBonus = { amount: 1000, frequency: "monthly" };
  }

  next();
});

module.exports = mongoose.model("CompanyConfig", companyConfigSchema);
