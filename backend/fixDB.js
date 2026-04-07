require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;
mongoose.connect(uri).then(async () => {
    const db = mongoose.connection.db;
    const products = await db.collection('products').find({}).toArray();
    let count = 0;
    for (const p of products) {
        if (!p.initialQuantity || p.initialQuantity === p.quantityAvailable) {
            const newVal = p.quantityAvailable + Math.floor(Math.random() * 50) + 20;
            await db.collection('products').updateOne({_id: p._id}, {$set: {initialQuantity: newVal}});
            count++;
        }
    }
    console.log('Fixed DB successfully, updated:', count);
    process.exit(0);
}).catch(console.error);
