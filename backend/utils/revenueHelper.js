const User = require('../models/userModel');

/**
 * Updates farmers' revenue when an order is delivered.
 * @param {Object} order - The order document
 */
const updateFarmersRevenue = async (order) => {
    try {
        if (!order || !order.items || order.items.length === 0) return;

        // Group item totals by farmer to perform atomic updates
        const farmerEarnings = {};
        for (const item of order.items) {
            const farmerId = item.farmer.toString();
            farmerEarnings[farmerId] = (farmerEarnings[farmerId] || 0) + item.itemTotal;
        }

        const updatePromises = Object.entries(farmerEarnings).map(([farmerId, amount]) => {
            // High-precision rounding to 2 decimal places to avoid floating point drift
            const roundedAmount = Math.round(amount * 100) / 100;
            return User.findByIdAndUpdate(
                farmerId,
                { $inc: { revenue: roundedAmount } },
                { new: true }
            );
        });

        await Promise.all(updatePromises);
        console.log(`Revenue updated for farmers in order: ${order._id}`);
    } catch (error) {
        console.error('Error updating farmers revenue:', error);
    }
};

module.exports = { updateFarmersRevenue };
