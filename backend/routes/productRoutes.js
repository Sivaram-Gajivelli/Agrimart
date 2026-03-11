const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const auth = require('../middleware/authMiddleware');

// @route   POST /api/products
// @desc    Create a new product listing
// @access  Private (Farmer only)
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied. Only farmers can list products.' });
        }

        const {
            productName,
            category,
            description,
            pricePerKg,
            quantityAvailable,
            unit,
            locationType,
            manualLocation
        } = req.body;

        // Basic validation
        if (!productName || !category || !pricePerKg || !quantityAvailable || !manualLocation) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const newProduct = new Product({
            farmer: req.user.id,
            productName,
            category,
            description,
            pricePerKg,
            quantityAvailable,
            unit: unit || 'kg',
            locationType: locationType || 'manual',
            manualLocation
        });

        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);

    } catch (error) {
        console.error('Error in creating product:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/products/my-products
// @desc    Get all products listed by the logged-in farmer
// @access  Private (Farmer only)
router.get('/my-products', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied. Only farmers can view their products.' });
        }

        // Fetch products that belong to the logged-in farmer and sort by newest first
        const products = await Product.find({ farmer: req.user.id }).sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        console.error('Error fetching my products:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/products/:id
// @desc    Update a product listing (farmer only)
// @access  Private (Farmer only)
router.put('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.farmer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to update this product' });
        }

        // Exclude productName and farmer from being updated
        const { productName, farmer, ...updateData } = req.body;

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        res.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product listing (farmer only)
// @access  Private (Farmer only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.farmer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to delete this product' });
        }

        await product.deleteOne();

        res.json({ message: 'Product removed' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/products/marketplace
// @desc    Get all verified products for the customer marketplace
// @access  Public (or protected depending on auth rule, keeping simple public for now)
router.get('/marketplace', async (req, res) => {
    try {
        // Fetch only verified products and populate farmer info if needed
        const products = await Product.find({ verificationStatus: 'verified' })
            .populate('farmer', 'name email phone')
            .sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        console.error('Error fetching marketplace products:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
