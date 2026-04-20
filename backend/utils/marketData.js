const fs = require('fs');
const path = require('path');

const RESOURCE_IDS = [
    "9ef84268-d588-465a-a308-a864a43d0070",
    "bc349275-c089-4a4b-9e4f-2287f3ca6c1e",
    "59efd61d-197e-4512-9741-99630c7c05fa",
    "04924855-5f56-42bb-a320-94944d189104"
];

const CACHE_FILE = path.join(__dirname, '../data/last-market-prices.json');
const CACHE_TTL = 15 * 60 * 1000; // Consistent 15-minute TTL

// Memory cache keyed by commodity name (e.g., 'TOMATO', 'ALL')
const memoryCache = new Map();

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

    const searchKey = commodity ? commodity.trim().toUpperCase() : "ALL";
    const now = Date.now();

    // 1. Check Memory Cache
    if (memoryCache.has(searchKey)) {
        const cached = memoryCache.get(searchKey);
        if (now - cached.timestamp < CACHE_TTL) {
            console.log(`[Market] Returning data from memory cache for: ${searchKey}`);
            return cached.data;
        }
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

            console.log(`[Market] Trying resource: ${id} for ${searchKey}`);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.status === 429) {
                console.error("[Market] API quota exceeded (429).");
                break; // Stop trying if quota is hit
            }

            if (!response.ok) {
                console.warn(`[Market] Resource ${id} failed with status ${response.status}.`);
                continue;
            }

            // Safe JSON parsing
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (pErr) {
                console.warn(`[Market] Resource ${id} returned invalid JSON.`);
                continue;
            }

            // Detect error message in JSON
            if (data.status === 'error' || data.message === "Meta not found") {
                console.warn(`[Market] Resource ${id} reporting error: ${data.message || 'Unknown'}`);
                continue;
            }

            if (data && data.records && data.records.length > 0) {
                console.log(`[Market] Success using resource: ${id} for ${searchKey}`);
                
                // Update Cache
                const cacheValue = { data, timestamp: now };
                memoryCache.set(searchKey, cacheValue);
                
                // Persist 'ALL' and specific lookups to disk to ensure fallback availability
                try {
                    if (!fs.existsSync(path.dirname(CACHE_FILE))) {
                        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
                    }
                    // For disk fallback, we usually want a representative sample, 'ALL' is best
                    if (searchKey === "ALL") {
                        fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheValue, null, 2));
                    }
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

    console.error(`[Market] All resources failed for ${searchKey}.`);
    
    // 2. Load from disk if available (only for ALL or as a general fallback)
    try {
        if (fs.existsSync(CACHE_FILE)) {
            console.log("[Market] Serving last known data from local disk fallback.");
            const savedCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            // If the commodity is specific, we might still return 'ALL' data if nothing else found
            // or we return the cached response if it happens to be 'ALL'
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

