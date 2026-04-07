const http = require('http');

async function testTranslation() {
    const testCases = ["టమాటా", "ఆపిల్", "watermelon", "water melon"];
    
    for (const item of testCases) {
        console.log(`Testing: ${item}`);
        await new Promise((resolve) => {
            http.get(`http://localhost:3001/api/market/prices?commodity=${encodeURIComponent(item)}`, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const json = JSON.parse(data);
                        console.log(`Status: ${res.statusCode}`);
                        console.log(`Translated To: ${json.translatedCommodity}`);
                        console.log(`Records: ${json.records ? json.records.length : 0}`);
                    } else {
                        console.log(`Error: ${res.statusCode} - ${data}`);
                    }
                    resolve();
                });
            }).on('error', (err) => {
                console.log(`Request Error: ${err.message}`);
                resolve();
            });
        });
        console.log('---');
    }
}

testTranslation();
