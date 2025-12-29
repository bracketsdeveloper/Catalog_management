const mongoose = require("mongoose");

/**
 * SalaryRecord - Monthly salary calculation record
 * Stores all calculated values and final payable amount
 */
const salaryRecordSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  employeeName: {
    type: String,
    required: true
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // PERIOD
  // ─────────────────────────────────────────────────────────────────────────
  month: { 
    type: Number, 
    required: true,
    min: 1,
    max: 12
  },
  
  year: { 
    type: Number, 
    required: true 
  },
  
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  
  // ─────────────────────────────────────────────────────────────────────────
  // DAYS CALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  daysInMonth: { 
    type: Number, 
    required: true  // 28/30/31
  },
  
  totalWorkingDays: { 
    type: Number, 
    required: true  // Excluding Sundays, off Saturdays, holidays
  },
  
  daysAttended: { 
    type: Number, 
    default: 0 
  },
  
  // Leave details
  totalLeavesTaken: { 
    type: Number, 
    default: 0 
  },
  
  paidLeavesUsed: { 
    type: Number, 
    default: 0 
  },
  
  unpaidLeaves: {
    type: Number,
    default: 0
  },
  
  payLossDays: { 
    type: Number, 
    default: 0  // (Working Days - Days Attended) - Paid Leaves
  },
  
  // Days breakdown
  sundaysInMonth: { type: Number, default: 0 },
  saturdaysOff: { type: Number, default: 0 },
  saturdaysWorking: { type: Number, default: 0 },
  publicHolidays: { type: Number, default: 0 },
  restrictedHolidays: { type: Number, default: 0 },
  
  // Sundays paid (3-day rule)
  sundaysPaid: { type: Number, default: 0 },
  
  // To be paid for
  daysToBePaidFor: {
    type: Number,
    default: 0  // Days Attended + Paid Leaves
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // HOURS CALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  expectedWorkHoursPerDay: {
    type: Number,
    default: 9
  },
  
  totalExpectedHours: { 
    type: Number, 
    default: 0  // Working Days × Daily Hours
  },
  
  totalHoursWorked: { 
    type: Number, 
    default: 0  // From attendance
  },
  
  hoursShortfall: {
    type: Number,
    default: 0  // Expected - Worked (if positive)
  },
  
  overtimeHours: {
    type: Number,
    default: 0
  },
  
  // Bi-weekly breakdown
  biWeeklyCalculations: [{
    weekNumber: { type: Number },  // 1 or 2
    periodStart: { type: Date },
    periodEnd: { type: Date },
    expectedHours: { type: Number },
    actualHours: { type: Number },
    hoursShortfall: { type: Number },
    deductionAmount: { type: Number }
  }],
  
  // ─────────────────────────────────────────────────────────────────────────
  // SALARY CALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  salaryOffered: { 
    type: Number, 
    required: true  // Monthly salary
  },
  
  perDaySalary: {
    type: Number,
    default: 0  // Salary Offered / Days in Month
  },
  
  grossSalary: { 
    type: Number, 
    default: 0  // Per Day × Days to be paid for
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // DEDUCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  deductions: {
    // Hourly shortfall deduction
    hourlyDeduction: { 
      type: Number, 
      default: 0  // Hours missed × 500
    },
    hourlyDeductionRate: {
      type: Number,
      default: 500
    },
    
    // Pay loss deduction
    payLossDeduction: {
      type: Number,
      default: 0
    },
    
    // Statutory
    pfDeduction: { 
      type: Number, 
      default: 0 
    },
    esiDeduction: {
      type: Number,
      default: 0
    },
    professionalTax: { 
      type: Number, 
      default: 0 
    },
    tdsDeduction: { 
      type: Number, 
      default: 0 
    },
    
    // Other deductions
    damages: { 
      type: Number, 
      default: 0 
    },
    advanceSalaryRecovery: { 
      type: Number, 
      default: 0 
    },
    otherDeductions: { 
      type: Number, 
      default: 0 
    },
    otherDeductionsNote: {
      type: String,
      trim: true
    }
  },
  
  totalDeductions: { 
    type: Number, 
    default: 0 
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ADDITIONS
  // ─────────────────────────────────────────────────────────────────────────
  additions: {
    incentive: { 
      type: Number, 
      default: 0 
    },
    bonus: { 
      type: Number, 
      default: 0 
    },
    overtimePay: {
      type: Number,
      default: 0
    },
    reimbursements: {
      type: Number,
      default: 0
    },
    otherAdditions: { 
      type: Number, 
      default: 0 
    },
    otherAdditionsNote: {
      type: String,
      trim: true
    }
  },
  
  totalAdditions: { 
    type: Number, 
    default: 0 
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // FINAL CALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  netPayable: { 
    type: Number, 
    default: 0  // Gross - Deductions + Additions
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS & AUDIT
  // ─────────────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['draft', 'calculated', 'reviewed', 'approved', 'paid', 'cancelled'],
    default: 'draft',
    index: true
  },
  
  // Calculation details
  calculatedAt: { type: Date },
  calculatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  
  // Review/Approval workflow
  reviewedAt: { type: Date },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  reviewNotes: { type: String, trim: true },
  
  approvedAt: { type: Date },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  
  // Payment details
  paidAt: { type: Date },
  paymentReference: { type: String, trim: true },
  paymentMode: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'cash', 'upi', 'other'],
    default: 'bank_transfer'
  },
  
  // Manual adjustments
  manualAdjustments: [{
    description: { type: String },
    amount: { type: Number },
    type: { type: String, enum: ['addition', 'deduction'] },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    adjustedAt: { type: Date, default: Date.now }
  }],
  
  // Notes
  remarks: { type: String, trim: true },
  
  // For audit trail
  calculationDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
  
}, { 
  timestamps: true 
});

// Compound unique index - one record per employee per month
salaryRecordSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
salaryRecordSchema.index({ status: 1, month: 1, year: 1 });
salaryRecordSchema.index({ calculatedAt: 1 });

// Virtual for period display
salaryRecordSchema.virtual('periodDisplay').get(function() {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[this.month - 1]} ${this.year}`;
});

// Pre-save: Calculate totals
salaryRecordSchema.pre('save', function(next) {
  // Calculate total deductions
  this.totalDeductions = 
    (this.deductions.hourlyDeduction || 0) +
    (this.deductions.payLossDeduction || 0) +
    (this.deductions.pfDeduction || 0) +
    (this.deductions.esiDeduction || 0) +
    (this.deductions.professionalTax || 0) +
    (this.deductions.tdsDeduction || 0) +
    (this.deductions.damages || 0) +
    (this.deductions.advanceSalaryRecovery || 0) +
    (this.deductions.otherDeductions || 0);
  
  // Calculate total additions
  this.totalAdditions = 
    (this.additions.incentive || 0) +
    (this.additions.bonus || 0) +
    (this.additions.overtimePay || 0) +
    (this.additions.reimbursements || 0) +
    (this.additions.otherAdditions || 0);
  
  // Calculate net payable
  this.netPayable = this.grossSalary - this.totalDeductions + this.totalAdditions;
  
  // Add manual adjustments
  if (this.manualAdjustments && this.manualAdjustments.length > 0) {
    this.manualAdjustments.forEach(adj => {
      if (adj.type === 'addition') {
        this.netPayable += adj.amount;
      } else {
        this.netPayable -= adj.amount;
      }
    });
  }
  
  next();
});

module.exports = mongoose.model("SalaryRecord", salaryRecordSchema);