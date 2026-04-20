const express = require("express");
const router = express.Router();
const { translate } = require('@vitalets/google-translate-api');
const { fetchMarketData } = require('../utils/marketData');

// 1. Translation Endpoint
router.get("/translate", async (req, res) => {
    try {
        const { text } = req.query;
        if (!text) return res.status(400).json({ error: "Text is required" });

        console.log(`[Market] Translating via endpoint: ${text}`);
        
        // Add a safety timeout for the translation service
        const translationPromise = translate(text, { to: 'en', from: 'auto', client: 'gtx' });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Translation timeout')), 5000));
        
        const result = await Promise.race([translationPromise, timeoutPromise]);
        
        let translated = (result && result.text) ? result.text : text;
        console.log(`[Market] Translation Result: "${text}" -> "${translated}"`);

        // Apply watermelon normalization to the translated name for consistency
        const clean = (translated || '').trim().toLowerCase().replace(/\s+/g, '');
        if (clean === 'watermelon' || clean === 'water-melon') {
            translated = 'Water Melon';
        }

        res.json({ 
            original: text, 
            translated: translated,
            from: (result && result.from && result.from.language) ? result.from.language.iso : 'unknown'
        });
    } catch (error) {
        console.error("Translation Endpoint Error:", error.message);
        res.status(500).json({ error: "Translation failed or timed out" });
    }
});

router.get("/prices", async (req, res) => {
    try {
        const { commodity, limit } = req.query;
        const resultLimit = parseInt(limit) || 50;
        const apiKey = process.env.GOVT_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server API Key is missing" });
        }

        let searchCommodity = (commodity || '').toString().trim();

        // 1. Translate if commodity is provided and likely non-English
        if (searchCommodity) {
            const isEnglish = /^[A-Za-z\s&]+$/.test(searchCommodity);
            if (!isEnglish) {
                try {
                    const translationPromise = translate(searchCommodity, { to: 'en', from: 'auto', client: 'gtx' });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
                    const translationResult = await Promise.race([translationPromise, timeoutPromise]);
                    
                    if (translationResult && translationResult.text && translationResult.text.toLowerCase() !== searchCommodity.toLowerCase()) {
                        searchCommodity = translationResult.text;
                    }
                } catch (transErr) {
                    console.error("[Market] Translation skipped or failed during price fetch:", transErr.message);
                }
            }
        }

        // 2. Normalize commodity naming for Agmarknet API
        if (searchCommodity) {
            searchCommodity = searchCommodity.trim().toLowerCase();
            
            // Normalize plurals (e.g., Tomatoes -> Tomato)
            if (searchCommodity.endsWith('atoes')) {
                searchCommodity = searchCommodity.slice(0, -2);
            } else if (searchCommodity.endsWith('oes') && !searchCommodity.endsWith('shoes')) {
                searchCommodity = searchCommodity.slice(0, -2);
            } else if (searchCommodity.endsWith('ies')) {
                searchCommodity = searchCommodity.slice(0, -3) + 'y';
            } else if (searchCommodity.endsWith('s') && !searchCommodity.endsWith('ss')) {
                searchCommodity = searchCommodity.slice(0, -1);
            }

            // Unify watermelon variations
            if (searchCommodity.replace(/\s+/g, '') === 'watermelon' || searchCommodity === 'water-melon') {
                searchCommodity = 'Water Melon';
            } else {
                // Capitalize for external API matching reliability
                searchCommodity = searchCommodity.toUpperCase();
            }
        }

        // console.log(`[Market] Requesting price for: ${searchCommodity || 'All'} (Limit: ${resultLimit})`);
        const data = await fetchMarketData(searchCommodity, resultLimit);

        if (!data) {
            console.error(`[Market] All resources failed for: ${searchCommodity || 'All'}`);
            return res.status(503).json({ 
                error: "External market service is currently unavailable.",
                status: "error"
            });
        }
        
        // Ensure translatedCommodity is attached for frontend consistency
        data.translatedCommodity = searchCommodity || "";

        res.json(data);
    } catch (error) {
        console.error("[Market API] Error fetching market prices:", error.message, error.stack);
        res.status(500).json({ error: "Internal server error while fetching prices.", details: error.message });
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

