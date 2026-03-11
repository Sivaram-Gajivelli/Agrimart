const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const auth = require('../middleware/authMiddleware');

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

        // 2. Total Orders Received & Total Revenue
        const orders = await Order.find({ farmer: farmerId });
        
        const totalOrders = orders.length;

        // Calculate revenue (excluding cancelled orders)
        const totalRevenue = orders
            .filter(order => order.trackingStatus !== 'Cancelled')
            .reduce((sum, order) => sum + (order.totalPrice || 0), 0);

        // 3. Pending Orders (Assume Order Placed or Processing are pending attention)
        const pendingStatuses = ['Order Placed', 'Processing'];
        const pendingOrders = orders.filter(order => pendingStatuses.includes(order.trackingStatus)).length;

        res.json({
            totalProducts,
            totalOrders,
            totalRevenue,
            pendingOrders
        });

    } catch (error) {
        console.error('Error fetching farmer stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
