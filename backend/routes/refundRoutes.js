// routes/refundRoutes.js (example)
const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const { authenticate } = require("../middleware/authenticate");
const Booking = require("../models/Booking");

// Create a Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * POST /api/bookings/refund/:bookingId
 * This route handles issuing a refund for a booking if allowed.
 */
router.post("/refund/:bookingId", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookingId } = req.params;

    // 1) Find the booking and ensure the user owns it
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to refund this booking" });
    }

    // 2) Check if a refund is still eligible (example: if meeting is 4+ hours away)
    //    You might have a function or logic for that. For demonstration:
    const isRefundEligible = true; // Implement your check
    if (!isRefundEligible) {
      return res.status(400).json({ message: "Refund not allowed at this time" });
    }

    // 3) Retrieve the Razorpay payment ID you stored when the user paid
    //    e.g., booking.paymentId
    if (!booking.paymentId) {
      return res.status(400).json({ message: "No payment found to refund" });
    }

    // 4) Issue the refund via Razorpay
    //    You might only refund a partial amount, or the full amount
    //    Use your booking/therapy cost as needed
    const refundAmountInPaise = /* e.g. booking.amount * 100 */ 1000; // Example: 10.00 INR

    // The refund API requires the Razorpay payment ID
    const paymentId = booking.paymentId;

    const refund = await razorpay.payments.refund(paymentId, {
      amount: refundAmountInPaise, // in paise; omit if full refund
      speed: "normal", // "optimum" or "normal"
      notes: {
        bookingId: bookingId.toString(),
        reason: "User canceled meeting",
      },
    });

    // 5) Mark the booking as refunded in your DB
    //    e.g., booking.status = 'REFUNDED'
    //    or store the refundId from Razorpay
    booking.refundId = refund.id;
    booking.status = "CANCELED"; // or "REFUNDED"
    await booking.save();

    // 6) Respond success
    return res.status(200).json({
      message: "Refund initiated successfully",
      refundDetails: refund,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    return res.status(500).json({ message: "Server error while processing refund", error: error.message });
  }
});

module.exports = router;
