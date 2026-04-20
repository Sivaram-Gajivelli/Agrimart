const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/authMiddleware");
const User = require("../models/userModel");
const Hub = require("../models/hubModel");
const OTP = require("../models/otpModel");
const Order = require("../models/orderModel");
const DeliveryAssignment = require("../models/deliveryAssignmentModel");
const bcrypt = require("bcryptjs");
const { getDistance } = require("../utils/distanceHelper");
const { sendVerificationEmail, sendFarmerHubArrivalNotification } = require("../utils/emailService");

const router = express.Router();

// GET USER PROFILE
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// REQUEST OTP FOR PROFILE UPDATE OR PASSWORD CHANGE
router.post("/verify-request", auth, async (req, res) => {
  try {
    let { contact, type } = req.body; // contact: email or phone, type: 'email' or 'phone'
    if (!contact) return res.status(400).json({ message: "Contact information required" });

    // Normalize
    contact = contact.trim().toLowerCase();

    if (type === 'phone' && !/^\d{10}$/.test(contact)) {
      return res.status(400).json({ message: "Please provide a valid 10-digit mobile number." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP
    await OTP.findOneAndUpdate(
      { contact },
      { otp, isVerified: false, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    if (type === 'phone' || !contact.includes('@')) {
      console.log(`[PROFILE VERIFICATION] OTP for ${contact}: ${otp}`);
      return res.json({ message: "Verification code sent to your mobile (check console log)" });
    } else {
      // Real email delivery (Asynchronous for performance)
      sendVerificationEmail(contact, otp, 'profile');
      return res.json({ message: "Verification code sent to your email inbox" });
    }
  } catch (err) {
    console.error("VERIFY REQUEST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// CONFIRM OTP
router.post("/verify-confirm", auth, async (req, res) => {
  try {
    let { contact, otp } = req.body;
    if (!contact || !otp) return res.status(400).json({ message: "Contact and OTP required" });

    // Normalize
    contact = contact.trim().toLowerCase();
    otp = otp.trim();

    const otpSession = await OTP.findOne({ contact, otp });

    if (!otpSession) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    res.json({ message: "Verification successful" });
  } catch (err) {
    console.error("VERIFY CONFIRM ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE PROFILE FIELDS (Requires OTP for Email/Phone)
router.put("/profile-update", auth, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const user = await User.findById(req.user.id);

    if (email && email.trim().toLowerCase() !== (user.email || '').toLowerCase()) {
      const normalizedEmail = email.trim().toLowerCase();
      const otpSession = await OTP.findOne({ contact: normalizedEmail, isVerified: true });
      if (!otpSession) return res.status(400).json({ message: "Email verification required" });
      user.email = normalizedEmail;
      user.isVerified = true;
      await OTP.deleteOne({ contact: normalizedEmail });
    }

    if (phone && phone.trim()) {
      const normalizedPhone = phone.trim();
      if (!/^\d{10}$/.test(normalizedPhone)) {
        return res.status(400).json({ message: "Please provide a valid 10-digit mobile number." });
      }
      if (normalizedPhone !== (user.phone || '')) {
        const otpSession = await OTP.findOne({ contact: normalizedPhone.toLowerCase(), isVerified: true });
        if (!otpSession) return res.status(400).json({ message: "Phone verification required" });
        user.phone = normalizedPhone;
        user.isMobileVerified = true;
        await OTP.deleteOne({ contact: normalizedPhone.toLowerCase() });
      }
    }

    if (name) user.name = name;
    if (address) user.address = address;

    await user.save();
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("PROFILE UPDATE ERROR:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use by another account.` });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// CHANGE PASSWORD (Requires OTP verification on current email/phone)
router.put("/change-password", auth, async (req, res) => {
  try {
    let { newPassword, contact, otp } = req.body;
    
    // Normalize
    contact = contact ? contact.trim().toLowerCase() : "";
    otp = otp ? otp.trim() : "";

    const otpSession = await OTP.findOne({ contact, otp, isVerified: true });
    if (!otpSession) {
      return res.status(400).json({ message: "OTP verification required to change password" });
    }

    const user = await User.findById(req.user.id);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    await OTP.deleteOne({ contact });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// UPDATE PRODUCT DELIVERY STATUS (Farmer to Hub)
router.put("/product/:id/status", auth, async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    const { id } = req.params;

    const product = await require('../models/productModel').findById(id).populate('farmer', 'name email phone');
    if (!product) return res.status(404).json({ message: "Product not found" });

    // 🔒 RESTRICTION: Farmer can only update status to certain levels
    if (req.user.role === 'farmer') {
        if (product.farmer._id.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to update this product status" });
        }

        const restrictedStatuses = ['Picked Up', 'At Hub', 'Verified', 'Completed'];
        if (restrictedStatuses.includes(deliveryStatus)) {
            return res.status(400).json({ message: "This logistics step must be performed by a delivery partner or hub personnel." });
        }
    }

    product.deliveryStatus = deliveryStatus;
    await product.save();

    const Order = require('../models/orderModel'); 

    // 🚀 NEW: Auto-Assign Delivery Agent on Ready for Pickup
    if (deliveryStatus === 'Ready for Pickup') {
        try {
            console.log(`[LOGISTICS] Status update: Product ${product.productName} (#${id}) is now Ready for Pickup.`);
            
            // 🗺️ AUTO-BACKFILL HUB: If nearestHub is missing, calculate it now
            if (!product.nearestHub) {
                const hubs = await Hub.find({ status: 'active' });
                if (hubs.length > 0) {
                    let lat = product.latitude;
                    let lng = product.longitude;
                    
                    if (!lat || !lng) {
                        const farmer = await User.findById(product.farmer);
                        if (farmer && farmer.latitude && farmer.longitude) {
                            lat = farmer.latitude;
                            lng = farmer.longitude;
                        }
                    }

                    if (lat && lng) {
                        let minHubDist = Infinity;
                        let bestHubId = null;
                        hubs.forEach(h => {
                            const dist = getDistance(lat, lng, h.latitude, h.longitude);
                            if (dist < minHubDist) {
                                minHubDist = dist;
                                bestHubId = h._id;
                            }
                        });
                        if (bestHubId) {
                            product.nearestHub = bestHubId;
                            await product.save();
                        }
                    } else if (product.manualLocation) {
                        const text = product.manualLocation.toLowerCase();
                        const matched = hubs.find(h => {
                            const hubNameLow = h.name.toLowerCase();
                            const hubLocLow = h.location.toLowerCase();
                            return hubNameLow.split(' ').some(word => word.length > 3 && text.includes(word)) ||
                                   hubLocLow.split(' ').some(word => word.length > 3 && text.includes(word));
                        });
                        if (matched) {
                            product.nearestHub = matched._id;
                            await product.save();
                        }
                    }
                }
            }

            // 🔗 CASCADE STATUS & AUTO-ASSIGN
            const productObjectId = new mongoose.Types.ObjectId(product._id);
            const affectedOrders = await Order.find({
                'items.product': productObjectId,
                trackingStatus: { $in: ['Order Placed', 'Processing', 'Farmer Packed'] }
            });

            // 🚀 AGENT SELECTION (Hub-Aligned & Workload Balanced)
            let availableAgents = await User.find({ 
                role: 'delivery_partner', 
                status: 'active', 
                isOnline: true,
                assignedHub: product.nearestHub 
            });
            
            if (availableAgents.length === 0) {
                availableAgents = await User.find({ 
                    role: 'delivery_partner', 
                    status: 'active',
                    assignedHub: product.nearestHub
                });
            }

            if (availableAgents.length === 0) {
                availableAgents = await User.find({ role: 'delivery_partner', status: 'active', isOnline: true });
            }
            
            if (availableAgents.length > 0) {
                const rankedAgents = await Promise.all(availableAgents.map(async (agent) => {
                    const activeCount = await DeliveryAssignment.countDocuments({ 
                        agent: agent._id, 
                        status: { $in: ["Assigned", "Picked Up"] } 
                    });
                    let dist = Infinity;
                    if (product.latitude && product.longitude && agent.latitude && agent.longitude) {
                        dist = getDistance(product.latitude, product.longitude, agent.latitude, agent.longitude);
                    }
                    return { agent, activeCount, dist };
                }));

                rankedAgents.sort((a, b) => {
                    if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
                    return a.dist - b.dist;
                });

                const selectedAgent = rankedAgents[0].agent;

                if (affectedOrders.length > 0) {
                    await Order.updateMany(
                        { _id: { $in: affectedOrders.map(o => o._id) } },
                        { $set: { trackingStatus: 'Ready for Pickup' } }
                    );
                    for (const order of affectedOrders) {
                        await DeliveryAssignment.create({
                            order: order._id,
                            agent: selectedAgent._id,
                            type: 'Pickup',
                            status: 'Assigned'
                        });
                    }
                } else {
                    await DeliveryAssignment.create({
                        product: product._id,
                        agent: selectedAgent._id,
                        type: 'Pickup',
                        status: 'Assigned'
                    });
                }
            }
        } catch (assignError) {
            console.error('[LOGISTICS] Auto-assignment failed:', assignError);
        }
    }

    // 🚀 NEW: Notify Farmer on Hub Arrival
    if (deliveryStatus === 'At Hub' && product.farmer) {
        sendFarmerHubArrivalNotification(product.farmer, product.productName)
            .catch(err => console.error('Hub Arrival Notify failed:', err));
    }

    res.json({ message: "Product delivery status updated", product });
  } catch (err) {
    console.error("Product status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
