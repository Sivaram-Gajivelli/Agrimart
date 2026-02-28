const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
    {
        contact: {
            type: String,
            required: true,
            index: true
        },
        otp: {
            type: String,
            required: true
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 300 // 5 minutes (300 seconds) - TTL Index
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("otpModel", otpSchema);
