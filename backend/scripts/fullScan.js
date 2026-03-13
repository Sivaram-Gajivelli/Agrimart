const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const scan = async () => {
    try {
        const client = await mongoose.connect(process.env.MONGO_URI);
        const admin = client.connection.db.admin();
        const dbs = await admin.listDatabases();
        
        for (const dbInfo of dbs.databases) {
            console.log(`\n--- DB: ${dbInfo.name} ---`);
            const db = client.connection.useDb(dbInfo.name).db;
            const collections = await db.listCollections().toArray();
            for (const col of collections) {
                const count = await db.collection(col.name).countDocuments();
                console.log(`Collection: ${col.name} (${count} docs)`);
                if (col.name === 'products') {
                    const docs = await db.collection(col.name).find({}).toArray();
                    docs.forEach(d => console.log(`  Product: ${d.productName}, Status: ${d.verificationStatus}`));
                }
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
scan();
