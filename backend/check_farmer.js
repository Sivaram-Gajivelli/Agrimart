const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/userModel');
const Product = require('./models/productModel');

dotenv.config();

async function checkFarmerProducts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const farmer = await User.findOne({ email: 'ramesh@agrimart.com' });
        if (!farmer) {
            console.log('Farmer Ramesh Rao not found');
        } else {
            console.log(`Farmer found: ${farmer.name}, ID: ${farmer._id}, Role: ${farmer.role}`);
            const products = await Product.find({ farmer: farmer._id });
            console.log(`Found ${products.length} products for Ramesh Rao`);
            products.forEach(p => console.log(` - ${p.productName} (${p.verificationStatus})`));
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkFarmerProducts();
