const axios = require('axios');

async function testMarketplace() {
    try {
        console.log("Testing /api/products/marketplace...");
        const res = await axios.get('http://localhost:5000/api/products/marketplace?lat=17.68&lng=83.21');
        console.log("Success! Received", res.data.length, "products.");
    } catch (err) {
        console.error("Error Status:", err.response?.status);
        console.error("Error Message:", err.response?.data?.message || err.message);
        console.error("Error Details:", err.response?.data?.details || "No details provided.");
    }
}

testMarketplace();
