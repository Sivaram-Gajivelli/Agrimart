const express = require("express");
const router = express.Router();

const { translate } = require('@vitalets/google-translate-api');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// 1. Translation Endpoint
router.get("/translate", async (req, res) => {
    try {
        const { text } = req.query;
        if (!text) return res.status(400).json({ error: "Text is required" });

        console.log(`[Market] Translating via endpoint: ${text}`);
        const result = await translate(text, { to: 'en', from: 'auto', client: 'gtx' });
        console.log(`[Market] Translation Result: "${text}" -> "${result.text}"`);
        
        let translated = result.text;
        
        // Apply watermelon normalization to the translated name for consistency
        const clean = translated.trim().toLowerCase().replace(/\s+/g, '');
        if (clean === 'watermelon' || clean === 'water-melon') {
            translated = 'Watermelon';
        }

        res.json({ 
            original: text, 
            translated: translated,
            from: result.from.language.iso 
        });
    } catch (error) {
        console.error("Translation Endpoint Error:", error);
        res.status(500).json({ error: "Translation failed" });
    }
});

router.get("/prices", async (req, res) => {
    try {
        const { commodity, limit } = req.query;
        const resultLimit = limit || 50;
        const apiKey = process.env.GOVT_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server API Key is missing" });
        }

        let searchCommodity = (commodity || '').trim();

        // 1. Translate if commodity is provided
        if (searchCommodity) {
            try {
                // Use a more robust check and normalization
                const translationResult = await translate(searchCommodity, { to: 'en', from: 'auto', client: 'gtx' });
                if (translationResult.text && translationResult.text.toLowerCase() !== searchCommodity.toLowerCase()) {
                    searchCommodity = translationResult.text;
                }
            } catch (transErr) {
                console.error("[Market] Translation failed during price fetch:", transErr.message);
            }
        }

        // 2. Normalize commodity naming for Agmarknet API
        if (searchCommodity) {
            searchCommodity = searchCommodity.trim().toLowerCase();
            
            // Normalize plurals (e.g., Tomatoes -> TOMATO)
            if (searchCommodity.endsWith('atoes')) {
                searchCommodity = searchCommodity.slice(0, -2);
            } else if (searchCommodity.toLowerCase().endsWith('oes') && !searchCommodity.toLowerCase().endsWith('shoes')) {
                // Better plural handling for Tomatoes/Potatoes -> TOMATO/POTATO
                searchCommodity = searchCommodity.slice(0, -2);
                if (searchCommodity.toLowerCase().endsWith('e')) {
                    searchCommodity = searchCommodity.slice(0, -1);
                }
            } else if (searchCommodity.endsWith('ies')) {
                searchCommodity = searchCommodity.slice(0, -3) + 'y';
            } else if (searchCommodity.endsWith('s') && !searchCommodity.endsWith('ss')) {
                searchCommodity = searchCommodity.slice(0, -1);
            }

            // Unify watermelon variations
            if (searchCommodity.replace(/\s+/g, '') === 'watermelon' || searchCommodity === 'water-melon') {
                searchCommodity = 'WATER MELON';
            } else {
                // Capitalize for external API matching reliability
                searchCommodity = searchCommodity.toUpperCase();
            }
        }

        const cacheKey = `${searchCommodity || 'all'}_${resultLimit}`;
        const cachedItem = cache.get(cacheKey);

        if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL)) {
            // Ensure the cached data includes the translated name
            const data = cachedItem.data;
            if (!data.translatedCommodity) data.translatedCommodity = searchCommodity;
            return res.json(data);
        }

        let apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=${resultLimit}`;
        
        if (searchCommodity) {
             apiUrl += `&filters[commodity]=${encodeURIComponent(searchCommodity)}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`External API returned status: ${response.status}`);
        }

        const data = await response.json();
        
        // Attach the translated name used for the search
        data.translatedCommodity = searchCommodity;

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
