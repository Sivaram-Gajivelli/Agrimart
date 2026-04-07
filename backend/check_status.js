const mongoose = require('mongoose');
const Order = require('./models/orderModel');
const Product = require('./models/productModel');
require('dotenv').config();

const checkOrder = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("DB Connected");
        
        // Find order by its ID suffix from the screenshot (EFFFC3DD)
        const order = await Order.findOne({ _id: { $regex: /efffc3dd$/i } })
            .populate('items.product');

        if (!order) {
            console.log("Order not found");
        } else {
            console.log(`Order status: ${order.trackingStatus}`);
            order.items.forEach((it, idx) => {
                console.log(`Item ${idx}: ${it.product?.productName} - Verification: ${it.product?.verificationStatus}`);
            });
            
            // Check if it should be Quality Checked
            const allVerified = order.items.every(it => it.product && it.product.verificationStatus === 'verified');
            console.log("All items verified:", allVerified);
            
            if (allVerified && order.trackingStatus !== 'Quality Checked') {
                console.log("AUTO-FIXING ORDER STATUS...");
                order.trackingStatus = 'Quality Checked';
                await order.save();
                console.log("Fixed!");
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkOrder();
