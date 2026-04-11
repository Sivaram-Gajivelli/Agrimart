const fs = require('fs');
const path = require('path');

const RESOURCE_IDS = [
    "9ef84268-d588-465a-a308-a864a43d0070",
    "bc349275-c089-4a4b-9e4f-2287f3ca6c1e",
    "59efd61d-197e-4512-9741-99630c7c05fa",
    "04924855-5f56-42bb-a320-94944d189104"
];

const CACHE_FILE = path.join(__dirname, '../data/last-market-prices.json');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let memoryCache = {
    data: null,
    timestamp: 0
};

/**
 * Robustly fetch market data from data.gov.in using multiple resource IDs as fallbacks.
 * @param {string} commodity - Optional commodity filter.
 * @param {number} limit - Result limit.
 * @returns {Promise<object|null>} - Returns the API response object or null if all resources fail.
 */
async function fetchMarketData(commodity = '', limit = 10) {
    const apiKey = process.env.GOVT_API_KEY;
    if (!apiKey) {
        console.error("[Market] GOVT_API_KEY is missing.");
        return null;
    }

    // 1. Check Memory Cache
    const now = Date.now();
    if (memoryCache.data && (now - memoryCache.timestamp < CACHE_TTL)) {
        console.log("[Market] Returning data from memory cache.");
        return memoryCache.data;
    }

    const searchCommodity = commodity ? commodity.trim().toUpperCase() : "";

    for (const id of RESOURCE_IDS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

        try {
            let url = `https://api.data.gov.in/resource/${id}?api-key=${apiKey}&format=json&limit=${limit}`;
            if (searchCommodity) {
                url += `&filters[commodity]=${encodeURIComponent(searchCommodity)}`;
            }

            console.log(`[Market] Trying resource: ${id}`);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.status === 429) {
                console.error("[Market] API quota exceeded (429).");
                break; // Stop trying if quota is hit
            }

            if (response.status === 503) {
                console.warn(`[Market] Resource ${id} is unavailable (503). Retrying next...`);
                continue;
            }

            if (!response.ok) {
                console.warn(`[Market] Resource ${id} failed with status ${response.status}.`);
                continue;
            }

            const data = await response.json();

            // Detect Meta not found error within JSON
            if (data.status === 'error' || data.message === "Meta not found") {
                console.warn(`[Market] Invalid resource (Meta not found): ${id}`);
                continue;
            }

            if (data && data.records && data.records.length > 0) {
                console.log(`[Market] Success using resource: ${id}`);
                
                // Update Cache
                memoryCache = { data, timestamp: now };
                
                // Persist to disk as "last known"
                try {
                    if (!fs.existsSync(path.dirname(CACHE_FILE))) {
                        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
                    }
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2));
                } catch (e) {
                    console.error("[Market] Failed to save local cache file:", e.message);
                }

                return data;
            }

        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                console.warn(`[Market] Timeout on resource: ${id}`);
            } else {
                console.error(`[Market] Fetch error using ${id}:`, err.message);
            }
            continue;
        }
    }

    console.error("[Market] All resources failed.");
    
    // 2. Load from disk if available
    try {
        if (fs.existsSync(CACHE_FILE)) {
            console.log("[Market] Serving last known data from local disk fallback.");
            const savedCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            return savedCache.data;
        }
    } catch (e) {
        console.error("[Market] Failed to read disk fallback:", e.message);
    }

    return null;
}

module.exports = {
    fetchMarketData,
    RESOURCE_IDS
};
