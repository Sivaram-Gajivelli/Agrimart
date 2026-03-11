const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    trackingStatus: {
        type: String,
        enum: ['Order Placed', 'Processing', 'Quality Checked', 'Packed', 'Ready for Pickup', 'Completed', 'Cancelled'],
        default: 'Order Placed'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
