const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendMail = require("../utils/sendMail");
const router = express.Router();
require("dotenv").config();

// SIGNUP
router.post("/signup", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || "GENERAL",
      isVerified: false,
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    const verificationLink = `${process.env.FRONTEND_URL}/email-verification?token=${token}`;

    const htmlContent = `
      <html>
        <body>
          <div>
            <h2>Email Verification</h2>
            <p>Hello ${name},</p>
            <p>Thank you for registering. Please verify your email:</p>
            <a href="${verificationLink}">Verify Email</a>
            <p>This link is valid for 24 hours.</p>
          </div>
        </body>
      </html>
    `;

    await sendMail({
      to: email,
      subject: "Verify Your Email",
      html: htmlContent,
    });

    return res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      role: newUser.role,
    });
  } catch (error) {
    console.error("Error in signup:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// LOGIN - Updated to include user ID
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select("+password"); // Include password for comparison
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        error: "Email not verified. Please verify your email before logging in.",
      });
    }

    if (user.role === "VIEWER") {
      if (user.singleSession && user.loginCount >= 1) {
        return res.status(403).json({
          error: "Viewer already logged in. Single session allowed.",
        });
      }
      if (user.loginCount >= user.maxLogins) {
        return res.status(403).json({
          error: "Maximum login limit reached for this viewer.",
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    if (user.role === "VIEWER") {
      user.loginCount += 1;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1y" }
    );

    const userResponse = {
      message: "Login successful.",
      token,
      _id: user._id, // CRITICAL: Include user ID
      role: user.role,
      name: user.name,
      email: user.email, // Also include email
      isSuperAdmin: user.isSuperAdmin || false,
      permissions: user.permissions || [],
    };

    return res.status(200).json(userResponse);
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// FORGOT PASSWORD - SEND OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    const htmlContent = `
      <html>
        <body>
          <div>
            <h2>Password Reset OTP</h2>
            <p>Hello ${user.name},</p>
            <p>Your OTP for password reset is: <strong>${otp}</strong></p>
            <p>This OTP is valid for 10 minutes.</p>
          </div>
        </body>
      </html>
    `;

    await sendMail({
      to: email,
      subject: "Password Reset OTP",
      html: htmlContent,
    });

    return res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ 
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    return res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// RESET PASSWORD
// RESET PASSWORD - Modified version
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ 
      email,
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    // Hash the password only here
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Use updateOne to bypass the pre-save hook
    await User.updateOne(
      { _id: user._id },
      { 
        password: hashedPassword,
        resetPasswordOtp: undefined,
        resetPasswordOtpExpires: undefined 
      }
    );

    return res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error in reset password:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;