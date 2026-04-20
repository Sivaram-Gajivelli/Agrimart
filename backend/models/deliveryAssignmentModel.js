const mongoose = require('mongoose');

const deliveryAssignmentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false // Optional for stocking pickups
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false // Used for stocking/harvest pickups without an order
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['Pickup', 'Delivery'], // Pickup: Farmer to Hub, Delivery: Hub to Customer
        required: true
    },
    status: {
        type: String,
        enum: ['Assigned', 'Picked Up', 'Delivered'],
        default: 'Assigned'
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    // 🚀 NEW: Rating System
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: false
    },
    feedback: {
        type: String,
        required: false
    },
    ratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    // 💰 NEW: Financial Tracking
    distance: {
        type: Number, // In km
        default: 0
    },
    earnings: {
        type: Number, // In ₹
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
