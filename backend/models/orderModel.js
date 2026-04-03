const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        farmer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        pricePerKg: {
            type: Number,
            required: true
        },
        itemTotal: {
            type: Number,
            required: true
        }
    }],
    deliveryFee: {
        type: Number,
        required: true,
        default: 0
    },
    platformFee: {
        type: Number,
        required: true,
        default: 0
    },
    subtotal: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    trackingStatus: {
        type: String,
        enum: ['Order Placed', 'Processing', 'Quality Checked', 'Packed', 'Ready for Pickup', 'Completed', 'Cancelled'],
        default: 'Order Placed'
    },
    deliveryAddress: {
        type: String,
        required: true
    },
    cancellationReason: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
