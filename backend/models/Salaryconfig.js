const mongoose = require("mongoose");

/**
 * SalaryConfig - Employee-specific salary configuration
 * Stores base salary, deduction rules, and work schedule settings
 */
const salaryConfigSchema = new mongoose.Schema({
  employeeId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SALARY DETAILS
  // ─────────────────────────────────────────────────────────────────────────
  salaryOffered: { 
    type: Number, 
    required: true,
    min: 0 
  },
  
  // Components breakdown (optional, for detailed payslip)
  salaryComponents: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // WORK SCHEDULE SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  dailyWorkHours: { 
    type: Number, 
    default: 9,  // 10 AM to 7 PM = 9 hours
    min: 1,
    max: 24
  },
  
  // Which Saturdays are off (1st, 2nd, 3rd, 4th, 5th)
  saturdaysOff: {
    type: [Number],
    default: [1, 3],  // 1st and 3rd Saturday off
    validate: {
      validator: function(arr) {
        return arr.every(n => n >= 1 && n <= 5);
      },
      message: 'Saturday numbers must be between 1 and 5'
    }
  },
  
  // Sunday always off
  sundayOff: { 
    type: Boolean, 
    default: true 
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // DEDUCTION RULES
  // ─────────────────────────────────────────────────────────────────────────
  hourlyDeductionRate: { 
    type: Number, 
    default: 500,  // Rs 500 per hour missed
    min: 0
  },
  
  // Bi-weekly calculation period (every 2 weeks)
  deductionPeriodDays: {
    type: Number,
    default: 14  // 2 weeks
  },
  
  // Minimum days worked to get Sunday paid
  minDaysForSundayPay: {
    type: Number,
    default: 3
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
    default: 12,  // 12% of basic
    min: 0,
    max: 100
  },
  pfFixedAmount: {
    type: Number,
    default: 0  // If fixed amount instead of percentage
  },
  
  esiEnabled: { 
    type: Boolean, 
    default: false 
  },
  esiPercentage: { 
    type: Number, 
    default: 0.75,
    min: 0,
    max: 100
  },
  
  professionalTaxEnabled: {
    type: Boolean,
    default: true
  },
  professionalTaxAmount: {
    type: Number,
    default: 200  // Fixed PT amount
  },
  
  tdsEnabled: {
    type: Boolean,
    default: false
  },
  tdsPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // LEAVE SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  paidLeavesPerMonth: {
    type: Number,
    default: 1.5,  // Earned leaves per month
    min: 0
  },
  
  maxCarryForwardLeaves: {
    type: Number,
    default: 30
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BANK DETAILS (for payment processing)
  // ─────────────────────────────────────────────────────────────────────────
  bankName: { type: String, trim: true },
  bankAccountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  uanNumber: { type: String, trim: true },  // PF UAN
  
  // ─────────────────────────────────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────────────────────────────────
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
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

// Index for efficient queries
salaryConfigSchema.index({ isActive: 1 });
salaryConfigSchema.index({ effectiveFrom: 1 });

module.exports = mongoose.model("SalaryConfig", salaryConfigSchema);