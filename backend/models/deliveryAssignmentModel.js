const mongoose = require('mongoose');

const deliveryAssignmentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
