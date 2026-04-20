const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { fetchMarketData } = require('../utils/marketData');

// --- Quota & Cache State ---
const USAGE_LIMIT = 50; // Max Gemini calls per session/process (simple quota)
let geminiUsageCount = 0;
const queryCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

const getAI = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing from environment variables.");
    }
    return new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        apiVersion: "v1beta"
    });
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
        'mango': 'mangoes', 'papaya': 'papayas', 'rice': 'rice', 
        'watermelon': 'water_melons', 'water melon': 'water_melons',
        'chilli': 'green_chillis', 'green chilli': 'green_chillis'
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
                    // Filter and Sort (assuming DD-MM-YYYY format in CSV)
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    const filteredAndSorted = predictions
                        .filter(item => {
                            const [d, m, y] = item.Date.split('-').map(Number);
                            const itemDate = new Date(y, m - 1, d);
                            return itemDate > now;
                        })
                        .sort((a, b) => {
                            const [d1, m1, y1] = a.Date.split('-').map(Number);
                            const [d2, m2, y2] = b.Date.split('-').map(Number);
                            return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
                        });

                    if (filteredAndSorted.length === 0) {
                        return resolve({ type: "text", message: `No upcoming prediction data available for ${crop}.` });
                    }

                    const tableData = [];
                    let runningPrice = basePrice;
                    let maxPrice = -1;
                    let bestDay = "";
                    const dayLabels = ['Tomorrow', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

                    for (let i = 0; i < Math.min(7, filteredAndSorted.length); i++) {
                        const multiplier = parseFloat(filteredAndSorted[i]['Predicted Multiplier']) || 1.0;
                        const predicted = runningPrice * multiplier;
                        tableData.push([
                            dayLabels[i],
                            filteredAndSorted[i].Date,
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
    const logErr = (label, err) => {
        const timestamp = new Date().toISOString();
        const content = `[${timestamp}] ${label}: ${err.message}\nSTACK: ${err.stack}\n\n`;
        fs.appendFileSync(path.join(__dirname, '../chatbot_debug.log'), content);
        console.error(`[Chatbot] ${label}:`, err);
    };

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
        const ai = getAI();
        const modelName = "gemini-flash-latest"; 

        const systemPrompt = `You are the AgriMart AI Assistant. AgriMart is a digital marketplace for farmers and customers.
Answer ONLY agriculture or AgriMart related questions. Be professional and complete your sentences.

User Query: ${message}`;
        
        const contents = history && history.length > 0 
            ? history.slice(-5).map(h => ({ 
                role: h.role === 'model' ? 'model' : 'user', 
                parts: [{ text: typeof h.parts[0] === 'string' ? h.parts[0] : (h.parts[0].text || "") }] 
            }))
            : [];
        
        contents.push({ role: 'user', parts: [{ text: systemPrompt }] });

        const result = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: { 
                maxOutputTokens: 1000, // Increased for full responses
                temperature: 0.7,
                safetySettings: [
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" }
                ]
            }
        });

        // Simplified extraction with finishReason logging
        let botText = "";
        let finishReason = "UNKNOWN";
        try {
            if (result.candidates && result.candidates[0]) {
                finishReason = result.candidates[0].finishReason;
            } else if (result.response && result.response.candidates && result.response.candidates[0]) {
                finishReason = result.response.candidates[0].finishReason;
            }

            if (result.text) botText = result.text;
            else if (result.response && typeof result.response.text === 'function') botText = await result.response.text();
            else if (result.candidates && result.candidates[0].content) botText = result.candidates[0].content.parts[0].text;
            else if (result.response && result.response.candidates) botText = result.response.candidates[0].content.parts[0].text;
        } catch (e) { logErr("Extraction Inner", e); }

        // Telemetry
        const timestamp = new Date().toISOString();
        const telemetry = `[${timestamp}] Query: "${message.substring(0, 30)}..." | Finish: ${finishReason} | Length: ${botText.length} chars\n`;
        fs.appendFileSync(path.join(__dirname, '../chatbot_debug.log'), telemetry);

        if (!botText) {
            logErr("Empty Result", new Error(`Object keys: ${Object.keys(result).join(', ')} | Finish: ${finishReason}`));
            throw new Error("No text returned");
        }
        
        geminiUsageCount++;
        queryCache.set(message, { text: botText, timestamp: Date.now() });

        return { type: "text", message: botText };
    } catch (error) {
        logErr("General Handler Crash", error);
        return { type: "text", message: "I'm having a little trouble thinking right now. Could you try rephrasing your question?" };
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

        res.json({
            ...response,
            quotaLimit: USAGE_LIMIT,
            quotaLeft: USAGE_LIMIT - geminiUsageCount
        });

    } catch (error) {
        console.error("[Market API] Error fetching market prices:", error.message, error.stack);
        res.status(500).json({ error: "Internal server error while fetching prices.", details: error.message });
    }
};
