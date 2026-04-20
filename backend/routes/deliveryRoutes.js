const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const Order = require("../models/orderModel");
const DeliveryAssignment = require("../models/deliveryAssignmentModel");
const deliveryAuth = require("../middleware/deliveryMiddleware");
const { updateFarmersRevenue } = require("../utils/revenueHelper");
const Hub = require("../models/hubModel");
const { getDistance } = require("../utils/distanceHelper");
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

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.deliveryToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await User.findByIdAndUpdate(decoded.id, { isOnline: false });
      } catch (err) {
        // Token invalid or expired, ignore and just clear cookie
      }
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

// @route   PUT /api/delivery/toggle-active
// @access  Private (Delivery Agent)
router.put("/toggle-active", deliveryAuth, async (req, res) => {
  try {
    const { isOnline, latitude, longitude } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Agent not found" });

    user.isOnline = isOnline;
    
    if (isOnline && latitude && longitude) {
        const hubs = await Hub.find({ status: 'active' });
        let nearestHub = null;
        let minDistance = Infinity;

        hubs.forEach(hub => {
            const dist = getDistance(latitude, longitude, hub.latitude, hub.longitude);
            if (dist < minDistance) {
                minDistance = dist;
                nearestHub = hub._id;
            }
        });
        user.assignedHub = nearestHub;
    } else if (!isOnline) {
        user.assignedHub = undefined;
    }

    await user.save();
    
    const populatedUser = await User.findById(user._id)
        .select("-password")
        .populate("assignedHub", "name location");

    res.json(populatedUser);
  } catch (err) {
    console.error("Toggle Active error:", err);
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

    // 💰 Calculate Earnings by Period (Week, Month, Year)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const earningStats = await DeliveryAssignment.aggregate([
      { $match: { agent: new mongoose.Types.ObjectId(agentId), status: "Delivered" } },
      {
        $group: {
          _id: null,
          weekly: {
            $sum: {
              $cond: [{ $gte: ["$completedAt", startOfWeek] }, { $ifNull: ["$earnings", 0] }, 0]
            }
          },
          monthly: {
            $sum: {
              $cond: [{ $gte: ["$completedAt", startOfMonth] }, { $ifNull: ["$earnings", 0] }, 0]
            }
          },
          yearly: {
            $sum: {
              $cond: [{ $gte: ["$completedAt", startOfYear] }, { $ifNull: ["$earnings", 0] }, 0]
            }
          }
        }
      }
    ]);

    const earnings = earningStats[0] || { weekly: 0, monthly: 0, yearly: 0 };

    const agent = await User.findById(agentId).select('deliveryRating totalDeliveryRatings revenue');

    res.json({ 
      totalAssigned, 
      pickupsPending, 
      outForDelivery, 
      deliveredToday,
      deliveryRating: agent?.deliveryRating || 0,
      totalRatings: agent?.totalDeliveryRatings || 0,
      revenue: agent?.revenue || 0,
      earnings
    });
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
      .populate({
        path: "product",
        populate: { path: "farmer", select: "name phone address phone manualLocation" },
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

    const assignment = await DeliveryAssignment.findById(req.params.id)
      .populate({
        path: "order",
        populate: [
          { path: "items.product", select: "productName pricePerKg unit image" },
          { path: "buyer", select: "name email phone" }
        ]
      })
      .populate("product");

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (assignment.agent.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    assignment.status = status;
    const order = assignment.order;
    const product = assignment.product;

    // 🔗 CASE 1: ORDER-BASED DELIVERY (Standard Sales Flow)
    if (order) {
      if (status === "Picked Up") {
        if (assignment.type === "Pickup") {
          order.trackingStatus = "Picked Up";
          // 🚀 Notification to Farmer on Pickup
          const farmerIds = [...new Set(order.items.map((i) => i.farmer?.toString()))];
          const farmers = await User.find({ _id: { $in: farmerIds } });
          for (const farmer of farmers) {
            if (farmer.email) {
              const orderItemsHtml = order.items.map(it => `<li>${it.product?.productName || 'Produce'}: ${it.quantity} ${it.product?.unit || 'kg'}</li>`).join('');
              transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: farmer.email,
                subject: "Agrimart: Your order has been picked up!",
                html: `
                  <div style="font-family: sans-serif; color: #333;">
                    <h3>Hi ${farmer.name},</h3>
                    <p>The delivery agent has picked up your produce for order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong>. It is now in transit to the Hub.</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0;">
                      <p style="margin-top: 0; font-weight: bold;">Items Picked Up:</p>
                      <ul>${orderItemsHtml}</ul>
                    </div>
                    <a href="http://localhost:5173/orders-received" style="display: inline-block; background: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">Track My Sales</a>
                  </div>
                `,
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
          
          // 🚀 NEW: Calculate Revenue for Agent (Pickup)
          try {
            const hubs = await Hub.find();
            const farmer = order.items[0]?.farmer;
            const targetHub = hubs.find(h => h._id.toString() === req.user.assignedHub?.toString()) || hubs[0];
            
            if (farmer?.latitude && farmer?.longitude && targetHub) {
                const dist = getDistance(farmer.latitude, farmer.longitude, targetHub.latitude, targetHub.longitude);
                assignment.distance = Number(dist.toFixed(2));
                assignment.earnings = Number((15 + (dist * 5)).toFixed(2));
                
                // Update agent's total revenue
                const agent = await User.findById(req.user.id);
                agent.revenue = (agent.revenue || 0) + assignment.earnings;
                await agent.save();
            }
          } catch (e) { console.error("Revenue Calc Error (Pickup):", e); }
          
          // 🚀 Notification to Farmer: Product Reached Hub
          const farmerIds = [...new Set(order.items.map((i) => i.farmer?.toString()))];
          const farmers = await User.find({ _id: { $in: farmerIds } });
          for (const farmer of farmers) {
            if (farmer.email) {
              const orderItemsHtml = order.items.map(it => `<li>${it.product?.productName || 'Produce'}: ${it.quantity} ${it.product?.unit || 'kg'}</li>`).join('');
              transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: farmer.email,
                subject: "Agrimart: Your produce has reached the hub!",
                html: `
                  <div style="font-family: sans-serif; color: #333;">
                    <h3>Hi ${farmer.name},</h3>
                    <p>Excellent! Your produce for order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> has safely reached the Agrimart Hub.</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0;">
                      <p style="margin-top: 0; font-weight: bold;">Shipment Received:</p>
                      <ul>${orderItemsHtml}</ul>
                    </div>
                    <p>It is currently being processed for quality check.</p>
                    <a href="http://localhost:5173/orders-received" style="display: inline-block; background: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">Track My Sales</a>
                  </div>
                `,
              }).catch((e) => console.error("Email Error:", e));
            }
            // 📱 Mobile Sandbox (Console Log)
            console.log(`[MOBILE NOTIFICATION SANDBOX] Sent to ${farmer.phone || 'Farmer'}: Your produce for Order #${order._id.toString().slice(-8).toUpperCase()} has reached the Hub.`);
          }

          // 🔗 BRIDGE: Order stays in Processing until Hub QC is complete
          order.trackingStatus = "Processing";
          
          if (order.items) {
              const Product = require('../models/productModel');
              const productIds = order.items.map(it => it.product);
              await Product.updateMany(
                  { _id: { $in: productIds } },
                  { deliveryStatus: 'At Hub' }
              );
          }
        } else {
          order.trackingStatus = "Delivered";
          await updateFarmersRevenue(order);

          // 🚀 NEW: Calculate Revenue for Agent (Final Delivery)
          try {
            const hubs = await Hub.find();
            const targetHub = hubs.find(h => h._id.toString() === req.user.assignedHub?.toString()) || hubs[0];
            const buyer = await User.findById(order.buyer).select("latitude longitude");
            
            if (targetHub && buyer?.latitude && buyer?.longitude) {
                const dist = getDistance(targetHub.latitude, targetHub.longitude, buyer.latitude, buyer.longitude);
                assignment.distance = Number(dist.toFixed(2));
                assignment.earnings = Number((15 + (dist * 5)).toFixed(2));
                
                // Update agent's total revenue
                const agent = await User.findById(req.user.id);
                agent.revenue = (agent.revenue || 0) + assignment.earnings;
                await agent.save();
            }
          } catch (e) { console.error("Revenue Calc Error (Delivery):", e); }

          // 💰 Update Agent Revenue (Add delivery fee to agent's account)
          if (order.deliveryFee > 0) {
            await User.findByIdAndUpdate(req.user.id, { $inc: { revenue: order.deliveryFee } });
          }

          // 🚀 Notification to Customer: Order Delivered
          if (order.buyer) {
              const buyerEmail = order.buyer.email || (await User.findById(order.buyer).select('email'))?.email;
              const buyerName = order.buyer.name || (await User.findById(order.buyer).select('name'))?.name;
              const buyerPhone = order.buyer.phone || (await User.findById(order.buyer).select('phone'))?.phone;

              if (buyerEmail) {
                  const orderItemsHtml = order.items.map(it => `<li>${it.product?.productName || 'Produce'}: ${it.quantity} ${it.product?.unit || 'kg'}</li>`).join('');
                  transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: buyerEmail,
                    subject: "Agrimart: Your order has been delivered! How was your experience?",
                    html: `
                      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                        <div style="background: #10b981; padding: 30px; text-align: center; color: white;">
                          <h2 style="margin: 0; font-size: 24px;">Order Delivered!</h2>
                          <p style="margin: 10px 0 0; opacity: 0.9;">#${order._id.toString().slice(-8).toUpperCase()}</p>
                        </div>
                        <div style="padding: 30px;">
                          <p>Hi ${buyerName || 'Customer'},</p>
                          <p>Great news! Your farm-fresh order has been delivered. We hope you enjoy your produce.</p>
                          
                          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0;">
                            <p style="margin-top: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Your Order Includes:</p>
                            <ul style="padding-left: 20px; margin-bottom: 0;">${orderItemsHtml}</ul>
                          </div>

                          <div style="text-align: center; padding: 20px; background: #fff7ed; border-radius: 12px; border: 1px solid #ffedd5;">
                            <h3 style="margin: 0; color: #9a3412;">Rate Your Delivery Agent</h3>
                            <p style="color: #c2410c; font-size: 14px; margin: 8px 0 20px;">Your feedback helps us maintain high-quality service.</p>
                            <a href="http://localhost:5173/orders" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">Rate My Experience</a>
                          </div>
                          
                          <p style="margin-top: 25px; font-size: 14px; color: #64748b;">
                            Thank you for choosing Agrimart and supporting our farmers!
                          </p>
                        </div>
                      </div>
                    `,
                  }).catch((e) => console.error("Email Error:", e));
              }
              // 📱 Mobile Sandbox (Console Log)
              console.log(`[MOBILE NOTIFICATION SANDBOX] Sent to ${buyerPhone || 'Customer'}: Your order #${order._id.toString().slice(-8).toUpperCase()} has been delivered successfully!`);
          }
        }
      }
      await order.save();

      // If it was a stocking pickup (direct product)
      if (assignment.product && status === "Delivered") {
          const Product = require('../models/productModel');
          await Product.findByIdAndUpdate(assignment.product, { deliveryStatus: 'At Hub' });
      }

      res.json(assignment);
    } 
    // 🔗 CASE 2: PRODUCT-BASED PICKUP (Stocking Flow)
    else if (product) {
      console.log(`[LOGISTICS] Updating STOCKING STATUS for product: ${product.productName}`);
      if (status === "Picked Up") {
        product.deliveryStatus = "Picked Up";
      } else if (status === "Delivered") {
        product.deliveryStatus = "At Hub";
        assignment.completedAt = new Date();

        // 🚀 NEW: Calculate Revenue for Agent (Stocking Pickup)
        try {
          const hubs = await Hub.find();
          const targetHub = hubs.find(h => h._id.toString() === req.user.assignedHub?.toString()) || hubs[0];
          
          if (product.latitude && product.longitude && targetHub) {
              const dist = getDistance(product.latitude, product.longitude, targetHub.latitude, targetHub.longitude);
              assignment.distance = Number(dist.toFixed(2));
              assignment.earnings = Number((15 + (dist * 5)).toFixed(2));
              
              const agent = await User.findById(req.user.id);
              agent.revenue = (agent.revenue || 0) + assignment.earnings;
              await agent.save();
          }
        } catch (e) { console.error("Revenue Calc Error (Stocking):", e); }

        // 🚀 Notification to Farmer: Product Reached Hub (Stocking Flow)
        const farmer = await User.findById(product.farmer);
        if (farmer) {
          if (farmer.email) {
            transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: farmer.email,
              subject: "Agrimart: Your listed produce has reached the hub!",
              html: `
                <div style="font-family: sans-serif; color: #333;">
                  <h3>Hi ${farmer.name},</h3>
                  <p>Great news! The <strong>${product.productName}</strong> you listed has safely reached the Agrimart Hub.</p>
                  <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin-top: 0; font-weight: bold;">Listing Details:</p>
                    <ul>
                      <li>Product: ${product.productName}</li>
                      <li>Quantity: ${product.quantityAvailable} ${product.unit || 'kg'}</li>
                    </ul>
                  </div>
                  <p>It is currently being processed for quality check and verification before being published on the marketplace.</p>
                  <a href="http://localhost:5173/farmer-stock" style="display: inline-block; background: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">View My Stock</a>
                </div>
              `,
            }).catch((e) => console.error("Email Error:", e));
          }
          // 📱 Mobile Sandbox (Console Log)
          console.log(`[MOBILE NOTIFICATION SANDBOX] Sent SMS to ${farmer.phone || 'Farmer'}: Your listed produce (${product.productName}) has successfully reached the Agrimart Hub and is undergoing quality assessment.`);
        }
      }
      await product.save();
    }

    await assignment.save();
    res.json({ success: true, assignment, message: `Status updated to ${status}` });
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

