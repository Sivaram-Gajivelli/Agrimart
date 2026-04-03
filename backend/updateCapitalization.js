const mongoose = require('mongoose');
const Product = require('./models/productModel');

const MONGO_URI = "mongodb+srv://sivaramgajivelli_db_user:sivayaju2021@cluster0.asrtk2b.mongodb.net/agrimart?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI).then(async () => {
    console.log('Connected to DB. Updating product names to be capitalized...');
    const products = await Product.find({});
    let count = 0;
    for (let product of products) {
        if (product.productName) {
            const original = product.productName;
            product.productName = product.productName.charAt(0).toUpperCase() + product.productName.slice(1);
            if(original !== product.productName) {
               console.log(`Updating ${original} -> ${product.productName}`);
               // Use updateOne to bypass strict validation issues if there are any old bad records
               await Product.updateOne({ _id: product._id }, { $set: { productName: product.productName } });
               count++;
            }
        }
    }
    console.log(`Successfully capitalized ${count} products.`);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
