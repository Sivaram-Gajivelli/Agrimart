const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const Hub = require('../models/hubModel');

const HUBS = [
    { name: "Visakhapatnam", location: "Visakhapatnam, Andhra Pradesh", latitude: 17.686815, longitude: 83.218481, status: "active" },
    { name: "Vizianagaram",  location: "Vizianagaram, Andhra Pradesh",  latitude: 18.114757, longitude: 83.401490, status: "active" },
    { name: "Rajahmundry",   location: "Rajahmundry, Andhra Pradesh",   latitude: 17.000538, longitude: 81.804034, status: "active" },
    { name: "Kakinada",      location: "Kakinada, Andhra Pradesh",      latitude: 16.989100, longitude: 82.247500, status: "active" },
    { name: "Vijayawada",    location: "Vijayawada, Andhra Pradesh",    latitude: 16.506174, longitude: 80.648015, status: "active" },
    { name: "Guntur",        location: "Guntur, Andhra Pradesh",        latitude: 16.306652, longitude: 80.436540, status: "active" },
    { name: "Nellore",       location: "Nellore, Andhra Pradesh",       latitude: 14.442598, longitude: 79.986456, status: "active" },
    { name: "Tirupati",      location: "Tirupati, Andhra Pradesh",      latitude: 13.628755, longitude: 79.419179, status: "active" },
    { name: "Kurnool",       location: "Kurnool, Andhra Pradesh",       latitude: 15.828125, longitude: 78.037279, status: "active" },
    { name: "Kadapa",        location: "Kadapa, Andhra Pradesh",        latitude: 14.467377, longitude: 78.824167, status: "active" },
    { name: "Anantapur",     location: "Anantapur, Andhra Pradesh",     latitude: 14.681887, longitude: 77.600591, status: "active" },
];

async function seedHubs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // Clear existing hubs
        await Hub.deleteMany({});
        console.log('🗑️  Old hubs cleared');

        // Insert new hubs
        const inserted = await Hub.insertMany(HUBS);
        console.log(`✅ Inserted ${inserted.length} hubs successfully!`);
        inserted.forEach(h => console.log(`   - ${h.name} (${h.latitude}, ${h.longitude})`));
    } catch (err) {
        console.error('❌ Error seeding hubs:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
    }
}

seedHubs();
