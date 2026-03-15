const mongoose = require('mongoose');
const User = require('./models/userModel');
const dotenv = require('dotenv');

dotenv.config();

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Remove all users that have null or empty phone but are duplicates (if any)
        // Or better yet, just update them to unset the phone field if it's null/empty
        const result = await User.updateMany(
            { $or: [{ phone: null }, { phone: "" }] },
            { $unset: { phone: "" } }
        );
        console.log(`Updated ${result.modifiedCount} users to unset phone field`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanup();
