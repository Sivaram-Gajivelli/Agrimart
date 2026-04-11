const fs = require('fs');
const csv = require('csv-parser');
const { fetchMarketData } = require('../utils/marketData');

// --- Quota & Cache State ---
const USAGE_LIMIT = 50; // Max Gemini calls per session/process (simple quota)
let geminiUsageCount = 0;
const queryCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

let ai;
const getAI = () => {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing from environment variables.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
};

// --- Intent Detection ---
const detectIntent = (query) => {
    const text = query.toLowerCase();
    
    // 1. LIVE_PRICE
    if (text.includes("today price") || text.includes("current price") || text.includes("mandi price") || 
        text.includes("rate today") || (text.includes("price") && !text.includes("predict") && !text.includes("forecast"))) {
        return "LIVE_PRICE";
    }
    
    // 2. PREDICTION
    if (text.includes("predict") || text.includes("forecast") || text.includes("next 7 days") || text.includes("future price")) {
        return "PREDICTION";
    }
    
    // 3. NAVIGATION
    const navKeywords = ["order", "cart", "profile", "account", "login", "go to", "where", "show me", "take me to", "open", "navigate", "stock", "revenue"];
    if (navKeywords.some(k => text.includes(k))) {
        return "NAVIGATION";
    }
    
    return "GENERAL";
};

// --- Helpers ---
const normalizeCommodity = (message) => {
    const lowerMessage = message.toLowerCase();
    const mapping = {
        tomato: 'Tomato', potato: 'Potato', onion: 'Onion', banana: 'Banana', apple: 'Apple',
        orange: 'Orange', carrot: 'Carrot', cabbage: 'Cabbage', brinjal: 'Brinjal', chilli: 'Chilli',
        lemon: 'Lemon', mango: 'Mango', watermelon: 'Water Melon', papaya: 'Papaya'
    };
    for (const key of Object.keys(mapping)) {
        if (lowerMessage.includes(key)) return mapping[key];
    }
    return null;
};

const normalizeCropForCSV = (crop) => {
    if (!crop) return null;
    const lower = crop.toLowerCase().trim();
    const mappings = {
        'tomato': 'tomatoes', 'potato': 'potatoes', 'onion': 'onions', 'banana': 'bananas',
        'brinjal': 'brinjals', 'cabbage': 'cabbages', 'cauliflower': 'cauliflowers', 'lemon': 'lemons',
        'mango': 'mangoes', 'papaya': 'papayas', 'rice': 'rice', 'watermelon': 'water_melons',
        'chilli': 'green_chillis'
    };
    if (mappings[lower]) return mappings[lower];
    return lower;
};

// --- Handlers ---

const handleLivePrice = async (query, role = 'guest') => {
    let commodity = normalizeCommodity(query);
    if (!commodity) {
        return { type: "text", message: "Please specify a crop name (e.g., Today's Tomato price) to see live market data." };
    }

    try {
        let searchCommodity = commodity.trim().toUpperCase();
        if (searchCommodity === 'WATERMELON' || searchCommodity === 'WATER MELON' || searchCommodity === 'WATER-MELON') {
            searchCommodity = 'WATER MELON';
        }

        console.log(`[Chatbot] Fetching live price via helper for: ${searchCommodity}`);
        
        const apiData = await fetchMarketData(searchCommodity, 10);

        if (apiData && apiData.records && apiData.records.length > 0) {
            const data = apiData.records.slice(0, 5).map(record => {
                const modal = (parseFloat(record.modal_price) / 100).toFixed(2);
                
                return [
                    record.commodity,
                    `${record.market}, ${record.state}`,
                    `₹${modal}/kg`
                ];
            });

            const response = {
                type: "table",
                headers: ["Crop", "Market", "Price"],
                data: data,
                message: `Market data for ${commodity}. Showing prices per kg.`
            };

            // Maintain navigation for farmers
            if (role === 'farmer') {
                response.footer = {
                    type: "navigation",
                    route: "/farmer/live-prices",
                    message: "Open advanced market insights"
                };
            }

            return response;
        }
        
        return { 
            type: "text", 
            message: "Live market data is temporarily unavailable. Showing last known data." 
        };
    } catch (error) {
        console.error("[Chatbot] Live Price Handler Error:", error);
        return { 
            type: "text", 
            message: "Sorry, I'm having trouble fetching market data right now. Please try again later." 
        };
    }
};

