const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const DeliveryAssignment = require('../models/deliveryAssignmentModel');
const auth = require('../middleware/authMiddleware');
const { sendOrderConfirmationEmail, sendOrderCancellationEmail, sendFarmerOrderNotification } = require('../utils/emailService');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// @route   POST /api/orders
// @desc    Place a new order
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { items, deliveryAddress, deliveryFee, platformFee } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0 || !deliveryAddress) {
            return res.status(400).json({ message: 'Items array and delivery address are required' });
        }

        let subtotal = 0;
        const processedItems = [];

        // Validate and process each item
        for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({ message: 'Invalid item data (productId and valid quantity required)' });
            }

            const product = await Product.findById(item.productId);

            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
            }

            if (product.verificationStatus === 'rejected') {
                return res.status(400).json({ message: `Product ${product.productName} is rejected and not available.` });
            }

            if (item.quantity > product.quantityAvailable) {
                return res.status(400).json({ message: `Not enough stock available for ${product.productName}` });
            }

            const itemTotal = item.quantity * product.pricePerKg;
            subtotal += itemTotal;

            processedItems.push({
                product: product._id,
                farmer: product.farmer,
                quantity: item.quantity,
                pricePerKg: product.pricePerKg,
                itemTotal,
                productName: product.productName, // Temporarily appending for email array construction later
                unit: product.unit || 'kg'
            });

            // Deduct from product stock immediately
            product.quantityAvailable -= item.quantity;
            await product.save();
        }

        // 🚀 NEW: Free Delivery Scheme Validation (Threshold: ₹299)
        const FREE_DELIVERY_THRESHOLD = 299;
        let overallDeliveryFee = Number(deliveryFee) || 0;
        
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
            console.log(`[Order] Subtotal ₹${subtotal} >= ₹${FREE_DELIVERY_THRESHOLD}. Waiving delivery fee.`);
            overallDeliveryFee = 0;
        }

        const overallPlatformFee = Number(platformFee) || 0;
        const totalAmount = subtotal + overallDeliveryFee + overallPlatformFee;

        const newOrder = new Order({
            buyer: req.user.id,
            items: processedItems.map(pi => ({
                product: pi.product,
                farmer: pi.farmer,
                quantity: pi.quantity,
                pricePerKg: pi.pricePerKg,
                itemTotal: pi.itemTotal
            })),
            deliveryFee: overallDeliveryFee,
            platformFee: overallPlatformFee,
            subtotal,
            totalAmount,
            deliveryAddress
        });

        const savedOrder = await newOrder.save();

        // Send Email Async
        if (req.user && req.user.email) {
            sendOrderConfirmationEmail(req.user.email, req.user.name || 'Customer', {
                trackingId: savedOrder._id,
                items: processedItems,
                subtotal,
                deliveryFee: overallDeliveryFee,
                platformFee: overallPlatformFee,
                totalAmount
            }).catch(err => console.error("Email failed:", err));
        }

        // 🚀 NEW: Notify individual Farmers about their respective items
        try {
            const farmersToNotify = [...new Set(processedItems.map(item => item.farmer.toString()))];
            for (const farmerId of farmersToNotify) {
                const farmerUser = await User.findById(farmerId);
                if (farmerUser) {
                    const farmerItems = processedItems.filter(item => item.farmer.toString() === farmerId);
                    // Use the helper added to emailService.js
                    sendFarmerOrderNotification(farmerUser, {
                        trackingId: savedOrder._id,
                        items: farmerItems
                    }).catch(err => console.error(`Farmer ${farmerId} notify failed:`, err));
                }
            }
        } catch (notifyErr) {
            console.error('Farmer mass notify failed:', notifyErr);
        }

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

        // Find orders where at least one item belongs to this farmer
        const orders = await Order.find({ 'items.farmer': req.user.id })
            .populate('buyer', 'name phone email address')
            .populate('items.product', 'productName pricePerKg unit image selectedWeight')
            .sort({ createdAt: -1 });

        // Filter out items that do not belong to the farmer
        const farmerOrders = orders.map(order => {
            const matchedItems = order.items.filter(item => item.farmer.toString() === req.user.id);
            return {
                ...order.toObject(),
                items: matchedItems
            };
        });

        res.json(farmerOrders);
    } catch (error) {
        console.error('Error fetching farmer orders:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/orders/customer
// @desc    Get all orders placed by a customer
// @access  Private (Customer only)
router.get('/customer', auth, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const DeliveryAssignment = require('../models/deliveryAssignmentModel');
        const orders = await Order.find({ buyer: req.user.id })
            .populate('items.farmer', 'name')
            .populate('items.product', 'productName pricePerKg unit image')
            .sort({ createdAt: -1 });

        // 🚀 NEW: Attach Delivery Assignment ID for rating
        const enhancedOrders = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();
            if (order.trackingStatus === 'Delivered' || order.trackingStatus === 'Completed') {
                const deliveryAsng = await DeliveryAssignment.findOne({ order: order._id, type: 'Delivery' }).sort({ createdAt: -1 });
                if (deliveryAsng) {
                    orderObj.deliveryAssignmentId = deliveryAsng._id;
                    orderObj.isRated = !!deliveryAsng.rating;
                }
            }
            return orderObj;
        }));

        res.json(enhancedOrders);
    } catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order tracking status (Farmer actions: Processing)
