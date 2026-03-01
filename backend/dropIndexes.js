const mongoose = require('mongoose');

// Need to explicitly load dotenv if the .env file exists and dotenvx CLI isn't working
require('dotenv').config();

// Connect using the URI from .env or fallback to localhost
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/agrimart';

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('Connected to DB');

        try {
            await mongoose.connection.collection('usermodels').dropIndex('phone_1');
            console.log('Dropped phone_1 index');
        } catch (err) {
            console.log('Error dropping phone index (might not exist):', err.message);
        }

        try {
            await mongoose.connection.collection('usermodels').dropIndex('email_1');
            console.log('Dropped email_1 index');
        } catch (err) {
            console.log('Error dropping email index (might not exist):', err.message);
        }

        const resultPhone = await mongoose.connection.collection('usermodels').updateMany(
            { phone: null },
            { $unset: { phone: "" } }
        );
        console.log(`Unset null phones on ${resultPhone.modifiedCount} records`);

        const resultEmail = await mongoose.connection.collection('usermodels').updateMany(
            { email: null },
            { $unset: { email: "" } }
        );
        console.log(`Unset null emails on ${resultEmail.modifiedCount} records`);

        console.log('Database index cleanup complete.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
