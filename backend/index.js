// Dependencies
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();

// Initialize app
const app = express();
app.use(express.json());

// Configure CORS for frontend (localhost:3000)
app.use(
  cors({
    origin:'*', // Allow frontend requests || "http://localhost:3000" || "https://miracle-minds-frontend.vercel.app"
    // credentials: true, // Allow cookies and authentication headers
  })
);

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
// const timeslotRoutes = require("./routes/timeslotRoutes");
// const therapyRoutes = require("./routes/therapyRoutes");
// const bookingRoutes = require("./routes/bookingRoutes");
// const therapistRoutes = require("./routes/therapistRoutes");
// const cartRoutes = require("./routes/cart.js"); // Import cart routes
// const paymentRoutes = require("./routes/paymentRoutes.js");
// const refundRoutes = require("./routes/refundRoutes");
const emailVerificationRoutes = require("./routes/emailVerification");
// const reportRoutes = require("./routes/reportRoutes.js");
// Use routes
app.use("/api/auth", authRoutes);

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
// app.use("/api", timeslotRoutes);
// app.use("/api/bookings", bookingRoutes);
// app.use("/api/therapies", therapyRoutes);
// app.use("/api", therapistRoutes);
// app.use("/api/cart", cartRoutes); // Use cart routes
// app.use("/api/payments", paymentRoutes);
// app.use("/api/bookings", refundRoutes);
// const adminBookingRoutes = require("./routes/adminBookingRoutes");
// app.use("/api/bookings", adminBookingRoutes);

app.use("/api/auth", emailVerificationRoutes);
// const expertProfileRoutes = require("./routes/expertProfileRoutes.js"); // Import expert profile routes
// app.use("/api", expertProfileRoutes); 
// const expertAvailabilityRoutes = require("./routes/expertAvailabilityRoutes");
// app.use("/api", expertAvailabilityRoutes);
// const expertBookingRoutes = require('./routes/expertBookingRoutes');
// app.use('/api', expertBookingRoutes);
const subAdminRoutes = require('./routes/subAdminRoutes');
app.use('/api', subAdminRoutes);

const catalogRoutes = require("./routes/catalogRoutes");
app.use("/api/admin", catalogRoutes);

const advancedSearchRoutes = require("./routes/advancedSearchRoutes.js");
app.use("/api/products", advancedSearchRoutes);

// const viewersmanagerRoutes = ;
app.use("/api/viewer",require("./routes/viewersRoutes.js"))
app.use("/api/admin",require("./routes/viewersRoutes.js"))
app.use("/api/admin",require("./routes/quotationRoutes.js"))

const adminMeRoutes = require("./routes/adminMe");
app.use("/api/admin", adminMeRoutes);

// app.use("/api/reports" ,reportRoutes)

// Start server (original)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
