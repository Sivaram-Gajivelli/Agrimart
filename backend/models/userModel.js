const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["customer", "farmer", "retailer", "admin", "delivery_partner"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "active", "blocked", "rejected"],
      default: "active"
    },

    // 🔹 Email Verification
    isVerified: {
      type: Boolean,
      default: false
    },

    verificationToken: String,
    verificationTokenExpires: Date,

    // 🔹 Mobile OTP Verification 
    isMobileVerified: {
      type: Boolean,
      default: false
    },
    mobileOTP: String,
    mobileOTPExpires: Date,
    address: {
      type: String,
      required: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema, "usermodels");
