const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

const expenseSchema = new mongoose.Schema({
  opportunityCode: { type: String, required: true },
  clientCompanyName: { type: String, required: true },
  clientName: { type: String, required: true },
  eventName: { type: String },
  crmName: { type: String },
  expenses: [{
    section: String,
    amount: Number,
    expenseDate: Date,
    remarks: String
  }],
  orderConfirmed: { type: Boolean, default: false },
  jobSheetNumber: { type: String }, // Include old field
  orderExpenses: [{ // Include old field
    section: String,
    amount: Number,
    expenseDate: Date,
    remarks: String
  }],
  jobSheets: [{
    jobSheetNumber: String,
    orderExpenses: [{
      section: String,
      amount: Number,
      expenseDate: Date,
      remarks: String
    }]
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const Expense = mongoose.model("Expense", expenseSchema);

async function migrateExpenses() {
  try {
    // Find documents with jobSheetNumber or orderExpenses, or where jobSheets is missing/empty
    const expenses = await Expense.find({
      $or: [
        { jobSheetNumber: { $exists: true } },
        { orderExpenses: { $exists: true } },
        { jobSheets: { $exists: false } },
        { jobSheets: { $size: 0 } }
      ]
    });
    console.log(`Found ${expenses.length} documents to migrate`);

    let migratedCount = 0;
    for (const exp of expenses) {
      // Skip if already migrated (has jobSheets and no jobSheetNumber/orderExpenses)
      if (exp.jobSheets?.length && !exp.jobSheetNumber && !exp.orderExpenses) {
        console.log(`Skipping already migrated expense ${exp._id}`);
        continue;
      }

      // Prepare jobSheet from old fields
      const jobSheet = {
        jobSheetNumber: exp.jobSheetNumber || "",
        orderExpenses: exp.orderExpenses || []
      };

      // Update document
      await Expense.updateOne(
        { _id: exp._id },
        {
          $set: { jobSheets: [jobSheet] },
          $unset: { jobSheetNumber: "", orderExpenses: "" }
        }
      );
      console.log(`Migrated expense ${exp._id}`);
      migratedCount++;
    }

    console.log(`Migration completed: ${migratedCount} documents migrated`);
    mongoose.connection.close();
  } catch (e) {
    console.error("Migration failed:", e);
    mongoose.connection.close();
    process.exit(1);
  }
}

migrateExpenses();