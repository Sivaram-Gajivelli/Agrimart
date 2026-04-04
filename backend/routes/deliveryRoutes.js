const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const Order = require("../models/orderModel");
const DeliveryAssignment = require("../models/deliveryAssignmentModel");
const deliveryAuth = require("../middleware/deliveryMiddleware");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

// @route   POST /api/delivery/login
// @desc    Delivery agent login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: "delivery_partner" });
    if (!user) {
      return res.status(401).json({ message: "Invalid delivery agent credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid delivery agent credentials" });
    }

    const payload = { id: user._id, role: user.role, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.cookie("deliveryToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Set isOnline to true
    user.isOnline = true;
    await user.save();

    res.json({ message: "Logged in successfully", user: payload });
  } catch (error) {
    console.error("Delivery Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/delivery/logout
// @access  Private (Delivery Agent)
router.post("/logout", deliveryAuth, async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user.id, { isOnline: false });
    }

    res.cookie("deliveryToken", "", {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout error" });
  }
});

// @route   GET /api/delivery/check-auth
// @access  Private (Delivery Agent)
router.get("/check-auth", deliveryAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("assignedHub", "name location");
    if (!user) return res.status(401).json({ message: "Not authorized" });
    res.json({ isAuthenticated: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

// @route   GET /api/delivery/stats
// @desc    Get summary stats for the delivery agent dashboard
// @access  Private (Delivery Agent)
router.get("/stats", deliveryAuth, async (req, res) => {
  try {
    const agentId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAssigned,
      pickupsPending,
      outForDelivery,
      deliveredToday,
    ] = await Promise.all([
      DeliveryAssignment.countDocuments({ agent: agentId }),
      DeliveryAssignment.countDocuments({ agent: agentId, status: "Assigned" }),
      DeliveryAssignment.countDocuments({ agent: agentId, status: "Picked Up" }),
      DeliveryAssignment.countDocuments({
        agent: agentId,
        status: "Delivered",
        completedAt: { $gte: today, $lt: tomorrow },
      }),
    ]);

    res.json({ totalAssigned, pickupsPending, outForDelivery, deliveredToday });
  } catch (error) {
    console.error("Delivery Stats Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── ASSIGNED ORDERS ─────────────────────────────────────────────────────────

// @route   GET /api/delivery/assignments
// @desc    Get all active assignments for logged-in delivery agent
// @access  Private (Delivery Agent)
router.get("/assignments", deliveryAuth, async (req, res) => {
  try {
    const assignments = await DeliveryAssignment.find({
      agent: req.user.id,
      status: { $in: ["Assigned", "Picked Up"] },
    })
      .populate({
        path: "order",
        populate: [
          { path: "buyer", select: "name phone email address" },
          { path: "items.product", select: "productName unit image pricePerKg" },
          { path: "items.farmer", select: "name phone address" },
        ],
      })
      .sort({ assignedAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Fetch Assignments Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/delivery/assignments/:id/status
// @desc    Update assignment status (Picked Up / Delivered)
// @access  Private (Delivery Agent)
router.put("/assignments/:id/status", deliveryAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Picked Up", "Delivered"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const assignment = await DeliveryAssignment.findById(req.params.id).populate("order");
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (assignment.agent.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    assignment.status = status;

    // Mirror status onto the Order
    const order = assignment.order;
    if (status === "Picked Up") {
      if (assignment.type === "Pickup") {
        order.trackingStatus = "Picked Up";
        // 🚀 Notification to Farmer on Pickup
        const farmerIds = [...new Set(order.items.map((i) => i.farmer?.toString()))];
        const farmers = await User.find({ _id: { $in: farmerIds } });
        for (const farmer of farmers) {
          if (farmer.email) {
            transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: farmer.email,
              subject: "Agrimart: Your order has been picked up!",
              html: `<h3>Hi ${farmer.name},</h3>
                <p>The delivery agent has picked up order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> from your location.</p>
                <p>It is now in transit to the Hub.</p>
                <p>Thank you!</p>`,
            }).catch((e) => console.error("Email Error:", e));
          }
        }
      } else {
        order.trackingStatus = "Out for Delivery";
      }
    } else if (status === "Delivered") {
      assignment.completedAt = new Date();
      if (assignment.type === "Pickup") {
        order.trackingStatus = "Delivered to Hub";
        // Notify farmer
        const farmerIds = [...new Set(order.items.map((i) => i.farmer?.toString()))];
        const farmers = await User.find({ _id: { $in: farmerIds } });
        for (const farmer of farmers) {
          if (farmer.email) {
            transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: farmer.email,
              subject: "Agrimart: Your order has been delivered to the hub",
              html: `<h3>Hi ${farmer.name},</h3><p>Your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> has been picked up by the delivery agent and delivered to the hub. Admin will now perform a quality check.</p><p>Thank you for selling on Agrimart!</p>`,
            }).catch((e) => console.error("Email Error:", e));
          }
        }
      } else {
        order.trackingStatus = "Delivered";
      }
    }

    await Promise.all([assignment.save(), order.save()]);

    res.json({ assignment, order });
  } catch (error) {
    console.error("Update Assignment Status Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── DELIVERY HISTORY ─────────────────────────────────────────────────────────

// @route   GET /api/delivery/history
// @desc    Get completed delivery history for the agent
// @access  Private (Delivery Agent)
router.get("/history", deliveryAuth, async (req, res) => {
  try {
    const history = await DeliveryAssignment.find({
      agent: req.user.id,
      status: "Delivered",
    })
      .populate({
        path: "order",
        populate: [
          { path: "buyer", select: "name phone" },
          { path: "items.product", select: "productName unit" },
          { path: "items.farmer", select: "name" },
        ],
      })
      .sort({ completedAt: -1 });

    res.json(history);
  } catch (error) {
    console.error("Delivery History Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─── PROFILE ─────────────────────────────────────────────────────────────────

// @route   GET /api/delivery/profile
// @access  Private (Delivery Agent)
router.get("/profile", deliveryAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -verificationToken -verificationTokenExpires -mobileOTP -mobileOTPExpires")
      .populate("assignedHub", "name location");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/delivery/profile
// @access  Private (Delivery Agent)
router.put("/profile", deliveryAuth, async (req, res) => {
  try {
    const updates = {};
    const allowed = ["name", "phone", "vehicleType", "vehicleNumber"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
