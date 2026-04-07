const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/userModel');

async function seedAgent() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'delivery@agrimart.com';
        const existing = await User.findOne({ email });

        if (existing) {
            console.log('Agent delivery@agrimart.com already exists. Updating password...');
            const salt = await bcrypt.genSalt(10);
            existing.password = await bcrypt.hash('password123', salt);
            existing.role = 'delivery_partner';
            existing.status = 'active';
            existing.isOnline = true;
            await existing.save();
        } else {
            console.log('Creating agent delivery@agrimart.com...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            
            const agent = new User({
                name: 'Test Delivery Agent',
                email,
                phone: '9999988888',
                password: hashedPassword,
                role: 'delivery_partner',
                status: 'active',
                isOnline: true,
                isVerified: true
            });
            await agent.save();
        }

        console.log('Success: Agent seeded/updated.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedAgent();
