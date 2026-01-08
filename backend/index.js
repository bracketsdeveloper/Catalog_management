// index.js
// -------------
// Single-process Express server + gzip compression (no clustering)

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');
const cors = require('cors');
const axios = require('axios'); // kept in case some routes rely on it

const app = express();

// 1) Enable gzip/deflate compression for all responses
app.use(compression());

// 2) Body parsers with generous limits
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 3) CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://69.62.73.158:3001',
  'https://catalog-management.vercel.app',
  'https://pacer2gift.in',
  "http://91.230.110.152:3001",
  "https://backup.pacer2gift.in/api",
  "http://103.118.16.67:3001"
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 4) Initial routes
const syncRoutes = require('./routes/syncRoutes');
app.use('/api', syncRoutes);

// 5) MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// 6) Import and mount all your existing routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const emailVerificationRoutes = require('./routes/emailVerification');
const subAdminRoutes = require('./routes/subAdminRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const advancedSearchRoutes = require('./routes/advancedSearchRoutes.js');
// const configurationRoutes = require('./routes/configuration.js');

app.use('/api/auth', authRoutes);
app.use('/api/auth', emailVerificationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', subAdminRoutes);
app.use('/api/admin', catalogRoutes);
app.use('/api/products', advancedSearchRoutes);

// Viewer & Quotation
app.use('/api/viewer', require('./routes/viewersRoutes.js'));
app.use('/api/admin', require('./routes/viewersRoutes.js'));
app.use('/api/admin', require('./routes/quotationRoutes.js'));

// Admin-me, jobsheets, company
app.use('/api/admin', require('./routes/adminMe'));
app.use('/api/admin', require('./routes/jobsheetRoutes.js'));
app.use('/api/admin', require('./routes/companyRoutes.js'));

// ERP
app.use('/api', require('./routes/erpRoutes.js'));

// Vendor & opportunity
app.use('/api/admin', require('./routes/vendorRoutes'));
app.use('/api/admin', require('./routes/opportunityRoutes'));
app.use('/api/admin/openPurchases', require('./routes/openPurchases.js'));
app.use('/api/admin/purchaseInvoice', require('./routes/purchaseInvoice'));
app.use('/api/admin/productionjobsheets', require('./routes/productionJobsheetRoutes.js'));
app.use('/api/admin', require('./routes/productionInvoice.js'));
app.use('/api/admin/closedPurchases', require('./routes/closedPurchasesRoutes.js'));
app.use('/api/admin/productionjobsheetinvoice', require('./routes/productionjobsheetinvoice'));

// Packing, dispatch, delivery
app.use('/api/admin/packing-pending', require('./routes/pendingpacking'));
app.use('/api/admin/dispatch-schedule', require('./routes/dispatchschedule'));
app.use('/api/admin/delivery-reports', require('./routes/deliveryreports'));
app.use('/api/admin/delivery-completed', require('./routes/deliveryCompleted'));

// Jobsheet export, invoice follow-up, summaries
app.use('/api/admin/jobsheets', require('./routes/jobsheetExport.js'));
app.use('/api/admin/invoice-followup', require('./routes/invoiceFollowUp'));
app.use('/api/admin/invoices-summary', require('./routes/invoiceSummary.js'));
app.use('/api/admin/payment-followup', require('./routes/paymentfollowup'));

// Samples, sample-outs, expenses, potential clients, events, segments, branding, logistics, logs
app.use('/api/admin/samples', require('./routes/samples'));
app.use('/api/admin/sample-outs', require('./routes/sampleOutRoutes'));
app.use('/api/admin', require('./routes/expenseRoutes'));
app.use('/api/admin', require('./routes/potentialClientRoutes'));
app.use('/api/admin', require('./routes/eventRoutes'));
app.use('/api/admin', require('./routes/segmentRoutes.js'));
app.use('/api/admin/branding-charges', require('./routes/brandingChargeRoutes'));
app.use('/api/logistics', require('./routes/logisticsRoutes'));
app.use('/api/admin/logs', require('./routes/logs'));

// Delivery challan & tasks
app.use('/api/admin', require('./routes/deliveryChallan.js'));
app.use('/api/admin', require('./routes/taskRoutes.js'));

// E-Invoices
const eInvoiceRoutes = require('./routes/eInvoiceRoutes');
app.use('/api/admin/einvoices', eInvoiceRoutes);

// Android activity
const androidActivityRoutes = require('./routes/androidActivityRoutes.js');
app.use('/api/android/activity', androidActivityRoutes);

// Android location & battery
app.use('/api/android/location', require('./routes/androidLocationRoutes.js'));
app.use('/api/android/battery', require('./routes/androidBatteryRoutes.js'));

// Destinations (admin + public)
app.use('/api/admin/destinations', require('./routes/destinationRoutes.js'));
app.use('/api', require('./routes/destinationRoutes.js'));

// Destination arrival + user tracking
app.use('/api', require('./routes/destinationArrivalRoutes.js'));
app.use('/api/admin', require('./routes/userTrackingRoutes'));


app.use("/api/admin", require("./routes/adminInvoices"));

// server/index.js (or registerRoutes)
app.use("/api/admin", require("./routes/admin/holidays"));

// Add this to your existing app.js
const fileRoutes = require("./routes/files");
app.use("/api/files", fileRoutes);


const bankStatementRoutes = require("./routes/bankStatements");
app.use("/api/bank-statements", bankStatementRoutes);

// server.js or index.js
const invoicesEinvoiceRoutes = require("./routes/invoices.einvoice");
app.use("/api/admin", invoicesEinvoiceRoutes);

const meRoutes = require("./routes/meRoutes");

// ...
app.use("/api", meRoutes);

app.use('/api', require('./routes/hrms'));

// server/index.js (or routes/index.js)
app.use("/api/admin/purchase-orders", require("./routes/purchaseOrders.js"));

const attendanceRoutes = require('./routes/attendance');

// Use the routes
app.use('/api/attendance', attendanceRoutes);

// In your main server.js or app.js
const suspenseAccountRoutes = require("./routes/suspenseAccounts");
app.use("/api/suspense-accounts", suspenseAccountRoutes);

// const salaryRoutes = require("./routes/salaryRoutes.js")
app.use('/api/hrms/salary', require("./routes/salary.js"));

// app.use('/api/configuration', configurationRoutes); 




// 7) Health check
app.get('/health', (req, res) => res.send('OK'));

// 8) Start the server (single process)
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} (PID: ${process.pid})`);
});

// Bump keep-alive timeout for idle connections
server.keepAliveTimeout = 60_000;

// Optional: graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});
