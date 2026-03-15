const express = require('express');
const router = express.Router();
const Cart = require('../models/cartModel');
const protect = require('../middleware/authMiddleware');

// @desc    Get logged in user's cart
// @route   GET /api/cart
// @access  Private/Customer
router.get('/', protect, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private/Customer
router.post('/', protect, async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            cart = await Cart.create({
                user: req.user.id,
                items: [{ product: productId, quantity: Number(quantity) || 1 }]
            });
        } else {
            const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += (Number(quantity) || 1);
            } else {
                cart.items.push({ product: productId, quantity: Number(quantity) || 1 });
            }
            await cart.save();
        }

        const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        res.status(201).json(updatedCart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private/Customer
router.put('/:productId', protect, async (req, res) => {
    const { quantity } = req.body;

    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(item => item.product.toString() === req.params.productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = Number(quantity);
            await cart.save();
            const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
            return res.json(updatedCart);
        } else {
            res.status(404).json({ message: 'Product not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private/Customer
router.delete('/:productId', protect, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
        await cart.save();
        
        const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
