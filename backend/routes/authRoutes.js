const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const router = express.Router();

// Allowed roles
const ALLOWED_ROLES = ["customer", "farmer", "retailer"];

// =======================
// REGISTER
// =======================
router.post("/register", async (req, res) => {
  try {
    let { name, email, phone, password, role } = req.body;

    // Trim inputs
    name = name?.trim();
    email = email?.trim().toLowerCase();
    phone = phone?.trim();
    role = role?.trim().toLowerCase();

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid user role" });
    }

    // Check existing user
    const userExists = await userModel.findOne({
      $or: [{ email }, { phone }]
    });

    if (userExists) {
      return res
        .status(400)
        .json({ message: "User with email or phone already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      name,
      email,
      phone,
      password: hashedPassword,
      role
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully"
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =======================
// LOGIN
// =======================
router.post("/login", async (req, res) => {
  try {
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
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
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

module.exports = router;