// @access  Private (Farmer only)
router.put('/:id/status', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const { trackingStatus } = req.body;

        // Farmer is only allowed to advance through these statuses
        const farmerAllowedStatuses = ['Processing'];

        if (!farmerAllowedStatuses.includes(trackingStatus)) {
            return res.status(400).json({ message: 'Invalid tracking status for farmer' });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if the farmer owns any item in this order
        const hasItem = order.items.some(item => item.farmer.toString() === req.user.id);
        if (!hasItem) {
            return res.status(401).json({ message: 'Not authorized to update this order' });
        }

        order.trackingStatus = trackingStatus;
        await order.save();

        // 🚀 NEW: AUTOMATIC DELIVERY ASSIGNMENT 
        if (trackingStatus === 'Processing') {
            try {
                // Find active and online delivery agents
                const onlineAgents = await User.find({ role: 'delivery_partner', status: 'active', isOnline: true });

                if (onlineAgents.length > 0) {
                    // Pick the agent with fewest active assignments (Assigned/Picked Up)
                    const agentStats = await Promise.all(onlineAgents.map(async (agent) => {
                        const activeCount = await DeliveryAssignment.countDocuments({ 
                            agent: agent._id, 
                            status: { $in: ['Assigned', 'Picked Up'] } 
                        });
                        return { agent, activeCount };
                    }));

                    // Sort by activeCount
                    agentStats.sort((a, b) => a.activeCount - b.activeCount);
                    const selectedAgent = agentStats[0].agent;

                    // Create Assignment
                    const newAssignment = new DeliveryAssignment({
                        order: order._id,
                        agent: selectedAgent._id,
                        type: 'Pickup',
                        status: 'Assigned'
                    });
                    await newAssignment.save();

                    // Optional: Email the delivery agent too
                    if (selectedAgent.email) {
                        transporter.sendMail({
                            from: process.env.EMAIL_USER,
                            to: selectedAgent.email,
                            subject: 'New Delivery Assignment: Order ready for Processing & Pickup',
                            html: `<h3>New Assignment</h3>
                                <p>Order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> is processing and slotted for pickup.</p>
                                <p>Please check your dashboard for details.</p>`
                        }).catch(e => console.error('Agent Email Error:', e));
                    }
                }
            } catch (assignError) {
                console.error('Auto-assignment failed:', assignError);
                // We don't fail the order status update if assignment fails, 
                // but we might want to log it for Admin.
            }
        }

        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel an order by customer
// @access  Private (Customer only)
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ message: 'Access denied. Only customers can cancel.' });
        }

        const { reason } = req.body;
        const order = await Order.findById(req.params.id).populate('items.product');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.buyer.toString() !== req.user.id.toString()) {
            return res.status(401).json({ message: 'Not authorized to cancel this order' });
        }

        if (!['Order Placed', 'Processing', 'Farmer Packed'].includes(order.trackingStatus)) {
            return res.status(400).json({ message: 'Order cannot be cancelled at this stage. Please contact support.' });
        }

        order.trackingStatus = 'Cancelled';
        order.cancellationReason = reason || 'Customer Requested';

        // Restore inventory
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                if (item.product) {
                    item.product.quantityAvailable += item.quantity;
                    await item.product.save();
                }
            }
        }

        await order.save();

        // Send Email Async
        if (req.user && req.user.email) {
            sendOrderCancellationEmail(req.user.email, req.user.name || 'Customer', {
                trackingId: order._id,
                items: order.items.map(i => ({
                    productName: i.product?.productName || 'Unknown Product',
                    quantity: i.quantity,
                    unit: i.product?.unit || 'kg'
                }))
            }, order.cancellationReason).catch(err => console.error("Email failed:", err));
        }

        res.json(order);
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
