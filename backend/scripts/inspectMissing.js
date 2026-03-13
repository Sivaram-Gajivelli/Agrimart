const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const scan = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const products = await mongoose.connection.db.collection('products').find({}).toArray();
        console.log("Total Products in 'products' collection:", products.length);
        products.forEach(p => {
            console.log(`- ${p.productName} | Status: ${p.verificationStatus} | Category: ${p.category} | ID: ${p._id}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
scan();
