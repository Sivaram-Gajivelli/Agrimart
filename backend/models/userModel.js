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
      enum: ["customer", "farmer", "admin", "delivery_partner"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "active", "blocked", "rejected"],
      default: "active"
    },
    isOnline: {
      type: Boolean,
      default: false
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
    },
    
    // 🔹 Delivery Agent specifics (Only populated if role is delivery_partner)
    vehicleType: {
      type: String,
      required: false
    },
    vehicleNumber: {
      type: String,
      required: false
    },
    assignedHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: false
    },
    revenue: {
      type: Number,
      default: 0
    },
    // 🚀 NEW: Delivery Agent Reputation
    deliveryRating: {
      type: Number,
      default: 0
    },
    totalDeliveryRatings: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema, "usermodels");
