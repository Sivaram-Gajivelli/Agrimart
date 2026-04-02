const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    deliveryPricePerKm: { type: Number, default: 5 },
    minDeliveryFee: { type: Number, default: 20 },
    maxDeliveryFee: { type: Number, default: 150 },
    commissionPercentage: { type: Number, default: 10 },
    minProductPrice: { type: Number, default: 10 },
    hubRadius: { type: Number, default: 50 },
    maintenanceMode: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);
