const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// --- 1. Nodemailer Transporter ---
const transporter = nodemailer.createTransport({
    service: 'gmail', // කෙලින්ම service එක දෙන්න
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // මේ කොටස අනිවාර්යයෙන්ම දාන්න
    connectionTimeout: 10000, // තත්පර 10ක් බලන් ඉන්න
    greetingTimeout: 10000,
    socketTimeout: 10000,
    pool: true // Connection එක දිගටම තියාගන්න
});

// --- 2. Register ---
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "The email is already in use!" });

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

    const senderEmail = process.env.EMAIL_USER;
    const storeName = process.env.EMAIL_FROM_NAME || "Trendy Store";

    const mailOptions = {
      from: `"${storeName}" <${senderEmail}>`,
      to: email, // මෙතන 'email' කියන variable එක කලින් route එකේ define වෙලා තියෙන්න ඕනේ
      subject: `Verify Your Email - ${storeName}`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; color: #1f2937; text-align: center;">
            <div style="margin-bottom: 20px;">
                <h2 style="color: #2563eb; margin-bottom: 10px; font-size: 24px;">Welcome to ${storeName}!</h2>
                <p style="color: #6b7280; font-size: 16px;">Verify your identity to complete your registration.</p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 30px; border-radius: 12px; margin: 25px 0;">
                <p style="font-size: 14px; color: #4b5563; margin-bottom: 15px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Your Verification Code</p>
                <h1 style="color: #111827; letter-spacing: 8px; font-size: 36px; margin: 0; font-family: monospace;">${otpCode}</h1>
            </div>
            
            <p style="font-size: 14px; color: #9ca3af; line-height: 1.5;">
                This code will expire shortly. If you didn't request this code, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: #d1d5db;">
                &copy; 2026 ${storeName}. All rights reserved.
            </p>
        </div>
      `,
    };

    // 📧 ඊමේල් එක යැවීම (Async/Await භාවිතා කර)
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification OTP sent to: ${email}`);

    res.json({ message: "An OTP code has been sent to your email address!" });
  } catch (err) {
    console.error("❌ Mail Error:", err);
    res.status(500).json({
      message: "An error occurred while sending the email.",
      error: err.message,
    });
  }
});

// --- 3. Verify OTP ---
router.post("/verify", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json("User not found");

    if (user.otp === otp) {
      user.isVerified = true;
      user.otp = null;
      await user.save();
      res.json({
        message: "Account verified successfully! You can now log in.",
      });
    } else {
      res.status(400).json("Invalid OTP code!");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 4. Login ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json("User not found");

    // 👈 Admin ට ලොග් වෙන්න බැරි ප්‍රශ්නයට විසඳුම:
    // Admin කෙනෙක් නම් Verification බලන්නේ නැතිව ලොග් වෙන්න ඉඩ දෙන්න පුළුවන් (පරීක්ෂා කිරීමට පහසුයි)
    if (!user.isVerified && !user.isAdmin) {
      return res.status(403).json({
        message: "Please verify your email address first!",
        notVerified: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json("Wrong password");

    // JWT Secret එක .env එකේ නැත්නම් 'secret' ලෙස ගනී
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secretkey",
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 5. Resend OTP (කේතය නැවත යැවීම) ---
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User cannot be found." });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ message: "This account is already verified." });
    }

    // 🔐 අලුත් OTP එකක් හදමු
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = newOtp;
    await user.save();

    // 🛡️ .env එකෙන් විස්තර ලබා ගැනීම
    const senderEmail = process.env.EMAIL_USER;
    const storeName = process.env.EMAIL_FROM_NAME || "Trendy Store";

    const mailOptions = {
      from: `"${storeName}" <${senderEmail}>`,
      to: email,
      subject: `New OTP Code - ${storeName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; color: #1f2937;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="color: #2563eb; margin: 0;">New OTP Requested</h2>
                <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">We received a request for a new verification code.</p>
            </div>
            
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 30px; border-radius: 12px; text-align: center; margin: 25px 0;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 10px; font-weight: bold; text-transform: uppercase;">Your New Code</p>
                <h1 style="color: #1e293b; letter-spacing: 10px; font-size: 38px; margin: 0; font-family: 'Courier New', monospace;">${newOtp}</h1>
            </div>
            
            <p style="font-size: 14px; color: #4b5563; line-height: 1.6; text-align: center;">
                Please use this code to continue your verification process. This code is valid for a limited time.
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
                <p>If you did not request this, please ignore this email.</p>
                <p>&copy; 2026 ${storeName}. All rights reserved.</p>
            </div>
        </div>
      `,
    };

    // 📧 ඊමේල් එක යැවීම
    await transporter.sendMail(mailOptions);
    console.log(`🔄 New OTP sent to: ${email}`);

    res.json({
      message: "A new OTP code has been sent to your email address!",
    });
  } catch (err) {
    console.error("❌ Resend OTP Error:", err);
    res.status(500).json({
      message: "There was an error sending the email.",
      error: err.message,
    });
  }
});

module.exports = router;
