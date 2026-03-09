const express = require("express");
const router = express.Router();

router.get("/prices", async (req, res) => {
    try {
        const { commodity } = req.query;
        if (!commodity) {
            return res.status(400).json({ error: "Commodity name is required" });
        }

        const apiKey = process.env.GOVT_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Server API Key is missing" });
        }

        const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=50&filters[commodity]=${encodeURIComponent(commodity)}`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`External API returned status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching market prices:", error);
        res.status(500).json({ error: "Failed to fetch market prices from external API." });
    }
});

module.exports = router;
