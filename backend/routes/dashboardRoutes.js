const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const auth = require('../middleware/authMiddleware');
const User = require('../models/userModel');

// @route   GET /api/dashboard/farmer-stats
// @desc    Get dashboard statistics for a specific farmer
// @access  Private (Farmer only)
router.get('/farmer-stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const farmerId = req.user.id;

        // 1. Total Products Listed
        const totalProducts = await Product.countDocuments({ farmer: farmerId });

        // 2. Fetch User Profile for Revenue (Source of Truth)
        const farmerProfile = await User.findById(farmerId).select('revenue');

        // 3. Overall stats for orders
        const allOrders = await Order.find({ 'items.farmer': farmerId });
        const totalOrders = allOrders.length;
        
        // 4. Pending Orders (Assume Order Placed or Processing)
        const pendingStatuses = ['Order Placed', 'Processing'];
        const pendingOrders = allOrders.filter(order => pendingStatuses.includes(order.trackingStatus)).length;

        res.json({
            totalProducts,
            totalOrders,
            totalRevenue: farmerProfile?.revenue || 0,
            pendingOrders
        });

    } catch (error) {
        console.error('Error fetching farmer stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
