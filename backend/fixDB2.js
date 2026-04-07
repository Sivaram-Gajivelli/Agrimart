require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;
mongoose.connect(uri).then(async () => {
    const db = mongoose.connection.db;
    const products = await db.collection('products').find({}).toArray();
    let count = 0;
    for (const p of products) {
        // Reset ALL products to be 'full' natively (no random fake quantities)
        // If a real system sells stock, it lowers quantityAvailable, so initialQuantity sits higher.
        // For these dev products, we'll reset initialQuantity = quantityAvailable so they are 100%.
        if (p.initialQuantity && p.initialQuantity > p.quantityAvailable) {
            // Wait, if they were newly created, quantityAvailable === initialQuantity anyway.
            // If we generated fake data, this resets it back.
            await db.collection('products').updateOne({_id: p._id}, {$set: {initialQuantity: p.quantityAvailable}});
            count++;
        }
    }
    console.log('Reset DB successfully, updated:', count);
    process.exit(0);
}).catch(console.error);
