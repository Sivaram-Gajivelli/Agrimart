const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Helper to normalize crop name to CSV vegetable names
const normalizeCrop = (crop) => {
    if (!crop) return null;
    const lower = crop.toLowerCase().trim();
    const mappings = {
        'tomato': 'tomatoes',
        'potato': 'potatoes',
        'onion': 'onions',
        'banana': 'bananas',
        'brinjal': 'brinjals',
        'cabbage': 'cabbages',
        'cauliflower': 'cauliflowers',
        'lemon': 'lemons',
        'mango': 'mangoes',
        'papaya': 'papayas',
        'rice': 'rice',
        'watermelon': 'water_melons',
        'water melon': 'water_melons',
        'chilli': 'green_chillis'
    };
    
    // Return direct mapping if exists
    if (mappings[lower]) return mappings[lower];
    
    // Handle pluralization if it contains any of the keys
    for (const key in mappings) {
        if (lower.includes(key)) return mappings[key];
    }
    
    return lower;
};

// @route   GET /api/predictions
// @desc    Get AI price predictions
// @access  Public
router.get('/', (req, res) => {
    const results = [];
    const csvFilePath = path.join(__dirname, '../../future_price_predictions.csv');

    if (!fs.existsSync(csvFilePath)) {
        return res.status(404).json({ error: 'Prediction data not found.' });
    }

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            res.json(results);
        })
        .on('error', (err) => {
            res.status(500).json({ error: 'Failed to read prediction data.' });
        });
});

// @route   POST /api/predictions
// @desc    Get prediction for a specific crop with live price integration
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { crop } = req.body;
        if (!crop) {
            return res.status(400).json({ error: 'Crop name is required.' });
        }

        const normalizedVeg = normalizeCrop(crop);
        const csvFilePath = path.join(__dirname, '../../future_price_predictions.csv');

        if (!fs.existsSync(csvFilePath)) {
            return res.status(500).json({ error: 'Prediction service is currently unavailable.' });
        }

        // 1. Fetch Live Price (Base Price)
        let basePrice = 40; // Default fallback
        try {
            const apiKey = process.env.GOVT_API_KEY;
            if (apiKey) {
                const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=10&filters[commodity]=${encodeURIComponent(crop.toUpperCase())}`;
                const apiRes = await fetch(apiUrl);
                const apiData = await apiRes.json();
                if (apiData.records && apiData.records.length > 0) {
                    const average = apiData.records.reduce((sum, record) => sum + (parseFloat(record.modal_price) / 100), 0) / apiData.records.length;
                    basePrice = Math.max(average, 1);
                }
            }
        } catch (apiErr) {
            console.error("Live price fetch failed:", apiErr.message);
        }

        // 2. Read Multpliers from CSV
        const predictions = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => {
                if (data.Vegetable.toLowerCase() === normalizedVeg) {
                    predictions.push(data);
                }
            })
            .on('end', () => {
                if (predictions.length === 0) {
                    return res.status(404).json({ error: `No prediction data available for ${crop}.` });
                }

                // Sort by date (assuming DD-MM-YYYY format in CSV)
                const sorted = predictions.sort((a, b) => {
                    const [d1, m1, y1] = a.Date.split('-').map(Number);
                    const [d2, m2, y2] = b.Date.split('-').map(Number);
                    return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
                });

                const next_7_days = [];
                let runningPrice = basePrice;
                let maxPrice = -1;
                let bestDayIdx = 0;

                for (let i = 0; i < Math.min(7, sorted.length); i++) {
                    const multiplier = parseFloat(sorted[i]['Predicted Multiplier']) || 1.0;
                    const predicted = runningPrice * multiplier;
                    next_7_days.push({
                        date: sorted[i].Date,
                        price: parseFloat(predicted.toFixed(2)),
                        multiplier: multiplier,
                        confidence: sorted[i].Confidence,
                        range_min: parseFloat((runningPrice * parseFloat(sorted[i]['Range Min Multiplier'])).toFixed(2)),
                        range_max: parseFloat((runningPrice * parseFloat(sorted[i]['Range Max Multiplier'])).toFixed(2))
                    });
                    
                    if (predicted > maxPrice) {
                        maxPrice = predicted;
                        bestDayIdx = i;
                    }
                    runningPrice = predicted;
                }

                const firstPrice = next_7_days[0].price;
                const lastPrice = next_7_days[next_7_days.length - 1].price;
                const trend = lastPrice > firstPrice ? "increasing" : (lastPrice < firstPrice ? "decreasing" : "stable");

                const dayLabels = ['Tomorrow', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

                res.json({
                    next_7_days: next_7_days,
                    trend: trend,
                    best_day_to_sell: dayLabels[bestDayIdx]
                });
            });

    } catch (error) {
        console.error("Prediction API Error:", error);
        res.status(500).json({ error: 'Prediction service is currently unavailable.' });
    }
});

module.exports = router;
