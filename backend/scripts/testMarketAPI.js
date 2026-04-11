require('dotenv').config({ path: './.env' });
const { fetchMarketData } = require('../utils/marketData');

async function runTest() {
    console.log("--- Testing Market Data Utility ---");
    
    // Test 1: Specific commodity (Tomato)
    console.log("\n[Test 1] Fetching Tomato prices...");
    const tomatoData = await fetchMarketData('Tomato', 5);
    if (tomatoData) {
        console.log(`[Test 1] Received ${tomatoData.records.length} records.`);
    } else {
        console.log("[Test 1] Failed to receive data.");
    }

    // Test 2: General fetch (no commodity)
    console.log("\n[Test 2] Fetching general market data...");
    const generalData = await fetchMarketData('', 10);
    if (generalData) {
        console.log(`[Test 2] Received ${generalData.records.length} records.`);
    } else {
        console.log("[Test 2] Failed to receive data.");
    }

    console.log("\n--- Test Complete ---");
}

runTest();
