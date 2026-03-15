const express = require("express");
const router = express.Router();

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

router.get("/prices", async (req, res) => {
    try {
        const { commodity, limit } = req.query;
        const resultLimit = limit || 50;
        const apiKey = process.env.GOVT_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server API Key is missing" });
        }

        const cacheKey = `${commodity || 'all'}_${resultLimit}`;
        const cachedItem = cache.get(cacheKey);

        if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL)) {
            console.log(`[Cache] Serving ${cacheKey} from cache`);
            return res.json(cachedItem.data);
        }

        let apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=${resultLimit}`;
        
        if (commodity) {
             apiUrl += `&filters[commodity]=${encodeURIComponent(commodity)}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`External API returned status: ${response.status}`);
        }

        const data = await response.json();
        
        // Save to cache
        cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        res.json(data);
    } catch (error) {
        console.error("Error fetching market prices:", error);
        res.status(500).json({ error: "Failed to fetch market prices from external API." });
    }
});

router.get("/status", (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const statusFilePath = path.join(__dirname, '../data/last-update.json');
        
        if (fs.existsSync(statusFilePath)) {
            const data = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
            res.json(data);
        } else {
            res.json({ prices: null, predictions: null });
        }
    } catch (error) {
        console.error("Error fetching update status:", error);
        res.status(500).json({ error: "Failed to fetch update status." });
    }
});

module.exports = router;
