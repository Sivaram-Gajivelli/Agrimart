const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const scan = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const products = await mongoose.connection.db.collection('products').find({}).toArray();
        console.log("RAW PRODUCTS JSON:");
        console.log(JSON.stringify(products, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
scan();
