const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('../models/productModel');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const updatePrices = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const apiKey = process.env.GOVT_API_KEY;
        if (!apiKey) {
            throw new Error("Server API Key (GOVT_API_KEY) is missing in .env");
        }

        console.log('Fetching products from database...');
        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);

        if (products.length === 0) {
            console.log('No products to update.');
            process.exit(0);
        }

        // To avoid spamming the API, we'll collect unique product names and fetch their prices
        let uniqueCommodities = [...new Set(products.map(p => p.productName.toLowerCase().trim()))];
        console.log(`Found ${uniqueCommodities.length} unique commodities to update.`);

        let updatedCount = 0;

        for (const dbCommodity of uniqueCommodities) {
            try {
                // Remove trailing 's' or 'es' for a better chance of matching the Govt API
                let searchCommodity = dbCommodity;
                if (searchCommodity.endsWith('oes')) {
                    searchCommodity = searchCommodity.slice(0, -2); // Tomatoes -> Tomato
                } else if (searchCommodity.endsWith('s') && !searchCommodity.endsWith('ss')) {
                    searchCommodity = searchCommodity.slice(0, -1); // Carrots -> Carrot
                }

                console.log(`Fetching market price for: ${searchCommodity} (from DB: ${dbCommodity})...`);
                const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=50&filters[commodity]=${encodeURIComponent(searchCommodity)}`;
                
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    console.error(`Failed to fetch API for ${searchCommodity}. Status: ${response.status}`);
                    continue; // Skip to next commodity
                }

                const data = await response.json();

                if (data.records && data.records.length > 0) {
                    // Try to calculate an average modal price
                    const validRecords = data.records.filter(r => r.modal_price && !isNaN(r.modal_price));
                    
                    if (validRecords.length > 0) {
                        const sum = validRecords.reduce((acc, curr) => acc + parseInt(curr.modal_price), 0);
                        let avgPricePerQuintal = sum / validRecords.length;
                        
                        // Convert quintal to kg (1 quintal = 100 kg)
                        let newPricePerKg = Math.round(avgPricePerQuintal / 100);
                        
                        // Ensure price isn't zero
                        if (newPricePerKg < 1) newPricePerKg = 1;

                        console.log(`  -> New calculated price for ${dbCommodity}: ₹${newPricePerKg}/kg`);

                        // Update all products with this EXACT original commodity name
                        const result = await Product.updateMany(
                            { productName: { $regex: new RegExp(`^${dbCommodity}$`, 'i') } },
                            { $set: { pricePerKg: newPricePerKg } }
                        );

                        console.log(`  -> Updated ${result.modifiedCount} products in the database.`);
                        updatedCount += result.modifiedCount;
                    } else {
                        console.log(`  -> No valid price data found for ${dbCommodity} in the API response.`);
                    }
                } else {
                    console.log(`  -> No records found in API for ${dbCommodity}. Price remains unchanged.`);
                }
                
                // Add a small delay to avoid hitting rate limits
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.error(`Error processing ${dbCommodity}:`, err.message);
            }
        }

        console.log('-----------------------------------');
        console.log(`Finished updating prices. Total products updated: ${updatedCount}`);
        
    } catch (error) {
        console.error('Initial Error:', error);
    } finally {
        console.log('Closing database connection...');
        await mongoose.connection.close();
        process.exit(0);
    }
};

updatePrices();
