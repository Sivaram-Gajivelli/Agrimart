const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await mongoose.connection.db.collection('products').updateMany(
            { verificationStatus: { $exists: false } },
            { $set: { verificationStatus: 'pending' } }
        );
        console.log(`Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
migrate();
