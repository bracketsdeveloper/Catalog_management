const mongoose = require("mongoose");

const WeekBreakdownSchema = new mongoose.Schema(
  {
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },

    expectedHours: { type: Number, default: 0 }, // only working days (excl leave/holiday)
    actualHours: { type: Number, default: 0 },   // from attendance (+ special leave = 9h)
    missedHours: { type: Number, default: 0 },   // max(0, expected-actual)

    hourlyDeduction: { type: Number, default: 0 }, // ceil(missed) * 500

    payableWorkingDays: { type: Number, default: 0 }, // working days with attendance/leave etc (not offs)
    paidSundays: { type: Number, default: 0 },        // compliance Sundays paid
    notes: { type: String, default: "" }
  },
  { _id: false }
);

const SalaryRecordSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true }, // "personal.employeeId"
    employeeName: { type: String, default: "" },
    department: { type: String, default: "" },
    role: { type: String, default: "" },

    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },

    frequency: {
      type: String,
      enum: ["weekly", "biweekly", "monthly", "custom"],
      default: "custom"
    },

    // Inputs
    salaryOffered: { type: Number, default: 0 }, // monthly/period offered (you decide)
    pfTaxDeduction: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    damages: { type: Number, default: 0 },
    advanceRecovery: { type: Number, default: 0 },

    // Computed
    payableDays: { type: Number, default: 0 },     // "To be paid for"
    grossSalary: { type: Number, default: 0 },     // prorated from salaryOffered & payableDays
    expectedHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    missedHours: { type: Number, default: 0 },

    hourlyDeduction: { type: Number, default: 0 },

    takeHome: { type: Number, default: 0 },

    weeks: { type: [WeekBreakdownSchema], default: [] },

    meta: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      note: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

SalaryRecordSchema.index({ employeeId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports = mongoose.model("SalaryRecord", SalaryRecordSchema);
