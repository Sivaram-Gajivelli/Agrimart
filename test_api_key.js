// test_api_key.js
// This is a simple Node.js script to test the Government Mandi API key.
// Run this file using: node test_api_key.js

const API_KEY = '579b464db66ec23bdd0000010b20bb244f5c44356a56e0c0d8129ed0'; // Replace with your actual key if different
const COMMODITY = 'tomato';

async function testApiKey() {
    try {
        console.log(`Testing API Key for commodity: ${COMMODITY}...`);
        const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${API_KEY}&format=json&limit=1&filters[commodity]=${COMMODITY}`;

        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();
            console.log("✅ API Key is Valid!");
            console.log(`Successfully fetched ${data.records.length} record(s).`);
            if (data.records.length > 0) {
                console.log("Sample Data:", data.records[0]);
            }
        } else {
            console.error(`❌ API Request Failed. Status: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error("Error details:", errorText);
        }
    } catch (error) {
        console.error("❌ Network or Execution Error:", error.message);
    }
}

testApiKey();
