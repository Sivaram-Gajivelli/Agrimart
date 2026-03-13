const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const User = require('../models/userModel');
const Product = require('../models/productModel');

const farmers = [
    {
        name: 'Ramesh Rao',
        email: 'ramesh@agrimart.com',
        phone: '9848012345',
        location: 'Guntur, Andhra Pradesh',
        products: [
            { productName: 'Fresh Mangoes (Banganapalli)', category: 'Fruits', pricePerKg: 120, quantity: 500, description: 'Premium quality Banganapalli mangoes directly from Guntur orchards.' },
            { productName: 'Red Chillies', category: 'Vegetables', pricePerKg: 180, quantity: 200, description: 'Hot and fresh red chillies from Guntur market.' },
            { productName: 'Sona Masuri Rice', category: 'Grains & Pulses', pricePerKg: 60, quantity: 1000, description: 'Superfine Sona Masuri rice, aged for 12 months.' }
        ]
    },
    {
        name: 'Suresh Kumar',
        email: 'suresh@agrimart.com',
        phone: '9848054321',
        location: 'Nellore, Andhra Pradesh',
        products: [
            { productName: 'Premium Rice', category: 'Grains & Pulses', pricePerKg: 65, quantity: 800, description: 'High-quality Nellore rice, locally grown and processed.' },
            { productName: 'Sweet Watermelons', category: 'Fruits', pricePerKg: 30, quantity: 300, description: 'Fresh and sweet watermelons, perfect for summer.' },
            { productName: 'Fresh Mangoes', category: 'Fruits', pricePerKg: 100, quantity: 400, description: 'Naturally ripened mangoes with great taste.' }
        ]
    },
    {
        name: 'Venkatesh Reddy',
        email: 'venkatesh@agrimart.com',
        phone: '9848099887',
        location: 'Kurnool, Andhra Pradesh',
        products: [
            { productName: 'Onions', category: 'Vegetables', pricePerKg: 40, quantity: 1500, description: 'Freshly harvested Kurnool onions.' },
            { productName: 'Tomatoes', category: 'Vegetables', pricePerKg: 35, quantity: 600, description: 'Organic farm-fresh tomatoes.' },
            { productName: 'Organic Chillies', category: 'Vegetables', pricePerKg: 190, quantity: 150, description: 'Pesticide-free organic chillies.' }
        ]
    },
    {
        name: 'Lakshmi Narayana',
        email: 'lakshmi@agrimart.com',
        phone: '9848011223',
        location: 'Visakhapatnam, Andhra Pradesh',
        products: [
            { productName: 'Green Chillies', category: 'Vegetables', pricePerKg: 50, quantity: 300, description: 'Fresh green chillies from the foothills of Vizag.' },
            { productName: 'Ripe Mangoes (Totapuri)', category: 'Fruits', pricePerKg: 80, quantity: 700, description: 'Large and juicy Totapuri mangoes.' },
            { productName: 'Black Gram', category: 'Grains & Pulses', pricePerKg: 110, quantity: 250, description: 'Protein-rich high quality black gram.' }
        ]
    },
    {
        name: 'Anjali Devi',
        email: 'anjali@agrimart.com',
        phone: '9848088776',
        location: 'Vijayawada, Andhra Pradesh',
        products: [
            { productName: 'Potatoes', category: 'Vegetables', pricePerKg: 25, quantity: 1200, description: 'Good quality potatoes suitable for all dishes.' },
            { productName: 'Sona Masuri Rice', category: 'Grains & Pulses', pricePerKg: 58, quantity: 1500, description: 'Freshly milled Sona Masuri rice from Krishna delta.' },
            { productName: 'Sweet Mangoes', category: 'Fruits', pricePerKg: 110, quantity: 600, description: 'Variety of sweet mangoes from local farms.' }
        ]
    }
];

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        for (const farmerData of farmers) {
            // Check if farmer already exists
            let farmer = await User.findOne({ email: farmerData.email });
            
            if (!farmer) {
                farmer = new User({
                    name: farmerData.name,
                    email: farmerData.email,
                    phone: farmerData.phone,
                    password: hashedPassword,
                    role: 'farmer',
                    isVerified: true,
                    isMobileVerified: true
                });
                await farmer.save();
                console.log(`Created farmer: ${farmer.name}`);
            } else {
                console.log(`Farmer already exists: ${farmer.name}`);
            }

            // Add products for each farmer
            for (const prod of farmerData.products) {
                const newProduct = new Product({
                    farmer: farmer._id,
                    productName: prod.productName,
                    category: prod.category,
                    description: prod.description,
                    pricePerKg: prod.pricePerKg,
                    quantityAvailable: prod.quantity,
                    unit: 'kg',
                    locationType: 'manual',
                    manualLocation: farmerData.location,
                    verificationStatus: 'verified'
                });
                await newProduct.save();
                console.log(`Added product: ${prod.productName} for ${farmer.name}`);
            }
        }

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
