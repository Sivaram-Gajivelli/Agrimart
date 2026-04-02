const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Product = require("../models/productModel");

const cleanupReviews = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for cleanup");

        const unprofessionalKeywords = ["I hate", "unprofessional", "fake", "bad quality"]; // Minimal list for now
        
        const products = await Product.find({ "reviews.comment": { $in: unprofessionalKeywords.map(k => new RegExp(k, 'i')) } });

        console.log(`Found ${products.length} products with potentially unprofessional reviews.`);

        for (let product of products) {
            const originalCount = product.reviews.length;
            product.reviews = product.reviews.filter(review => {
                const isUnprofessional = unprofessionalKeywords.some(keyword => 
                    review.comment.toLowerCase().includes(keyword.toLowerCase()) ||
                    review.name.toLowerCase().includes(keyword.toLowerCase())
                );
                return !isUnprofessional;
            });

            if (product.reviews.length !== originalCount) {
                console.log(`Cleaning up reviews for product: ${product.productName}`);
                product.numReviews = product.reviews.length;
                product.rating = product.reviews.length > 0 
                    ? product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length 
                    : 0;
                await product.save();
            }
        }

        console.log("Cleanup complete!");
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
};

cleanupReviews();
