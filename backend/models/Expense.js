const mongoose = require("mongoose");

const expenseItemSchema = new mongoose.Schema({
  section: { type: String, required: true },
  amount: { type: Number, required: true },
  expenseDate: { type: Date, required: true },
  remarks: { type: String }
});

const jobSheetSchema = new mongoose.Schema({
  jobSheetNumber: { type: String, required: true, minlength: 1 }, // Ensure non-empty
  orderExpenses: [expenseItemSchema]
});

const expenseSchema = new mongoose.Schema({
  opportunityCode: { type: String, required: true, minlength: 1 },
  clientCompanyName: { type: String, required: true, minlength: 1 },
  clientName: { type: String, required: true, minlength: 1 },
  eventName: { type: String },
  crmName: { type: String },
  expenses: [expenseItemSchema],
  orderConfirmed: { type: Boolean, default: false },
  jobSheets: [jobSheetSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);