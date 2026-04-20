const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/userModel');

async function reset() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);
        
        await User.findOneAndUpdate(
            { email: 'spmproject66@gmail.com' },
            { password: hashedPassword }
        );
        console.log("Password reset to 123456 for spmproject66@gmail.com");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
reset();
