// Dependencies
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const axios = require("axios");

// Load environment variables
dotenv.config();

// Initialize app
const app = express();
app.use(express.json());

// Configure CORS for frontend (localhost:3000)
const allowedOrigins = ['http://localhost:3000', 'https://catalog-management.vercel.app'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});


const syncRoutes = require("./routes/syncRoutes");
app.use("/api", syncRoutes);
// console.log("SheetDB URL:", process.env.SHEETDB_URL);




// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

const emailVerificationRoutes = require("./routes/emailVerification");

app.use("/api/auth", authRoutes);

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);


app.use("/api/auth", emailVerificationRoutes);

const subAdminRoutes = require('./routes/subAdminRoutes');
app.use('/api', subAdminRoutes);

//update 
const catalogRoutes = require("./routes/catalogRoutes");
app.use("/api/admin", catalogRoutes);

const advancedSearchRoutes = require("./routes/advancedSearchRoutes.js");
app.use("/api/products", advancedSearchRoutes);

// const viewersmanagerRoutes = ;
app.use("/api/viewer",require("./routes/viewersRoutes.js"))
app.use("/api/admin",require("./routes/viewersRoutes.js"))
//editable
app.use("/api/admin",require("./routes/quotationRoutes.js"))

const adminMeRoutes = require("./routes/adminMe");
app.use("/api/admin", adminMeRoutes);

app.use("/api/admin",require("./routes/jobsheetRoutes.js"))
app.use("/api/admin",require("./routes/companyRoutes.js"))

app.use("/api", require("./routes/erpRoutes.js"));

// after other routes...
const opportunityRoutes = require("./routes/opportunityRoutes");
app.use("/api/admin", opportunityRoutes);
app.use("/api/admin/openPurchases", require("./routes/openPurchases.js"));
app.use("/api/admin/purchaseInvoice", require("./routes/purchaseInvoice")); 
app.use("/api/admin/productionjobsheets", require("./routes/productionJobsheetRoutes.js"));
app.use("/api/admin", require('./routes/productionInvoice.js'))
app.use("/api/admin/closedPurchases", require("./routes/closedPurchasesRoutes.js"));

app.use("/api/admin/productionjobsheetinvoice", require("./routes/productionjobsheetinvoice"));

const pendingPackingRoutes = require("./routes/pendingpacking");
app.use("/api/admin/packing-pending", pendingPackingRoutes);

const dispatchRoutes = require("./routes/dispatchschedule");
app.use("/api/admin/dispatch-schedule", dispatchRoutes);


const deliveryRoutes = require("./routes/deliveryreports");
app.use("/api/admin/delivery-reports", deliveryRoutes);


const deliveryCompletedRoutes = require("./routes/deliveryCompleted");
app.use("/api/admin/delivery-completed", deliveryCompletedRoutes);


// in backend/index.js (or app.js)
const jobSheetExportRouter = require("./routes/jobsheetExport.js");
app.use("/api/admin/jobsheets", jobSheetExportRouter);


const invoiceFollowUpRoutes = require("./routes/invoiceFollowUp");
app.use("/api/admin/invoice-followup", invoiceFollowUpRoutes);
// app.use("/api/reports" ,reportRoutes)

// backend/app.js (or server.js)
// ... other imports ...
const invoicesSummaryRoutes = require("./routes/invoiceSummary.js");
app.use("/api/admin/invoices-summary", invoicesSummaryRoutes);

// ... rest of the server code ...
const paymentFollowUpRoutes = require("./routes/paymentfollowup");
app.use("/api/admin/payment-followup", paymentFollowUpRoutes);

// ... other imports
const samplesRouter = require("./routes/samples");
app.use("/api/admin/samples", samplesRouter);

const sampleOutRoutes  = require("./routes/sampleOutRoutes"); // the “Samples Out” routes
app.use("/api/admin/sample-outs", sampleOutRoutes);

const expenseRoutes = require("./routes/expenseRoutes");
app.use("/api/admin", expenseRoutes);

// Start server (original)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
