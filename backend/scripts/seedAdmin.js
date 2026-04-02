const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

// Load backend env config
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/userModel");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("An admin user already exists:", existingAdmin.email);
      process.exit(0);
    }

    // Create a robust password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin@123", salt);

    const adminUser = new User({
      name: "Agrimart Admin",
      email: "admin@agrimart.com",
      phone: "0000000000",
      password: hashedPassword,
      role: "admin",
      status: "active",
      isVerified: true
    });

    await adminUser.save();
    console.log("Admin user seeded successfully!");
    console.log("Email: admin@agrimart.com");
    console.log("Password: admin@123");

    process.exit(0);
  } catch (err) {
    console.error("Error seeding admin user:", err);
    process.exit(1);
  }
};

seedAdmin();
