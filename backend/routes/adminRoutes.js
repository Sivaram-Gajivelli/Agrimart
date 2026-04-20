const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Hub = require("../models/hubModel");
const Setting = require("../models/settingModel");
const adminAuth = require("../middleware/adminMiddleware");
const { updateFarmersRevenue } = require("../utils/revenueHelper");
const { getDistance } = require("../utils/distanceHelper");

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

router.post("/logout", (req, res) => {
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
    const { period = 'weekly' } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate chart start date based on period
    let chartStartDate = new Date();
    let groupFormat = "%Y-%m-%d";
    
    if (period === 'weekly') {
        chartStartDate.setDate(today.getDate() - 7);
    } else if (period === 'monthly') {
        chartStartDate.setDate(today.getDate() - 30);
    } else if (period === 'yearly') {
        chartStartDate.setFullYear(today.getFullYear() - 1);
        groupFormat = "%Y-%m"; // Group by month for year view
    }

    const [
      farmers, customers, totalOrders, totalProducts,
      revenueStats, todaysStats, chartData
    ] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "customer" }),
      Order.countDocuments(),
      Product.countDocuments(),
      
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

      // Chart Data
      Order.aggregate([
        { $match: { createdAt: { $gte: chartStartDate } } },
        { $group: {
            _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
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

    // 💰 Calculate Period Revenue
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const periodStats = await Order.aggregate([
      { $match: { trackingStatus: { $in: ["Completed", "Delivered"] } } },
      {
        $group: {
          _id: null,
          weekly: { $sum: { $cond: [{ $gte: ["$createdAt", startOfWeek] }, "$totalAmount", 0] } },
          monthly: { $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$totalAmount", 0] } },
          yearly: { $sum: { $cond: [{ $gte: ["$createdAt", startOfYear] }, "$totalAmount", 0] } }
        }
      }
    ]);

    const periodRevenue = periodStats[0] || { weekly: 0, monthly: 0, yearly: 0 };

    // Format chart data for frontend
    const formattedChartData = chartData.map(item => ({
      name: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      orders: item.orders,
      revenue: item.revenue
    }));

    res.json({
      farmers,
      customers,
      totalOrders,
      totalProducts,
      totalRevenue,
      periodRevenue,
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
    // Fetch products with all relevant data
    const products = await Product.find()
      .populate("farmer", "name email")
      .populate("nearestHub", "name location")
      .sort({ createdAt: -1 });

    // 🗺️ AUTO-BACKFILL: Resolve "Not Assigned" hubs on the fly for products missing it
    const hubs = await Hub.find({ status: 'active' });
    const updatedProducts = await Promise.all(products.map(async (p) => {
        // Only backfill if nearestHub is missing but we have location data
        if (!p.nearestHub && hubs.length > 0) {
            let lat = p.latitude;
            let lng = p.longitude;
            
            // If product has no coords, try to use farmer's coords as a localized fallback
            if (!lat || !lng) {
                const farmer = await User.findById(p.farmer);
                if (farmer && farmer.latitude && farmer.longitude) {
                    lat = farmer.latitude;
                    lng = farmer.longitude;
                }
            }

            if (lat && lng) {
                let minHubDist = Infinity;
                let bestHub = null;
                
                hubs.forEach(h => {
                    const dist = getDistance(lat, lng, h.latitude, h.longitude);
                    if (dist < minHubDist) {
                        minHubDist = dist;
                        bestHub = h;
                    }
                });

                if (bestHub) {
                    p.nearestHub = bestHub._id;
                    await p.save();
                    console.log(`[BACKFILL-GPS] Assigned hub ${bestHub.name} to product ${p.productName}`);
                    p.nearestHub = { _id: bestHub._id, name: bestHub.name, location: bestHub.location };
                }
            } else if (p.manualLocation) {
                // 📝 TEXT FALLBACK: More flexible word-based match
                const text = p.manualLocation.toLowerCase();
                const matchedHub = hubs.find(h => {
                    const hubNameLow = h.name.toLowerCase();
                    const hubLocLow = h.location.toLowerCase();
                    // If location contains any word from hub name (e.g. "Guntur")
                    return hubNameLow.split(' ').some(word => word.length > 3 && text.includes(word)) ||
                           hubLocLow.split(' ').some(word => word.length > 3 && text.includes(word));
                });

                if (matchedHub) {
                    p.nearestHub = matchedHub._id;
                    await p.save();
                    console.log(`[BACKFILL-TEXT] Assigned hub ${matchedHub.name} to product ${p.productName} via "${p.manualLocation}"`);
                    p.nearestHub = { _id: matchedHub._id, name: matchedHub.name, location: matchedHub.location };
                }
            }
        }
        return p;
    }));

    res.json(updatedProducts);
  } catch (error) {
    console.error("Admin products fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// @route   PUT /api/admin/products/:id/approve
// @desc    Verify and list a product for sale (Final Verification in Hubs tab)
// @access  Private (Admin)
router.put("/products/:id/approve", adminAuth, async (req, res) => {
  try {
    const { status } = req.body; // 'verified', 'rejected', 'quality assessment'
    
    // 🔒 RESTRICTION: Admin cannot verify until it's delivered to hub
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (status === 'verified') {
        if (product.deliveryStatus !== 'At Hub') {
            return res.status(400).json({ 
                message: "This product must be marked 'At Hub' by logistics before it can be verified." 
            });
        }
        
        // 🔒 NEW RESTRICTION: Must pass Quality Check first
        if (product.verificationStatus !== 'quality assessment') {
            return res.status(400).json({
                message: "Hub Quality check pending. Please pass QC in the Delivery Management tab first."
            });
        }
    }

    product.verificationStatus = status;
    if (status === 'verified') {
        product.deliveryStatus = 'At Hub';
    }
    await product.save();

    // 🚀 NEW: Auto-transition Order to 'Quality Checked' when all its items are verified
    if (status === 'verified') {
        const ordersToUpdate = await Order.find({ "items.product": req.params.id })
            .populate('items.product', 'verificationStatus');
            
        for (const order of ordersToUpdate) {
            // Check if all other items in this order are ALSO verified
            const isFullyVerified = order.items.every(it => 
                it.product && it.product.verificationStatus === 'verified'
            );
            
            // 🚀 NEW: Comprehensive list including legacy statuses for auto-advancement
            const preQCStatuses = ['Processing', 'Ordered', 'Order Placed', 'Farmer Packed', 'Ready for Pickup', 'Picked Up', 'Delivered to Hub'];
            
            if (isFullyVerified && preQCStatuses.includes(order.trackingStatus)) {
                order.trackingStatus = 'Quality Checked';
                await order.save();
                console.log(`[FLOW] Order #${order._id.toString().slice(-8).toUpperCase()} moved to Quality Checked (All items verified)`);
            }
        }
    }

    res.json(product);
  } catch (error) {
    console.error("Product Approve Error:", error);
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
      .populate("items.product", "productName pricePerKg unit image category verificationStatus deliveryStatus")
      .sort({ createdAt: -1 });

    // 🚀 SELF-HEALING: Auto-repair statuses for orders stuck in legacy or pre-QC states
    const preQCStatuses = ['Processing', 'Ordered', 'Order Placed', 'Farmer Packed', 'Ready for Pickup', 'Picked Up', 'Delivered to Hub'];

    for (const order of orders) {
        if (preQCStatuses.includes(order.trackingStatus)) {
            const isFullyVerified = order.items.length > 0 && order.items.every(it => 
                it.product && it.product.verificationStatus === 'verified'
            );
            
            if (isFullyVerified) {
                order.trackingStatus = 'Quality Checked';
                await order.save();
            }
        }
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🛑 MANUAL STATUS UPDATE DISABLED: Admins can no longer manually advance order status.
// Status is now strictly managed by Hub/Delivery logistics events.
/*
router.put("/orders/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.trackingStatus = status;
    await order.save();
    
    // ... automation logic removed for safety ...
    
    res.json(order);
  } catch (error) {
    console.error("Order Status Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
*/

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
    const DeliveryAssignment = require("../models/deliveryAssignmentModel");

    // 🚚 PICKUPS: Farmer -> Hub (Includes both Order-linked and Stocking)
    // 1. Fetch ALL "Ready for Pickup" Products (Stocking flow)
    const StockProduct = require("../models/productModel");
    const readyProducts = await StockProduct.find({ deliveryStatus: "Ready for Pickup" })
      .populate("farmer", "name phone manualLocation")
      .sort({ updatedAt: -1 });

    // 2. Fetch ALL "Ready for Pickup" Orders (Sales flow)
    const allPickups = await Order.find({ trackingStatus: "Ready for Pickup" })
      .populate("buyer", "name phone")
      .populate("items.farmer", "name phone address")
      .populate("items.product", "productName unit manualLocation")
      .sort({ createdAt: -1 });

    // 3. Fetch ALL Pickup Assignments
    const pickupAssignments = await DeliveryAssignment.find({ type: "Pickup" })
      .populate("agent", "name vehicleNumber")
      .populate("product", "productName unit");
    
    // 4. Merge results for the Admin Dashboard
    const pickups = [];

    // Add Order-based pickups
    allPickups.forEach(order => {
        const assignment = pickupAssignments.find(a => a.order && a.order.toString() === order._id.toString());
        pickups.push({
            ...order.toObject(),
            assignment: assignment ? { agent: assignment.agent, status: assignment.status, _id: assignment._id } : null,
            isStocking: false
        });
    });

    // Add Product-based (Stocking) pickups if not already covered by an order
    readyProducts.forEach(prod => {
        // Check if this product is already in the 'pickups' array as an order
        const alreadyInOrder = pickups.some(p => p.items && p.items.some(i => i.product && i.product._id.toString() === prod._id.toString()));
        
        if (!alreadyInOrder) {
            const assignment = pickupAssignments.find(a => a.product && a.product._id.toString() === prod._id.toString());
            pickups.push({
                _id: prod._id,
                items: [{ product: prod, farmer: prod.farmer }],
                trackingStatus: "Ready for Pickup",
                assignment: assignment ? { agent: assignment.agent, status: assignment.status, _id: assignment._id } : null,
                isStocking: true,
                createdAt: prod.updatedAt
            });
        }
    });

    // 📦 DELIVERIES: Hub -> Customer
    const needsDelivery = await Order.find({ trackingStatus: "Ready for Delivery" })
      .populate("buyer", "name phone")
      .populate("items.farmer", "name")
      .populate("items.product", "productName unit")
      .sort({ createdAt: -1 });

    const deliveryAssignments = await DeliveryAssignment.find({ type: "Delivery" })
      .populate("agent", "name vehicleNumber");

    const deliveries = needsDelivery.map(order => {
        const assignment = deliveryAssignments.find(a => a.order && a.order.toString() === order._id.toString());
        return {
            ...order.toObject(),
            assignment: assignment ? { agent: assignment.agent, status: assignment.status, _id: assignment._id } : null,
            isStocking: false
        };
    });

    res.json({ pickups, deliveries });
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
    const { orderId, agentId, type, isStocking } = req.body; 

    if (!orderId || !agentId || !type) {
      return res.status(400).json({ message: "orderId, agentId, and type are required" });
    }

    const agent = await User.findById(agentId).select("-password");
    if (!agent || agent.role !== "delivery_partner") {
      return res.status(404).json({ message: "Delivery agent not found" });
    }

    if (isStocking) {
        // STOCKING FLOW: Associated with Product
        const Product = require("../models/productModel");
        const product = await Product.findById(orderId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Create assignment (Linked to Product)
        await DeliveryAssignment.create({
            product: orderId,
            agent: agentId,
            type: "Pickup",
            status: "Assigned"
        });

        // Update product status
        product.deliveryStatus = "Ready for Pickup";
        await product.save();
    } else {
        // SALES FLOW: Associated with Order
        const Order = require("../models/orderModel");
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Create assignment (Linked to Order)
        await DeliveryAssignment.create({
            order: orderId,
            agent: agentId,
            type,
            status: "Assigned"
        });

        // Update order status
        if (type === "Pickup") {
            order.trackingStatus = "Ready for Pickup";
        } else {
            order.trackingStatus = "Ready for Delivery";
        }
        await order.save();
    }

    res.json({ message: "Task assigned successfully" });

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

    // 🚀 NEW: Calculate Revenue for Agent (Admin Forced Complete)
    try {
        const hubs = await Hub.find();
        const agent = await User.findById(assignment.agent).select("assignedHub");
        const targetHub = hubs.find(h => h._id.toString() === agent?.assignedHub?.toString()) || hubs[0];
        
        let startLat, startLng, endLat, endLng;
        if (assignment.type === 'Pickup') {
            const prod = await Product.findById(assignment.product).populate('farmer');
            const order = await Order.findById(assignment.order).populate('items.farmer');
            const farmer = order?.items?.[0]?.farmer || prod?.farmer;
            if (farmer?.latitude && farmer?.longitude && targetHub) {
                startLat = farmer.latitude; startLng = farmer.longitude;
                endLat = targetHub.latitude; endLng = targetHub.longitude;
            }
        } else {
            const order = await Order.findById(assignment.order).populate('buyer');
            if (targetHub && order?.buyer?.latitude && order?.buyer?.longitude) {
                startLat = targetHub.latitude; startLng = targetHub.longitude;
                endLat = order.buyer.latitude; endLng = order.buyer.longitude;
            }
        }

        if (startLat && startLng && endLat && endLng) {
            const dist = getDistance(startLat, startLng, endLat, endLng);
            assignment.distance = Number(dist.toFixed(2));
            assignment.earnings = Number((15 + (dist * 5)).toFixed(2));
            
            // Update agent total
            await User.findByIdAndUpdate(assignment.agent, { $inc: { revenue: assignment.earnings } });
        }
    } catch (e) { console.error("Admin Revenue Calc Error:", e); }

    await assignment.save();

    if (orderStatus) {
      const order = await Order.findByIdAndUpdate(assignment.order, { trackingStatus: orderStatus }, { new: true });
      // 🚀 NEW: REVENUE LOGIC
      if (orderStatus === "Delivered" || orderStatus === "Completed") {
          await updateFarmersRevenue(order);
      }
    }

    res.json({ message: "Assignment updated", assignment });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/delivery/hub-quality-check
// @desc    Get orders and stocking pickups that have arrived at the hub and need quality check
// @access  Private (Admin)
router.get("/delivery/hub-quality-check", adminAuth, async (req, res) => {
  try {
    const Order = require("../models/orderModel");
    const Product = require("../models/productModel");
    
    // 1. Fetch Orders in QC-eligible states
    const orders = await Order.find({
      trackingStatus: { $in: ["Processing", "Quality Checked", "Hub Packed"] },
    })
      .populate("buyer", "name phone")
      .populate("items.product", "productName unit image")
      .populate("items.farmer", "name phone")
      .lean();

    // 2. Fetch Products (Stocking) in Hub
    const products = await Product.find({
      deliveryStatus: "At Hub"
    })
      .populate("farmer", "name phone")
      .lean();

    // Attach type for frontend identification
    const items = [
      ...orders.map(o => ({ ...o, itemType: 'Order' })),
      ...products.map(p => ({ 
        ...p, 
        itemType: 'Stocking', 
        trackingStatus: (p.verificationStatus === 'quality assessment' || p.verificationStatus === 'verified') ? 'Quality Checked' : 'Processing' 
      }))
    ];

    res.json(items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
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
    const { trackingStatus, itemType } = req.body;
    const validQCStatuses = ["Quality Checked", "Hub Packed", "Ready for Delivery", "Cancelled"];

    if (!validQCStatuses.includes(trackingStatus)) {
      return res.status(400).json({ message: "Invalid QC status" });
    }

    if (itemType === 'Order' || !itemType) {
      const Order = require("../models/orderModel");
      const Product = require("../models/productModel");
      
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { trackingStatus },
        { new: true }
      ).populate("buyer", "name email phone");

      if (!order) return res.status(404).json({ message: "Order not found" });

      // 🔗 BRIDGE: If QC Passed → Update all underlying products to 'quality assessment'
      if (trackingStatus === 'Quality Checked') {
          const productIds = (order.items || []).map(it => it.product);
          await Product.updateMany(
              { _id: { $in: productIds }, verificationStatus: 'pending' }, 
              { verificationStatus: 'quality assessment' }
          );
      }

      // If Hub Packed → send dispatch email to customer
      if (trackingStatus === "Hub Packed" && order.buyer?.email) {
        const transporter = require('../utils/emailService').transporter;
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: order.buyer.email,
          subject: "Agrimart: Your order is packed and ready at the hub!",
          html: `<h3>Hi ${order.buyer.name},</h3><p>Great news! Your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> has passed quality check and has been packed. It will be dispatched to you shortly.</p>`,
        }).catch(e => console.error("Email Error:", e));
      }

      // If Ready for Delivery → assign final delivery agent
      if (trackingStatus === "Ready for Delivery") {
         const { autoAssignDeliveryAgent } = require('../utils/logisticsHelper');
         // We'll need a hub ID. The items came from a hub, or we default to the first hub.
         // Usually we'd use the assignment.agent.assignedHub but we don't have that here.
         // Realistically, the autoAssignDeliveryAgent function finds the closest agent anyway.
         // The helper autoAssignDeliveryAgent(orderId, type, hubId) might need a hub. Let's pass null and see if it falls back or fetches order coords.
         try {
             // For simplicity, we trigger the agent assignment. The helper will find any online agent.
             await autoAssignDeliveryAgent(order._id, 'Delivery');
             console.log(`[FLOW] Final delivery agent auto-assigned for Order #${order._id.toString().slice(-8).toUpperCase()}`);
         } catch (e) {
             console.error("[FLOW] Failed to auto-assign final delivery agent:", e);
         }
      }

      return res.json(order);
    } else {
      const Product = require("../models/productModel");
      const existingProduct = await Product.findById(req.params.id);
      if (!existingProduct) return res.status(404).json({ message: "Product not found" });

      const updateData = {
          deliveryStatus: trackingStatus === 'Quality Checked' ? 'At Hub' : (trackingStatus === 'Cancelled' ? 'Cancelled' : 'At Hub')
      };

      // If QC Passed → move to 'quality assessment' for final verify button in Hubs tab, but don't downgrade if already verified
      if (trackingStatus === 'Quality Checked') {
          if (existingProduct.verificationStatus === 'pending') {
              updateData.verificationStatus = 'quality assessment';
          }
      } else if (trackingStatus === 'Cancelled') {
          updateData.verificationStatus = 'rejected';
      } else {
          updateData.verificationStatus = 'pending';
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      return res.json(product);
    }
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
    let assignments = await DeliveryAssignment.find()
      .populate("agent", "name phone email vehicleType vehicleNumber deliveryRating totalDeliveryRatings")
      .populate({
        path: "order",
        populate: [
          { path: "buyer", select: "name phone" },
          { path: "items.product", select: "productName image unit trackingStatus" },
          { path: "items.farmer", select: "name phone address" }
        ]
      })
      .populate({
        path: "product",
        populate: [
          { path: "farmer", select: "name phone address" }
        ]
      })
      .sort({ assignedAt: -1 });

    // 🛡️ Data Sanitation: Filter out assignments that lost their source data (Orphaned/Deleted)
    assignments = assignments.filter(asng => asng.order || asng.product);

    // Ensure Distance/Earnings are present for safety
    const sanitized = assignments.map(a => {
        const obj = a.toObject();
        obj.distance = obj.distance || 0;
        obj.earnings = obj.earnings || 0;
        return obj;
    });

    res.json(sanitized);
  } catch (error) {
    console.error("Admin Assignments Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/admin/payments
// @desc    Get detailed transaction history
// @access  Private (Admin)
router.get("/payments", adminAuth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("buyer", "name email phone")
      .populate("items.farmer", "name email")
      .sort({ createdAt: -1 });
    
    // Enrich with computed fields if needed
    const payments = orders.map(o => ({
        _id: o._id,
        buyer: o.buyer,
        totalAmount: o.totalAmount,
        platformFee: o.platformFee,
        deliveryFee: o.deliveryFee,
        farmerRevenue: o.subtotal, // subtotal is the product total before fees
        status: o.trackingStatus,
        createdAt: o.createdAt
    }));

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLAINTS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const Complaint = require("../models/complaintModel");

// @route   GET /api/admin/complaints
// @desc    Get all active complaints
// @access  Private (Admin)
router.get("/complaints", adminAuth, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("user", "name role email phone")
      .populate({
          path: "order",
          select: "trackingStatus totalAmount createdAt"
      })
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/complaints/:id/resolve
// @desc    Update complaint status and resolution
// @access  Private (Admin)
router.put("/complaints/:id/status", adminAuth, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
        req.params.id,
        { status, resolution },
        { new: true }
    );
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/admin/reports/analytics
// @desc    Get aggregated data for reporting
// @access  Private (Admin)
router.get("/reports/analytics", adminAuth, async (req, res) => {
  try {
    const stats = await Order.aggregate([
        { $match: { trackingStatus: { $ne: 'Cancelled' } } },
        { $group: {
            _id: { $month: "$createdAt" },
            sales: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
            platformRevenue: { $sum: "$platformFee" }
        }},
        { $sort: { "_id": 1 } }
    ]);

    const categoryStats = await Product.aggregate([
        { $group: {
            _id: "$category",
            count: { $sum: 1 },
            stock: { $sum: "$quantityAvailable" }
        }}
    ]);

    res.json({ stats, categoryStats });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

