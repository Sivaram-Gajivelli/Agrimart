const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const auth = require('../middleware/authMiddleware');

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || !quantity) {
            return res.status(400).json({ message: 'Product ID and quantity are required' });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.verificationStatus !== 'verified') {
            return res.status(400).json({ message: 'Product is not available for purchase yet.' });
        }

        if (quantity > product.quantityAvailable) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        const totalPrice = quantity * product.pricePerKg;

        const newOrder = new Order({
            buyer: req.user.id,
            farmer: product.farmer,
            product: productId,
            quantity,
            totalPrice
        });

        // Deduct from product stock immediately to prevent double selling
        product.quantityAvailable -= quantity;
        await product.save();

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);

    } catch (error) {
        console.error('Error in creating order:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/orders/farmer
// @desc    Get all orders received by a farmer
// @access  Private (Farmer only)
router.get('/farmer', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const orders = await Order.find({ farmer: req.user.id })
            .populate('buyer', 'name phone email')
            .populate('product', 'productName pricePerKg unit')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching farmer orders:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order tracking status
// @access  Private (Farmer only)
router.put('/:id/status', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { trackingStatus } = req.body;

        const validStatuses = ['Order Placed', 'Processing', 'Quality Checked', 'Packed', 'Ready for Pickup', 'Completed', 'Cancelled'];

        if (!validStatuses.includes(trackingStatus)) {
            return res.status(400).json({ message: 'Invalid tracking status' });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.farmer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to update this order' });
        }

        order.trackingStatus = trackingStatus;
        await order.save();

        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
