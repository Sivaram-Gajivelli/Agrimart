const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    pricePerKg: {
        type: Number,
        required: true
    },
    quantityAvailable: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['kg', 'quintal', 'ton', 'pieces'],
        default: 'kg'
    },
    locationType: {
        type: String,
        enum: ['manual', 'current'],
        default: 'manual'
    },
    manualLocation: {
        type: String,
        required: true
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'quality assessment', 'verified', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
