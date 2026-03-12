const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// @route   GET /api/predictions
// @desc    Get AI price predictions
// @access  Public
router.get('/', (req, res) => {
    const results = [];
    // The random_forests.py outputs to the backend root's parent directory
    const csvFilePath = path.join(__dirname, '../../future_price_predictions.csv');

    fs.createReadStream(csvFilePath)
        .on('error', (error) => {
            console.error("Error reading CSV file:", error);
            res.status(500).json({ error: 'Failed to read prediction data.' });
        })
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            res.json(results);
        });
});

module.exports = router;
