const https = require('https');

const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ4NmIzNzMzZmRkNzQ4M2Y4MTZhNDlmZWFmMDkwYzMyIiwiaCI6Im11cm11cjY0In0=";
const hubs = [
    "Visakhapatnam, Andhra Pradesh",
    "Vizianagaram, Andhra Pradesh",
    "Rajahmundry, Andhra Pradesh",
    "Kakinada, Andhra Pradesh",
    "Vijayawada, Andhra Pradesh",
    "Guntur, Andhra Pradesh",
    "Nellore, Andhra Pradesh",
    "Tirupati, Andhra Pradesh",
    "Kurnool, Andhra Pradesh",
    "Kadapa, Andhra Pradesh",
    "Anantapur, Andhra Pradesh"
];

const fetchJson = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
};

async function getHubs() {
    const results = [];
    for (const hub of hubs) {
        const url = `https://api.openrouteservice.org/geocode/search?api_key=${API_KEY}&text=${encodeURIComponent(hub)}`;
        const data = await fetchJson(url);
        if (data && data.features && data.features.length > 0) {
            results.push({
                name: hub.split(',')[0],
                coordinates: data.features[0].geometry.coordinates // [lng, lat]
            });
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log(JSON.stringify(results, null, 2));
}

getHubs();
