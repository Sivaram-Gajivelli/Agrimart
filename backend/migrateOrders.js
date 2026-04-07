const mongoose = require('mongoose');
const Order = require('./models/orderModel');
require('dotenv').config();

const cleanLegacyDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/agrimart', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log("Connected to DB, performing migration...");

        // 1. Move old pre-QC states to "Processing"
        const result1 = await Order.updateMany(
            { trackingStatus: { $in: ['Farmer Packed', 'Ready for Pickup', 'Picked Up', 'Delivered to Hub'] } },
            { $set: { trackingStatus: 'Processing' } }
        );
        console.log(`Moved ${result1.modifiedCount} legacy pre-hub orders to Processing.`);

        // 2. Identify orders whose products are fully verified and ensure they are at least 'Quality Checked'
        const orders = await Order.find({ trackingStatus: { $in: ['Processing', 'Order Placed'] } })
            .populate('items.product', 'verificationStatus');
        
        let advancedCount = 0;
        for (const order of orders) {
            const isFullyVerified = order.items.every(it => 
                it.product && it.product.verificationStatus === 'verified'
            );
            
            if (isFullyVerified && order.items.length > 0) {
                order.trackingStatus = 'Quality Checked';
                await order.save();
                advancedCount++;
            }
        }
        
        console.log(`Advanced ${advancedCount} fully verified orders to Quality Checked.`);

        console.log("Migration complete.");
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

cleanLegacyDB();