// ─── RATINGS ─────────────────────────────────────────────────────────────────

// @route   POST /api/delivery/assignments/:id/rate
// @desc    Rate a delivery assignment (Admin rates Pickup, Customer rates Delivery)
// @access  Private (Admin or Customer)
router.post("/assignments/:id/rate", async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Valid rating (1-5) is required" });
    }

    const assignment = await DeliveryAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (assignment.status !== 'Delivered') {
      return res.status(400).json({ message: "Assignment must be delivered before rating" });
    }

    if (assignment.rating) {
      return res.status(400).json({ message: "Assignment already rated" });
    }

    assignment.rating = Number(rating);
    assignment.feedback = feedback || "";
    // Note: In a real app, verify that req.user matches assignment.order.buyer or admin
    // For now, simpler implementation
    await assignment.save();

    // Update Agent's Average Rating
    const agent = await User.findById(assignment.agent);
    if (agent) {
      const currentSum = (agent.deliveryRating || 0) * (agent.totalDeliveryRatings || 0);
      agent.totalDeliveryRatings = (agent.totalDeliveryRatings || 0) + 1;
      agent.deliveryRating = (currentSum + Number(rating)) / agent.totalDeliveryRatings;
      await agent.save();
    }

    res.json({ message: "Rating submitted successfully", rating: assignment.rating });
  } catch (error) {
    console.error("Rating Error:", error);
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
    allowed.forEach((f) => { 
      if (req.body[f] !== undefined) {
        if (f === 'phone' && req.body[f] !== '') {
          const p = req.body[f].trim();
          if (!/^\d{10}$/.test(p)) {
            throw new Error("INVALID_PHONE");
          }
          updates[f] = p;
        } else {
          updates[f] = req.body[f];
        }
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    if (error.message === "INVALID_PHONE") {
      return res.status(400).json({ message: "Please provide a valid 10-digit mobile number." });
    }
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
