const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail"); // 👈 අලුත් utility එක

// --- 1. Register Route ---
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "The email is already in use!" });

    // OTP එකක් සහ Password Hash එකක් හදමු
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      otp: otpCode,
      isVerified: false,
    });

    await newUser.save();

    const storeName = process.env.EMAIL_FROM_NAME || "Trendy Store";

    // ඊමේල් එකට යන ලස්සන HTML එක
    const emailContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; color: #1f2937; text-align: center;">
            <h2 style="color: #2563eb;">Welcome to ${storeName}!</h2>
            <p style="color: #6b7280;">Verify your identity to complete your registration.</p>
            <div style="background-color: #f3f4f6; padding: 30px; border-radius: 12px; margin: 25px 0;">
                <p style="font-size: 14px; color: #4b5563; text-transform: uppercase; font-weight: bold;">Your Verification Code</p>
                <h1 style="color: #111827; letter-spacing: 8px; font-size: 36px; margin: 0;">${otpCode}</h1>
            </div>
            <p style="font-size: 12px; color: #9ca3af;">&copy; 2026 ${storeName}. All rights reserved.</p>
        </div>
    `;

    // 📧 ඊමේල් එක යැවීම (අලුත් ක්‍රමයට)
    await sendEmail({
      email: email,
      subject: `Verify Your Email - ${storeName}`,
      message: emailContent,
    });

    console.log(`✅ Verification OTP sent to: ${email}`);
    res.json({ message: "An OTP code has been sent to your email address!" });
  } catch (err) {
    console.error("❌ Register Error:", err);
    res.status(500).json({
      message: "An error occurred while sending the email.",
      error: err.message,
    });
  }
});

// --- 2. Verify OTP Route ---
router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json("User not found");

    if (user.otp === otp) {
      user.isVerified = true;
      user.otp = null;
      await user.save();
      res.json({ message: "Account verified successfully! You can now log in." });
    } else {
      res.status(400).json("Invalid OTP code!");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 3. Login Route ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json("User not found");

    if (!user.isVerified && !user.isAdmin) {
      return res.status(403).json({
        message: "Please verify your email address first!",
        notVerified: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json("Wrong password");

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secretkey"
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 4. Resend OTP Route ---
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User cannot be found." });

    if (user.isVerified)
      return res.status(400).json({ message: "This account is already verified." });

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = newOtp;
    await user.save();

    const storeName = process.env.EMAIL_FROM_NAME || "Trendy Store";
    const resendHtml = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; text-align: center;">
            <h2 style="color: #2563eb;">New OTP Requested</h2>
            <div style="background-color: #f8fafc; padding: 30px; border-radius: 12px; margin: 25px 0; border: 2px dashed #cbd5e1;">
                <h1 style="color: #1e293b; letter-spacing: 10px; font-size: 38px; margin: 0;">${newOtp}</h1>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">&copy; 2026 ${storeName}. All rights reserved.</p>
        </div>
    `;

    // 📧 ඊමේල් එක යැවීම
    await sendEmail({
      email: email,
      subject: `New OTP Code - ${storeName}`,
      message: resendHtml,
    });

    res.json({ message: "A new OTP code has been sent to your email address!" });
  } catch (err) {
    console.error("❌ Resend OTP Error:", err);
    res.status(500).json({ message: "Error sending email.", error: err.message });
  }
});

module.exports = router;