const handlePrediction = async (query) => {
    const crop = normalizeCommodity(query);
    if (!crop) {
        return { type: "text", message: "Please specify a crop name for price prediction." };
    }

    try {
        const normalizedVeg = normalizeCropForCSV(crop);
        const csvFilePath = path.join(__dirname, '../../future_price_predictions.csv');
        
        let basePrice = 40;
        const apiKey = process.env.GOVT_API_KEY;
        if (apiKey) {
            const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=5&filters[commodity]=${encodeURIComponent(crop.toUpperCase())}`;
            const apiRes = await fetch(apiUrl);
            const apiData = await apiRes.json();
            if (apiData.records && apiData.records.length > 0) {
                basePrice = apiData.records.reduce((sum, r) => sum + (parseFloat(r.modal_price) / 100), 0) / apiData.records.length;
            }
        }

        const predictions = [];
        return new Promise((resolve) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (data) => {
                    if (data.Vegetable.toLowerCase() === normalizedVeg) predictions.push(data);
                })
                .on('end', () => {
                    if (predictions.length === 0) {
                        return resolve({ type: "text", message: `No prediction data available for ${crop}.` });
                    }

                    const sorted = predictions.sort((a, b) => {
                        const [d1, m1, y1] = a.Date.split('-').map(Number);
                        const [d2, m2, y2] = b.Date.split('-').map(Number);
                        return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
                    });

                    const tableData = [];
                    let runningPrice = basePrice;
                    let maxPrice = -1;
                    let bestDay = "";
                    const dayLabels = ['Tomorrow', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

                    for (let i = 0; i < Math.min(7, sorted.length); i++) {
                        const multiplier = parseFloat(sorted[i]['Predicted Multiplier']) || 1.0;
                        const predicted = runningPrice * multiplier;
                        tableData.push([
                            dayLabels[i],
                            sorted[i].Date,
                            `₹${predicted.toFixed(2)}/kg`
                        ]);
                        if (predicted > maxPrice) { maxPrice = predicted; bestDay = dayLabels[i]; }
                        runningPrice = predicted;
                    }

                    const lastPrice = parseFloat(tableData[tableData.length - 1][2].replace(/[^\d.]/g, ''));
                    const firstPrice = parseFloat(tableData[0][2].replace(/[^\d.]/g, ''));
                    const trend = lastPrice > firstPrice ? "increasing" : "decreasing";

                    resolve({
                        type: "table",
                        headers: ["Day", "Date", "Predicted Price"],
                        data: tableData,
                        message: `Trend: ${trend} | Best Day to Sell: ${bestDay}`
                    });
                });
        });
    } catch (error) {
        console.error("Prediction Logic Error:", error);
        return { type: "text", message: "Prediction system encountered an error." };
    }
};

const handleNavigation = async (query, role = 'guest') => {
    const text = query.toLowerCase();
    
    // Guest protection
    const privateKeywords = ["order", "cart", "profile", "account", "stock", "revenue"];
    if (role === 'guest' && privateKeywords.some(k => text.includes(k))) {
        return {
            type: "text",
            message: "Please login to access this feature."
        };
    }

    // Role-based routing
    if (text.includes("order")) {
        return {
            type: "navigation",
            route: role === 'farmer' ? "/orders-received" : "/orders",
            message: "Click below to open"
        };
    }
    if (text.includes("cart")) {
        return {
            type: "navigation",
            route: "/cart",
            message: "Click below to open"
        };
    }
    if (text.includes("profile") || text.includes("account")) {
        return {
            type: "navigation",
            route: "/profile",
            message: "Click below to open"
        };
    }
    if (text.includes("stock")) {
        return {
            type: "navigation",
            route: role === 'farmer' ? "/farmer-stock" : "/products",
            message: "Click below to open"
        };
    }
    if (text.includes("revenue") || text.includes("sell")) {
        return {
            type: "navigation",
            route: role === 'farmer' ? "/sell-produce" : "/products",
            message: "Click below to open"
        };
    }

    return { type: "text", message: "I can help you find your orders, cart, profile, or stock management pages." };
};

const handleGeneral = async (message, history) => {
    if (geminiUsageCount >= USAGE_LIMIT) {
        return { type: "text", message: "Service temporarily unavailable. Please try again later." };
    }

    if (queryCache.has(message)) {
        const cached = queryCache.get(message);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return { type: "text", message: cached.text };
        }
    }

    try {
        const aiInstance = getAI();
        const modelName = "gemini-1.5-flash"; 

        const systemInstruction = "You are the AgriMart AI Assistant. ONLY answer agriculture-related questions. Be concise (max 150 tokens). NEVER discuss prices/predictions/navigation.";
        
        const contents = history && history.length > 0 
            ? history.slice(-3).map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: h.parts }))
            : [];
        
        contents.push({ role: 'user', parts: [{ text: `${systemInstruction}\n\nUser: ${message}` }] });

        const response = await aiInstance.models.generateContent({
            model: modelName,
            contents: contents,
            config: { maxOutputTokens: 150, temperature: 0.7 }
        });

        const botText = response.text || (response.candidates && response.candidates[0].content.parts[0].text) || "I'm sorry, I couldn't generate a response.";
        
        geminiUsageCount++;
        queryCache.set(message, { text: botText, timestamp: Date.now() });

        return { type: "text", message: botText };
    } catch (error) {
        console.error("Gemini Error:", error);
        return { type: "text", message: "Sorry, I'm having trouble answering that right now." };
    }
};

exports.chat = async (req, res) => {
    try {
        const { message, chatHistory, role } = req.body;
        const userRole = req.user?.role || role || 'guest';
        
        if (!message) return res.status(400).json({ error: "Message is required" });

        const intent = detectIntent(message);
        const quotaLeft = USAGE_LIMIT - geminiUsageCount;
        
        // Log testing output as requested
        console.log(`[Chatbot] Query: "${message}" | Intent: ${intent} | Quota Left: ${quotaLeft}`);

        let response;

        switch (intent) {
            case "LIVE_PRICE":
                response = await handleLivePrice(message, userRole);
                break;
            case "PREDICTION":
                response = await handlePrediction(message);
                break;
            case "NAVIGATION":
                response = await handleNavigation(message, userRole);
                break;
            default:
                response = await handleGeneral(message, chatHistory);
        }

        res.json(response);

    } catch (error) {
        console.error("Chat Controller Error:", error);
        res.status(500).json({ type: "text", message: "Sorry, I'm having trouble. Please try again later." });
    }
};
