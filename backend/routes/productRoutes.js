const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const auth = require('../middleware/authMiddleware');
const { translate } = require('@vitalets/google-translate-api');

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

// @route   GET /api/products/search
// @desc    Search products with auto-translation to English
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json([]);
        }

        let englishQuery = q;
        try {
            const translation = await translate(q, { to: 'en' });
            englishQuery = translation.text;
            console.log(`Translated "${q}" -> "${englishQuery}"`);
        } catch (err) {
            console.error('Translation error:', err);
        }

        const keywords = new RegExp(englishQuery, 'i');

        const products = await Product.find({
            $and: [
                {
                    $or: [
                        { productName: keywords },
                        { description: keywords },
                        { category: keywords }
                    ]
                },
                {
                    $or: [
                        { verificationStatus: { $in: ['verified', 'pending', 'quality assessment'] } },
                        { verificationStatus: { $exists: false } },
                        { verificationStatus: null }
                    ]
                }
            ]
        })
        .populate('farmer', 'name email phone')
        .sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/products/marketplace
// @desc    Get all verified products for the customer marketplace
// @access  Public (or protected depending on auth rule, keeping simple public for now)
router.get('/marketplace', async (req, res) => {
    try {
        // Fetch products that are verified, pending, or in quality assessment for development visibility
        const products = await Product.find({ 
            $or: [
                { verificationStatus: { $in: ['verified', 'pending', 'quality assessment'] } },
                { verificationStatus: { $exists: false } },
                { verificationStatus: null }
            ]
        })
            .populate('farmer', 'name email phone')
            .sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        console.error('Error fetching marketplace products:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product details
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('farmer', 'name email phone');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.error('Error fetching product details:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/products/:id/reviews
// @desc    Create new review
// @access  Private
router.post('/:id/reviews', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const alreadyReviewed = product.reviews.find(
            (r) => r.user.toString() === req.user.id.toString()
        );

        if (alreadyReviewed) {
            return res.status(400).json({ message: 'Product already reviewed' });
        }

        const review = {
            name: req.user.name,
            rating: Number(rating),
            comment,
            user: req.user.id,
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

        await product.save();
        res.status(201).json({ message: 'Review added' });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
