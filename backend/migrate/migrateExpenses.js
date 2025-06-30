const mongoose = require("mongoose");
require("dotenv").config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const expenseSchema = new mongoose.Schema({
  opportunityCode: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  clientName: { type: String, required: true },
  eventName: { type: String },
  crmName: { type: String },
  expenses: [{ section: String, amount: Number, expenseDate: Date, remarks: String }],
  orderConfirmed: { type: Boolean, default: false },
  jobSheets: [{ jobSheetNumber: String, orderExpenses: [{ section: String, amount: Number, expenseDate: Date, remarks: String }] }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const Expense = mongoose.model("Expense", expenseSchema);

async function migrateExpenses() {
  try {
    const expenses = await Expense.find({ jobSheets: { $exists: false } }); // Find unmigrated documents
    console.log(`Found ${expenses.length} documents to migrate`);

    for (const exp of expenses) {
      if (exp.jobSheetNumber || exp.orderExpenses?.length) {
        const jobSheet = {
          jobSheetNumber: exp.jobSheetNumber || "",
          orderExpenses: exp.orderExpenses || []
        };
        exp.jobSheets = [jobSheet];
        exp.jobSheetNumber = undefined;
        exp.orderExpenses = undefined;
        await exp.save();
        console.log(`Migrated expense ${exp._id}`);
      }
    }
    console.log("Migration completed");
    mongoose.connection.close();
  } catch (e) {
    console.error("Migration failed:", e);
    mongoose.connection.close();
  }
}

migrateExpenses();