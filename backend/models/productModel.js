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
    initialQuantity: {
        type: Number,
        required: false
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
    latitude: {
        type: Number,
        required: false
    },
    longitude: {
        type: Number,
        required: false
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'quality assessment', 'verified', 'rejected'],
        default: 'pending'
    },
    nearestHub: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hub',
        required: false
    },
    deliveryStatus: {
        type: String,
        enum: ["Listed", "Packed", "Ready for Pickup", "Picked Up", "At Hub", "Verified", "Completed"],
        default: "Listed"
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    rating: {
        type: Number,
        required: true,
        default: 0
    },
    numReviews: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

// Pre-save hook to automatically capitalize the first letter of the product name
productSchema.pre('save', function() {
    if (this.isModified('productName') && this.productName) {
        this.productName = this.productName.charAt(0).toUpperCase() + this.productName.slice(1);
    }
});

// Pre-updateOne/findOneAndUpdate hook for capitalization
productSchema.pre('findOneAndUpdate', function() {
    const update = this.getUpdate();
    if (update.$set && update.$set.productName) {
        update.$set.productName = update.$set.productName.charAt(0).toUpperCase() + update.$set.productName.slice(1);
    }
});

module.exports = mongoose.model('Product', productSchema, 'products');
