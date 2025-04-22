// api/index.js
const serverless = require("serverless-http");
const express    = require("express");
const mongoose   = require("mongoose");
const dotenv     = require("dotenv");

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(express.json());

// Configure CORS for frontend origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://catalog-management.vercel.app'
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,PATCH,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Database connection (cached)
const MONGO_URI = process.env.MONGO_URI;
let isConnected = false;
async function connectToDatabase() {
  if (isConnected) return;
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  isConnected = true;
  console.log('MongoDB connected');
}
connectToDatabase().catch(err => console.error('MongoDB connection error:', err));

// Route imports
const syncRoutes              = require("./routes/syncRoutes");
const authRoutes              = require("./routes/authRoutes");
const emailVerificationRoutes = require("./routes/emailVerification");
const userRoutes              = require("./routes/userRoutes");
const adminRoutes             = require("./routes/adminRoutes");
const subAdminRoutes          = require("./routes/subAdminRoutes");
const catalogRoutes           = require("./routes/catalogRoutes");
const advancedSearchRoutes    = require("./routes/advancedSearchRoutes");
const viewersRoutes           = require("./routes/viewersRoutes");
const quotationRoutes         = require("./routes/quotationRoutes");
const adminMeRoutes           = require("./routes/adminMe");
const jobsheetRoutes          = require("./routes/jobsheetRoutes");
const companyRoutes           = require("./routes/companyRoutes");
const erpRoutes               = require("./routes/erpRoutes");
const opportunityRoutes       = require("./routes/opportunityRoutes");
const openPurchasesRoutes     = require("./routes/openPurchases");
const purchaseInvoiceRoutes   = require("./routes/purchaseInvoice");
const productionJobsheetRoutes= require("./routes/productionJobsheetRoutes");
const productionInvoiceRoutes = require("./routes/productionInvoice");
const closedPurchasesRoutes   = require("./routes/closedPurchasesRoutes");
const productionjsInvoice     = require("./routes/productionjobsheetinvoice");
const pendingPackingRoutes    = require("./routes/pendingpacking");
const dispatchScheduleRoutes  = require("./routes/dispatchschedule");
const deliveryReportsRoutes   = require("./routes/deliveryreports");
const deliveryCompletedRoutes = require("./routes/deliveryCompleted");
const jobSheetExportRouter    = require("./routes/jobsheetExport");

// Route mounting
app.use("/api", syncRoutes);
app.use("/api", subAdminRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/auth", emailVerificationRoutes);

app.use("/api/user", userRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/admin", catalogRoutes);
app.use("/api/admin", quotationRoutes);
app.use("/api/admin", adminMeRoutes);
app.use("/api/admin", jobsheetRoutes);
app.use("/api/admin", companyRoutes);
app.use("/api/admin", opportunityRoutes);
app.use("/api/admin/openPurchases", openPurchasesRoutes);
app.use("/api/admin/purchaseInvoice", purchaseInvoiceRoutes);
app.use("/api/admin/productionjobsheets", productionJobsheetRoutes);
app.use("/api/admin/productionjobsheetinvoice", productionjsInvoice);
app.use("/api/admin/productionInvoice", productionInvoiceRoutes);
app.use("/api/admin/closedPurchases", closedPurchasesRoutes);
app.use("/api/admin/packing-pending", pendingPackingRoutes);
app.use("/api/admin/dispatch-schedule", dispatchScheduleRoutes);
app.use("/api/admin/delivery-reports", deliveryReportsRoutes);
app.use("/api/admin/delivery-completed", deliveryCompletedRoutes);
app.use("/api/admin/jobsheets", jobSheetExportRouter);

app.use("/api/products", advancedSearchRoutes);
app.use("/api/viewer", viewersRoutes);
app.use("/api/admin", viewersRoutes);

// Export for Vercel
module.exports = serverless(app);
