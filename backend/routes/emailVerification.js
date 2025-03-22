// routes/emailVerification.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendMail = require("../utils/sendMail");
const router = express.Router();
require('dotenv').config();

router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.isVerified = true;
    await user.save();
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

router.post("/send-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const verificationLink = `${process.env.FRONTEND_URL}/email-verification?token=${token}`;
    
    const htmlContent = `
      <html>
        <body>
          <p>Hello ${user.name},</p>
          <p>Please verify your email by clicking on the following button:</p>
          <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer;">
            Click Here
          </a>
          <p>This link is valid for 24 hours.</p>
          <p>Thank you.</p>
        </body>
      </html>
    `;

    await sendMail({
      to: email,
      subject: "Verify Your Email",
      html: htmlContent, // Use the HTML content here
    });

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ message: "Error sending verification email" });
  }
});
module.exports = router;
