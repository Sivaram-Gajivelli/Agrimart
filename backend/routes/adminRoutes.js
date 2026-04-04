const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Setting = require("../models/settingModel");
const adminAuth = require("../middleware/adminMiddleware");

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: "admin" }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const payload = {
      id: user._id,
      role: user.role,
      name: user.name
    };

    // Create JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Set HTTP-Only cookie as adminToken
    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({
      message: "Admin logged in successfully",
      user: payload
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/check-auth
// @desc    Check admin auth status
// @access  Private (Admin)
router.get("/check-auth", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user || user.role !== "admin") {
      return res.status(401).json({ message: "Not authorized as admin" });
    }
    res.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/logout
// @desc    Admin logout
// @access  Private (Admin)
router.post("/logout", adminAuth, (req, res) => {
  res.cookie("adminToken", "", { 
    httpOnly: true, 
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.json({ message: "Admin logged out successfully" });
});

// @route   GET /api/admin/stats
// @desc    Get real-time dashboard statistics
// @access  Private (Admin)
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      farmers, customers, retailers, totalOrders,
      revenueStats, todaysStats, chartData
    ] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "retailer" }),
      Order.countDocuments(),
      
      // Total Revenue
      Order.aggregate([
        { $match: { trackingStatus: { $in: ["Completed", "Delivered"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),

      // Today's Stats
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { 
            _id: null, 
            count: { $sum: 1 }, 
            revenue: { $sum: { $cond: [{ $in: ["$trackingStatus", ["Completed", "Delivered"]] }, "$totalAmount", 0] } } 
          } 
        }
      ]),

      // Chart Data (Last 7 Days)
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $in: ["$trackingStatus", ["Completed", "Delivered"]] }, "$totalAmount", 0] } }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    const totalRevenue = revenueStats[0]?.total || 0;
    const todaysOrders = todaysStats[0]?.count || 0;
    const todaysRevenue = todaysStats[0]?.revenue || 0;

    // Format chart data for frontend
    const formattedChartData = chartData.map(item => ({
      name: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      orders: item.orders,
      revenue: item.revenue
    }));

    res.json({
      farmers,
      customers,
      retailers,
      totalOrders,
      totalRevenue,
      pendingDeliveries: await Order.countDocuments({ trackingStatus: { $nin: ["Completed", "Delivered", "Cancelled"] } }),
      complaints: 0, // Pending model implementation
      todaysOrders,
      todaysRevenue,
      chartData: formattedChartData.length > 0 ? formattedChartData : [
        { name: 'Mon', orders: 0, revenue: 0 },
        { name: 'Tue', orders: 0, revenue: 0 },
        { name: 'Wed', orders: 0, revenue: 0 },
        { name: 'Thu', orders: 0, revenue: 0 },
        { name: 'Fri', orders: 0, revenue: 0 },
        { name: 'Sat', orders: 0, revenue: 0 },
        { name: 'Sun', orders: 0, revenue: 0 },
      ]
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users grouped by role
// @access  Private (Admin)
router.get("/users", adminAuth, async (req, res) => {
  try {
    const role = req.query.role; // optional filter
    const query = role ? { role } : { role: { $ne: "admin" } };

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Approve, Reject, Block, Unblock users
// @access  Private (Admin)
router.put("/users/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "active", "blocked", "rejected"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    res.json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/products
// @desc    Get all products for management
// @access  Private (Admin)
router.get("/products", adminAuth, async (req, res) => {
  try {
    const products = await Product.find()
      .populate("farmer", "name email")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/products/:id/approve
// @desc    Approve/Reject product
// @access  Private (Admin)
router.put("/products/:id/approve", adminAuth, async (req, res) => {
  try {
    const { status } = req.body; // 'verified', 'rejected', 'quality assessment'
    const product = await Product.findByIdAndUpdate(req.params.id, { verificationStatus: status }, { new: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders for management
// @access  Private (Admin)
router.get("/orders", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("buyer", "name email phone")
      .populate("items.farmer", "name email phone address")
      .populate("items.product", "productName pricePerKg unit image category")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.put("/orders/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { trackingStatus: status }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/hubs
// @desc    Get all hubs
// @access  Private (Admin)
router.get("/hubs", adminAuth, async (req, res) => {
  try {
    const Hub = require("../models/hubModel");
    const hubs = await Hub.find().sort({ name: 1 });
    res.json(hubs);
  } catch (error) {
    res.json([]);
  }
});

// @route   GET /api/admin/hubs/public
// @desc    Get hubs for checkout (public)
// @access  Public
router.get("/hubs/public", async (req, res) => {
  try {
    const Hub = require("../models/hubModel");
    const hubs = await Hub.find({ status: 'active' }, 'name latitude longitude').sort({ name: 1 });
    res.json(hubs);
  } catch (error) {
    res.json([]);
  }
});

// @route   POST /api/admin/hubs
// @desc    Add a new hub
// @access  Private (Admin)
router.post("/hubs", adminAuth, async (req, res) => {
  try {
    const Hub = require("../models/hubModel");
    const { name, location, latitude, longitude, status } = req.body;
    const hub = await Hub.create({ name, location, latitude: parseFloat(latitude), longitude: parseFloat(longitude), status: status || 'active' });
    res.status(201).json(hub);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "Hub with this name already exists" });
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/hubs/:id/status
// @desc    Toggle hub status
// @access  Private (Admin)
router.put("/hubs/:id/status", adminAuth, async (req, res) => {
  try {
    const Hub = require("../models/hubModel");
    const hub = await Hub.findById(req.params.id);
    if (!hub) return res.status(404).json({ message: "Hub not found" });
    hub.status = hub.status === 'active' ? 'inactive' : 'active';
    await hub.save();
    res.json(hub);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/admin/hubs/:id
// @desc    Delete a hub
// @access  Private (Admin)
router.delete("/hubs/:id", adminAuth, async (req, res) => {
  try {
    const Hub = require("../models/hubModel");
    await Hub.findByIdAndDelete(req.params.id);
    res.json({ message: "Hub deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/settings
// @desc    Get platform settings
// @access  Private (Admin)
router.get("/settings", adminAuth, async (req, res) => {
  try {
    const Setting = require("../models/settingModel");
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update platform settings
// @access  Private (Admin)
router.put("/settings", adminAuth, async (req, res) => {
  try {
    const Setting = require("../models/settingModel");
    const settings = await Setting.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const DeliveryAssignment = require("../models/deliveryAssignmentModel");
const nodemailer = require("nodemailer");
const otpModel = require("../models/otpModel"); // Added for verification check

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// @route   GET /api/admin/delivery/agents
// @desc    Get all delivery agents with assignment counts
// @access  Private (Admin)
router.get("/delivery/agents", adminAuth, async (req, res) => {
  try {
    const agents = await User.find({ role: "delivery_partner" })
      .select("-password")
      .populate("assignedHub", "name location")
      .sort({ createdAt: -1 });

    // Attach active assignment counts
    const enriched = await Promise.all(
      agents.map(async (agent) => {
        const activeCount = await DeliveryAssignment.countDocuments({
          agent: agent._id,
          status: { $in: ["Assigned", "Picked Up"] },
        });
        const totalCount = await DeliveryAssignment.countDocuments({ agent: agent._id });
        return { ...agent.toObject(), activeAssignments: activeCount, totalDeliveries: totalCount };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("Get Delivery Agents Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/admin/delivery/agents
// @desc    Create a new delivery agent account
// @access  Private (Admin)
router.post("/delivery/agents", adminAuth, async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { name, email, phone, password, vehicleType, vehicleNumber, assignedHub } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Name, email, phone, and password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already in use" });
    
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ message: "Phone number already in use" });

    // Verify OTP sessions (email and phone)
    const emailOtp = await otpModel.findOne({ contact: email });
    if (!emailOtp || !emailOtp.isVerified) {
      return res.status(401).json({ message: "Email verification required" });
    }

    const phoneOtp = await otpModel.findOne({ contact: phone });
    if (!phoneOtp || !phoneOtp.isVerified) {
      return res.status(401).json({ message: "Mobile verification required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const agent = await User.create({
      name, email, phone, password: hashedPassword,
      role: "delivery_partner", status: "active",
      isVerified: true, isMobileVerified: true, // Mark as fully verified
      vehicleType, vehicleNumber, assignedHub: assignedHub || undefined,
    });

    // Send Onboarding Email with professional styling
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/delivery/login`;
    
    const mailOptions = {
      from: `"Agrimart Logistics" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to the Agrimart Delivery Team!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #1e1b4b; padding: 20px; text-align: center;">
            <h1 style="color: #818cf8; margin: 0; font-size: 24px;">Agrimart Logistics</h1>
          </div>
          <div style="padding: 30px; line-height: 1.6; color: #1e293b;">
            <h2 style="margin-top: 0;">Welcome aboard, ${name}!</h2>
            <p>You have been registered as an official Delivery Partner for Agrimart. Your account is now active and ready for assignments.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; font-size: 16px; color: #475569;">Your Login Credentials</h3>
              <p style="margin: 5px 0;"><strong>Portal:</strong> <a href="${loginUrl}" style="color: #6366f1;">Delivery Agent Login</a></p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <span style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password}</span></p>
            </div>
            
            <p>Please keep these credentials secure. You can log in to your dashboard to view assigned pickups and deliveries.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${loginUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Log In to Dashboard</a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            &copy; 2026 Agrimart Logistics. All rights reserved.
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions)
      .then(() => console.log(`Onboarding email sent successfully to: ${email}`))
      .catch(e => console.error("Onboarding Email Error:", e));

    res.status(201).json({ message: "Delivery agent created", agent: { ...agent.toObject(), password: undefined } });
  } catch (error) {
    console.error("Create Agent Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/delivery/agents/:id
// @desc    Edit a delivery agent
// @access  Private (Admin)
router.put("/delivery/agents/:id", adminAuth, async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { name, phone, password, vehicleType, vehicleNumber, assignedHub, status } = req.body;
    
    let updateData = { name, phone, vehicleType, vehicleNumber, assignedHub: assignedHub || undefined, status };
    
    // Handle password update if provided
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const agent = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-password").populate("assignedHub", "name location");
    
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    
    // If password was updated, maybe notify the agent? (Optional)
    if (password) {
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: agent.email,
          subject: "Agrimart Account Security: Password Updated",
          html: `<p>Hi ${agent.name},</p>
            <p>Your Agrimart delivery partner account password has been updated by an administrator.</p>
            <p>If you did not request this, please contact support immediately.</p>`,
        }).catch(e => console.error("Password Update Email Error:", e));
    }

    res.json(agent);
  } catch (error) {
    console.error("Edit Agent Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/admin/delivery/agents/:id
// @desc    Delete a delivery agent
// @access  Private (Admin)
router.delete("/delivery/agents/:id", adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Delivery agent deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/delivery/unassigned
// @desc    Get orders that need a delivery assignment (Ready for Pickup and Ready for Delivery)
// @access  Private (Admin)
router.get("/delivery/unassigned", adminAuth, async (req, res) => {
  try {
    const Order = require("../models/orderModel");

    // Get orders that need pickup or delivery assignments
    const needsPickup = await Order.find({ trackingStatus: "Ready for Pickup" })
      .populate("buyer", "name phone")
      .populate("items.farmer", "name phone address")
      .populate("items.product", "productName unit");

    const needsDelivery = await Order.find({ trackingStatus: "Ready for Delivery" })
      .populate("buyer", "name phone")
      .populate("items.farmer", "name")
      .populate("items.product", "productName unit");

    // Filter out those already assigned
    const existingPickupOrderIds = (await DeliveryAssignment.find({ type: "Pickup" }).select("order")).map(a => a.order.toString());
    const existingDeliveryOrderIds = (await DeliveryAssignment.find({ type: "Delivery" }).select("order")).map(a => a.order.toString());

    res.json({
      pickups: needsPickup.filter(o => !existingPickupOrderIds.includes(o._id.toString())),
      deliveries: needsDelivery.filter(o => !existingDeliveryOrderIds.includes(o._id.toString())),
    });
  } catch (error) {
    console.error("Get Unassigned Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/admin/delivery/assign
// @desc    Assign an order to a delivery agent
// @access  Private (Admin)
router.post("/delivery/assign", adminAuth, async (req, res) => {
  try {
    const { orderId, agentId, type } = req.body; // type: 'Pickup' or 'Delivery'

    if (!orderId || !agentId || !type) {
      return res.status(400).json({ message: "orderId, agentId, and type are required" });
    }

    const Order = require("../models/orderModel");
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const agent = await User.findById(agentId).select("-password");
    if (!agent || agent.role !== "delivery_partner") {
      return res.status(404).json({ message: "Delivery agent not found" });
    }

    // Create assignment
    const assignment = await DeliveryAssignment.create({
      order: orderId,
      agent: agentId,
      type,
    });

    // Update order status
    if (type === "Pickup") {
      order.trackingStatus = "Ready for Pickup";
    } else {
      order.trackingStatus = "Ready for Delivery";
    }
    await order.save();

    // Email the agent
    if (agent.email) {
      const populatedOrder = await Order.findById(orderId)
        .populate("items.product", "productName")
        .populate("buyer", "name phone");
      const itemsHtml = (populatedOrder.items || [])
        .map(i => `<li>${i.product?.productName || 'Item'} – ${i.quantity} kg</li>`)
        .join("");

      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: agent.email,
        subject: `Agrimart: New ${type} Assignment`,
        html: `<h3>Hi ${agent.name},</h3>
          <p>You have been assigned a new <strong>${type}</strong> task for order <strong>#${orderId.toString().slice(-8).toUpperCase()}</strong>.</p>
          <ul>${itemsHtml}</ul>
          ${type === "Pickup" ? `<p>Please pick up from the farmer and deliver to the hub.</p>` : `<p>Please deliver the order to: <strong>${order.deliveryAddress}</strong></p>`}
          <p>Log in to your Delivery Dashboard for full details.</p>`,
      }).catch(e => console.error("Email Error:", e));
    }

    res.status(201).json({ assignment, message: `Order assigned for ${type}` });
  } catch (error) {
    console.error("Assign Delivery Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/delivery/tracking
// @desc    Get all active (in-progress) delivery assignments
// @access  Private (Admin)
router.get("/delivery/tracking", adminAuth, async (req, res) => {
  try {
    const active = await DeliveryAssignment.find({
      status: { $in: ["Assigned", "Picked Up"] },
    })
      .populate("agent", "name phone email vehicleType vehicleNumber")
      .populate({
        path: "order",
        populate: [
          { path: "buyer", select: "name phone address" },
          { path: "items.product", select: "productName" },
          { path: "items.farmer", select: "name address" },
        ],
      })
      .sort({ assignedAt: -1 });

    res.json(active);
  } catch (error) {
    console.error("Delivery Tracking Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/delivery/tracking/:id/complete
// @desc    Admin marks a delivery as completed (failed/forced complete)
// @access  Private (Admin)
router.put("/delivery/tracking/:id/complete", adminAuth, async (req, res) => {
  try {
    const { status, orderStatus } = req.body;
    const Order = require("../models/orderModel");

    const assignment = await DeliveryAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    assignment.status = status || "Delivered";
    assignment.completedAt = new Date();
    await assignment.save();

    if (orderStatus) {
      await Order.findByIdAndUpdate(assignment.order, { trackingStatus: orderStatus });
    }

    res.json({ message: "Assignment updated", assignment });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/delivery/hub-quality-check
// @desc    Get orders that have arrived at the hub and need quality check
// @access  Private (Admin)
router.get("/delivery/hub-quality-check", adminAuth, async (req, res) => {
  try {
    const Order = require("../models/orderModel");
    const orders = await Order.find({
      trackingStatus: { $in: ["Delivered to Hub", "Quality Checked", "Hub Packed"] },
    })
      .populate("buyer", "name phone")
      .populate("items.product", "productName unit image")
      .populate("items.farmer", "name phone")
      .sort({ updatedAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Hub QC Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/delivery/hub-quality-check/:id
// @desc    Admin updates hub QC status (Quality Checked / Rejected / Hub Packed / Ready for Delivery)
// @access  Private (Admin)
router.put("/delivery/hub-quality-check/:id", adminAuth, async (req, res) => {
  try {
    const { trackingStatus } = req.body;
    const validQCStatuses = ["Quality Checked", "Hub Packed", "Ready for Delivery", "Cancelled"];

    if (!validQCStatuses.includes(trackingStatus)) {
      return res.status(400).json({ message: "Invalid QC status" });
    }

    const Order = require("../models/orderModel");
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { trackingStatus },
      { new: true }
    ).populate("buyer", "name email phone");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // If Hub Packed → send dispatch email to customer
    if (trackingStatus === "Hub Packed" && order.buyer?.email) {
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: order.buyer.email,
        subject: "Agrimart: Your order is packed and ready at the hub!",
        html: `<h3>Hi ${order.buyer.name},</h3><p>Great news! Your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> has passed quality check and has been packed. It will be dispatched to you shortly.</p>`,
      }).catch(e => console.error("Email Error:", e));
    }

    res.json(order);
  } catch (error) {
    console.error("Hub QC Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/delivery/assignments
// @desc    Get all active delivery assignments for admin dashboard
// @access  Private (Admin)
router.get("/delivery/assignments", adminAuth, async (req, res) => {
  try {
    const DeliveryAssignment = require("../models/deliveryAssignmentModel");
    const assignments = await DeliveryAssignment.find()
      .populate("agent", "name phone email vehicleType vehicleNumber")
      .populate({
        path: "order",
        populate: [
          { path: "buyer", select: "name phone" },
          { path: "items.product", select: "productName image unit" },
          { path: "items.farmer", select: "name phone address" }
        ]
      })
      .sort({ assignedAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Admin Assignments Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

