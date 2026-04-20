const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/userModel');
const Hub = require('../models/hubModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const DeliveryAssignment = require('../models/deliveryAssignmentModel');
const { getDistance } = require('../utils/distanceHelper');

async function backfill() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        const assignments = await DeliveryAssignment.find()
            .populate("agent")
            .populate({
                path: "order",
                populate: [
                    { path: "buyer", select: "latitude longitude name" },
                    { path: "items.farmer", select: "latitude longitude name" }
                ]
            })
            .populate({
                path: "product",
                populate: [{ path: "farmer", select: "latitude longitude name" }]
            });

        const hubs = await Hub.find();
        let totalUpdated = 0;

        console.log(`Analyzing ${assignments.length} assignments...`);

        for (const asng of assignments) {
            if (asng.status !== 'Delivered') continue;

            let startLat, startLng, endLat, endLng;
            let fallbackDist = 3.5; // Default 3.5km fallback

            if (asng.type === 'Pickup') {
                const farmer = asng.order ? asng.order.items?.[0]?.farmer : asng.product?.farmer;
                const targetHub = hubs.find(h => h._id.toString() === asng.agent?.assignedHub?.toString()) || hubs[0];
                
                if (farmer?.latitude && farmer?.longitude && targetHub) {
                    startLat = farmer.latitude; startLng = farmer.longitude;
                    endLat = targetHub.latitude; endLng = targetHub.longitude;
                }
            } else {
                const targetHub = hubs.find(h => h._id.toString() === asng.agent?.assignedHub?.toString()) || hubs[0];
                const buyer = asng.order?.buyer;
                
                if (targetHub && buyer?.latitude && buyer?.longitude) {
                    startLat = targetHub.latitude; startLng = targetHub.longitude;
                    endLat = buyer.latitude; endLng = buyer.longitude;
                }
            }

            let dist = fallbackDist;
            if (startLat && startLng && endLat && endLng) {
                dist = getDistance(startLat, startLng, endLat, endLng);
            }

            // Formula: ₹15 Base + ₹5/km
            const earnings = 15 + (dist * 5);

            asng.distance = Number(dist.toFixed(2));
            asng.earnings = Number(earnings.toFixed(2));
            if (!asng.completedAt) asng.completedAt = asng.updatedAt || new Date();
            
            await asng.save();
            totalUpdated++;
        }

        console.log(`Updated earnings for ${totalUpdated} delivered assignments.`);

        // Sync agent balances
        const agents = await User.find({ role: 'delivery_partner' });
        for (const agent of agents) {
            const delivered = await DeliveryAssignment.find({ agent: agent._id, status: 'Delivered' });
            const totalRevenue = delivered.reduce((sum, a) => sum + (a.earnings || 0), 0);
            agent.revenue = Number(totalRevenue.toFixed(2));
            await agent.save();
            console.log(`Synced Agent: ${agent.name} | Total Revenue: ₹${agent.revenue}`);
        }

        console.log("Backfill operation successful.");
        process.exit(0);
    } catch (err) {
        console.error("Backfill failed:", err);
        process.exit(1);
    }
}

backfill();
