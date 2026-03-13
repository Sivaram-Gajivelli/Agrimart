const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const scan = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const products = await mongoose.connection.db.collection('products').find({}).toArray();
        console.log(`FOUND_COUNT: ${products.length}`);
        products.forEach((p, i) => {
            console.log(`--- PRODUCT ${i} ---`);
            console.log(`NAME: ${p.productName}`);
            console.log(`STATUS: ${p.verificationStatus}`);
            console.log(`CATEGORY: ${p.category}`);
            console.log(`JSON: ${JSON.stringify(p)}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
scan();
