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

module.exports = router;
