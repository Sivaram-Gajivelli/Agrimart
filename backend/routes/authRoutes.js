const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const userModel = require("../models/userModel");
const otpModel = require("../models/otpModel");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// =======================
// RATE LIMITING
// =======================

// Bruteforce protection for login and register (max 10 requests per 10 minutes)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: "Too many requests from this IP, please try again after 10 minutes" }
});

// Protect OTP routes (max 3 requests per 5 minutes to prevent email/sms spam)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { message: "Too many OTP requests. Please wait 5 minutes." }
});

// Allowed roles
const ALLOWED_ROLES = ["customer", "farmer", "retailer"];
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};



// =======================
// REGISTER
// =======================
const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 3 }).withMessage("Name must be at least 3 characters long"),
  body("email").optional({ checkFalsy: true }).isEmail().withMessage("Must be a valid email").normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).isMobilePhone().withMessage("Must be a valid phone number"),
  body("role").isIn(["customer", "farmer", "retailer"]).withMessage("Invalid user role"),
  // Strong password logic
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number")
    .matches(/[\W_]/).withMessage("Password must contain at least one special character")
];

router.post("/register", authLimiter, registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return the first error exactly as a single message to map back easily to the frontend toast
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    let { name, email, phone, password, role } = req.body;

    // Normalizing
    name = name.trim();
    if (email) email = email.toLowerCase();

    // Check if username is already taken
    const usernameTaken = await userModel.findOne({ name });
    if (usernameTaken) {
      return res.status(400).json({ message: "Username already exists. Please choose a different name." });
    }

    // Check existing user
    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    if (query.length === 0) {
      return res.status(400).json({ message: "Either email or phone is required" });
    }

    const userExists = await userModel.findOne({
      $or: query,
      role: role // also verify against the specific role since they might register as both
    });


    if (userExists) {
      if (!userExists.isVerified) {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        userExists.verificationToken = verificationToken;
        userExists.verificationTokenExpires = Date.now() + 3600000;

        await userExists.save();

        if (email) {
          const verificationURL = `http://localhost:3000/api/auth/verify/${verificationToken}`;

          // 🔥 Async send mail
          transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify your Agrimart Account",
            html: `
              <h3>Welcome to Agrimart!</h3>
              <p>Please verify your email:</p>
              <a href="${verificationURL}">Verify Account</a>
            `
          }).catch(err => console.error("Background Resend Email Failed:", err));
        }

        return res.status(200).json({
          message: "Verification email resent. Please check your inbox."
        });
      }

      return res.status(400).json({
        message: "User with email or phone already exists"
      });
    }


    // Verify OTP sessions
    // They must have verified the email/phone already via OTP endpoints
    if (email) {
      const emailOtpSession = await otpModel.findOne({ contact: email });
      if (!emailOtpSession || !emailOtpSession.isVerified) {
        return res.status(401).json({ message: "Please verify your email via OTP first." });
      }
    }

    if (phone) {
      const phoneOtpSession = await otpModel.findOne({ contact: phone });
      if (!phoneOtpSession || !phoneOtpSession.isVerified) {
        return res.status(401).json({ message: "Please verify your mobile number via OTP first." });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token (legacy fallback for older emails if needed)
    const verificationToken = email
      ? crypto.randomBytes(32).toString("hex")
      : undefined;

    const newUser = new userModel({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password: hashedPassword,
      role,
      isVerified: email ? true : false,
      isMobileVerified: phone ? true : false
    });

    await newUser.save();

    // Clean up OTP sessions after successful registration
    if (email) await otpModel.deleteOne({ contact: email });
    if (phone) await otpModel.deleteOne({ contact: phone });

    return res.status(201).json({
      message: "User registered successfully. You can now login."
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// =======================
// EMAIL VERIFY
// =======================
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await userModel.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.redirect(
        "http://localhost:5173/signup/customer?verified=failed"
      );
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    // 🔥 Redirect to frontend signup page with success flag
    return res.redirect(
      `http://localhost:5173/signup/${user.role}?verified=success`
    );

  } catch (err) {
    console.error("EMAIL VERIFY ERROR:", err);
    return res.redirect(
      "http://localhost:5173/signup/customer?verified=failed"
    );
  }
});


// =======================
// SEND / RESEND EMAIL OTP
// =======================
router.post("/send-email-verify", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // We can just send an OTP via email instead of creating a user in DB first.
    // However, if the user doesn't exist, we should let them proceed.
    // If they already exist AND are verified, block them.
    const user = await userModel.findOne({ email });
    if (user && user.isVerified) {
      return res.status(400).json({ message: "Email is already registered and verified." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in the dedicated otpModel
    await otpModel.findOneAndUpdate(
      { contact: email }, // Upsert based on email
      { otp, isVerified: false, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // Actually sending an email with just an OTP:
    // 🔥 Removed 'await' here so the API responds to the frontend instantly without waiting for the SMTP server
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Agrimart Verification Code",
      html: `
        <h3>Welcome to Agrimart!</h3>
        <p>Your email verification code is: <strong>${otp}</strong></p>
        <p>Please enter this code on the signup page.</p>
        <p>This code is valid for 5 minutes.</p>
      `
    }).catch(err => console.error("Background Email Sending Failed:", err));

    console.log("📧 Email OTP for", email, "is:", otp);
    return res.json({ message: "Verification OTP sent successfully", otp });

  } catch (err) {
    console.error("SEND EMAIL OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// =======================
// VERIFY EMAIL OTP
// =======================
router.post("/verify-email-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpSession = await otpModel.findOne({ contact: email });

    if (!otpSession) {
      return res.status(400).json({ message: "OTP session expired or not found. Please request again." });
    }

    if (otpSession.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    return res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =======================
// SEND / RESEND MOBILE OTP
// =======================
router.post("/send-mobile-otp", otpLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    let user = await userModel.findOne({ phone });

    if (user && user.isMobileVerified && user.isVerified) {
      return res.status(400).json({ message: "Phone number is already registered and verified." });
    }

    // 🔥 Prevent OTP spam (30 sec cooldown)
    if (
      user && user.mobileOTPExpires &&
      Date.now() < user.mobileOTPExpires - 270000 // first 30 sec blocked
    ) {
      return res.status(400).json({
        message: "Please wait before requesting another OTP"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in the dedicated otpModel
    await otpModel.findOneAndUpdate(
      { contact: phone }, // Upsert based on phone
      { otp, isVerified: false, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    console.log("📱 Mobile OTP for", phone, "is:", otp);

    return res.json({ message: "OTP sent successfully", otp });

  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// =======================
// VERIFY MOBILE OTP
// =======================
router.post("/verify-mobile-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const otpSession = await otpModel.findOne({ contact: phone });

    if (!otpSession) {
      return res.status(400).json({ message: "OTP session expired or not found. Please request again." });
    }

    if (otpSession.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    return res.json({ message: "Mobile verified successfully" });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =======================
// CHECK VERIFICATION STATUS
// =======================
router.get("/check-verification", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      isVerified: user.isVerified,
      isMobileVerified: user.isMobileVerified
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});



// =======================
// LOGIN
// =======================
const loginValidation = [
  body("email").trim().notEmpty().withMessage("Email/Phone is required"),
  body("password").notEmpty().withMessage("Password is required"),
  body("role").isIn(["customer", "farmer", "retailer"]).withMessage("Invalid user role")
];

router.post("/login", authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    let { email, password, role } = req.body;

    email = email?.trim().toLowerCase();
    role = role?.trim().toLowerCase();

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid user role" });
    }

    // Find user by email or phone
    const user = await userModel.findOne({
      $or: [{ email }, { phone: email }],
      role
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // If email exists, must be verified
    if (user.email && !user.isVerified) {
      return res.status(401).json({
        message: "Please verify your email first"
      });
    }

    // If phone exists, must be mobile verified
    if (user.phone && !user.isMobileVerified) {
      return res.status(401).json({
        message: "Please verify your mobile number first"
      });
    }


    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Ensure JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not found in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Create JWT
    const token = jwt.sign({
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email
    },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // 24 hours
    );

    // Send HTTP-Only Cookie
    res.cookie("token", token, {
      httpOnly: true, // Prevents client-side JS from reading the cookie
      secure: process.env.NODE_ENV === "production", // Ensures cookie is sent over HTTPS in prod
      sameSite: "strict", // Protects against CSRF
      maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
    });

    return res.json({
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =======================
// FORGOT PASSWORD - SEND OTP
// =======================
router.post("/forgot-password/send-otp", otpLimiter, async (req, res) => {
  try {
    const { contact, role } = req.body; // contact can be email or phone

    if (!contact || !role) {
      return res.status(400).json({ message: "Contact (email/phone) and role are required." });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid user role" });
    }

    // Verify user exists
    const user = await userModel.findOne({
      $or: [{ email: contact.toLowerCase() }, { phone: contact }],
      role
    });

    if (!user) {
      // Don't leak if user exists or not, just give generic message if preferred,
      // but for UX, let's inform them user not found:
      return res.status(404).json({ message: "No account found with this contact and role." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in the dedicated otpModel
    await otpModel.findOneAndUpdate(
      { contact: contact.toLowerCase() },
      { otp, isVerified: false, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // If contact is an email, send email
    if (contact.includes("@")) {
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: contact.toLowerCase(),
        subject: "Agrimart - Password Reset Code",
        html: `
          <h3>Password Reset Request</h3>
          <p>Your password reset code is: <strong>${otp}</strong></p>
          <p>Please enter this code to reset your password.</p>
          <p>This code is valid for 5 minutes.</p>
        `
      }).catch(err => console.error("Background Password Reset Email Failed:", err));

      console.log("📧 Password Reset OTP for", contact, "is:", otp);
      return res.json({ message: "Password reset OTP sent to your email", otp });
    } else {
      // It's a phone number, log to console for now
      console.log("📱 Password Reset OTP for", contact, "is:", otp);
      return res.json({ message: "Password reset OTP sent to your mobile", otp });
    }

  } catch (err) {
    console.error("FORGOT PASSWORD SEND OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =======================
// FORGOT PASSWORD - VERIFY OTP
// =======================
router.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { contact, otp } = req.body;

    if (!contact || !otp) {
      return res.status(400).json({ message: "Contact and OTP are required" });
    }

    const otpSession = await otpModel.findOne({ contact: contact.toLowerCase() });

    if (!otpSession) {
      return res.status(400).json({ message: "OTP session expired or not found. Please request again." });
    }

    if (otpSession.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    return res.json({ message: "OTP Verified Successfully" });

  } catch (err) {
    console.error("FORGOT PASSWORD VERIFY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =======================
// FORGOT PASSWORD - RESET
// =======================
const passwordResetValidation = [
  body("newPassword")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number")
    .matches(/[\W_]/).withMessage("Password must contain at least one special character")
];

router.post("/forgot-password/reset", authLimiter, passwordResetValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { contact, newPassword, role } = req.body;

    if (!contact || !newPassword || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate OTP session
    const otpSession = await otpModel.findOne({ contact: contact.toLowerCase() });

    if (!otpSession || !otpSession.isVerified) {
      return res.status(400).json({ message: "Please verify your OTP first before resetting the password." });
    }

    // Fetch the user to check their current password
    const user = await userModel.findOne({
      $or: [{ email: contact.toLowerCase() }, { phone: contact }],
      role
    });

    if (!user) {
      return res.status(404).json({ message: "User not found to update password." });
    }

    // Ensure the new password is not the same as the old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "New password cannot be the same as your old password." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update User Password
    user.password = hashedPassword;
    await user.save();

    // Clean up OTP session
    await otpModel.deleteOne({ contact: contact.toLowerCase() });

    return res.json({ message: "Password reset successfully. You can now login!" });

  } catch (err) {
    console.error("FORGOT PASSWORD RESET ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =======================
// CHECK HTTP-ONLY AUTH STATUS
// =======================
router.get("/check-auth", auth, async (req, res) => {
  try {
    // If the auth middleware passes, req.user contains the decoded JWT
    const user = await userModel.findById(req.user.id).select("-password -verificationToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (err) {
    console.error("CHECK AUTH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =======================
// LOGOUT (Clear Cookie)
// =======================
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
