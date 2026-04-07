const { GoogleGenAI } = require("@google/genai");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Complaint = require("../models/complaintModel");
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

let ai;

// Response cache to reduce API calls for repeated queries
const responseCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 500; // Limit cache to 500 entries

const getCachedResponse = (query) => {
    if (!responseCache.has(query)) return null;
    const cached = responseCache.get(query);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        responseCache.delete(query);
        return null;
    }
    return cached.response;
};

const setCachedResponse = (query, response) => {
    // Simple LRU: if cache is full, delete the oldest entry
    if (responseCache.size >= MAX_CACHE_SIZE) {
        const firstKey = responseCache.keys().next().value;
        responseCache.delete(firstKey);
    }
    responseCache.set(query, { response, timestamp: Date.now() });
};

const clearOldCacheEntries = () => {
    const now = Date.now();
    for (const [query, data] of responseCache.entries()) {
        if (now - data.timestamp > CACHE_TTL) {
            responseCache.delete(query);
        }
    }
};

const getAI = () => {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing from environment variables.");
        }
        ai = new GoogleGenAI({});
    }
    return ai;
};

const normalizeCommodity = (message) => {
    const lowerMessage = message.toLowerCase();
    const mapping = {
        tomato: 'Tomato',
        potato: 'Potato',
        onion: 'Onion',
        banana: 'Banana',
        apple: 'Apple',
        orange: 'Orange',
        carrot: 'Carrot',
        cabbage: 'Cabbage',
        brinjal: 'Brinjal',
        chilli: 'Chilli',
        lemon: 'Lemon',
        mango: 'Mango',
        "water melon": 'Water Melon',
        watermelon: 'Water Melon'
    };

    for (const key of Object.keys(mapping)) {
        if (lowerMessage.includes(key)) return mapping[key];
    }
    return null;
};

const parseNumber = (value) => {
    if (value === undefined || value === null) return NaN;
    const parsed = parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(parsed) ? parsed : NaN;
};

const formatPricePerKg = (quintalPrice) => {
    const price = parseNumber(quintalPrice);
    if (Number.isNaN(price)) return null;
    return `₹${(price / 100).toFixed(2)}/kg`;
};

const getBasePricePerKg = async (commodity) => {
    try {
        const apiKey = process.env.GOVT_API_KEY;
        if (!apiKey) return null;
        const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=20&filters[commodity]=${encodeURIComponent(commodity.toUpperCase())}`;
        const apiRes = await fetch(apiUrl);
        const apiData = await apiRes.json();
        if (apiData.records && apiData.records.length > 0) {
            const perKgPrices = apiData.records
                .map(record => formatPricePerKg(record.modal_price))
                .filter(price => price !== null)
                .map(priceString => parseNumber(priceString));
            if (perKgPrices.length > 0) {
                const average = perKgPrices.reduce((sum, price) => sum + price, 0) / perKgPrices.length;
                return Math.max(average, 1);
            }
        }
    } catch (error) {
        console.warn("Could not fetch live base price:", error.message);
    }
    return null;
};

const buildPredictionRows = (commodity, basePricePerKg, predictions, userRole) => {
    if (!predictions || predictions.length === 0) return null;
    const data = [];
    let runningPrice = basePricePerKg ?? 40;
    let maxPrice = runningPrice;
    let maxPriceIndex = 0;
    let maxPriceDate = '';

    const sorted = [...predictions].sort((a, b) => {
        const [d1, m1, y1] = a.Date.split('-').map(Number);
        const [d2, m2, y2] = b.Date.split('-').map(Number);
        return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
    });

    const today = new Date();
    const days = ['Tomorrow', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

    for (let i = 0; i < Math.min(7, sorted.length); i++) {
        const prediction = sorted[i];
        const multiplier = parseNumber(prediction['Predicted Multiplier']) || 1;
        const rangeMin = parseNumber(prediction['Range Min Multiplier']) || multiplier;
        const rangeMax = parseNumber(prediction['Range Max Multiplier']) || multiplier;

        const predictedPrice = runningPrice * multiplier;
        const priceRangeMin = runningPrice * rangeMin;
        const priceRangeMax = runningPrice * rangeMax;
        
        const percentChange = ((predictedPrice - runningPrice) / runningPrice) * 100;

        let trend = 'Stable';
        let trendDirection = 'neutral';
        if (percentChange > 2) {
            trend = 'Increasing';
            trendDirection = 'up';
        } else if (percentChange < -2) {
            trend = 'Decreasing';
            trendDirection = 'down';
        }

        if (predictedPrice > maxPrice) {
            maxPrice = predictedPrice;
            maxPriceIndex = i + 1;
            maxPriceDate = prediction.Date;
        }

        data.push({
            date: prediction.Date,
            day_label: days[i],
            predicted_price: `₹${predictedPrice.toFixed(2)}`,
            trend_percent: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`,
            trend_direction: trendDirection,
            trend_text: trend,
            range_min: `₹${priceRangeMin.toFixed(2)}`,
            range_max: `₹${priceRangeMax.toFixed(2)}`,
            confidence: prediction.Confidence || 'Medium'
        });

        runningPrice = predictedPrice;
    }

    let suggestion = '';
    if (userRole === 'farmer') {
        suggestion = `Prices are expected to peak on ${days[maxPriceIndex - 1]} (${maxPriceDate}) at ₹${maxPrice.toFixed(2)}/kg. Sell on this day for maximum profit.`;
    } else {
        const minPrice = Math.min(...data.map(d => parseNumber(d.predicted_price)));
        const minDay = data.find(d => parseNumber(d.predicted_price) === minPrice);
        suggestion = `Prices are expected to be lowest on ${minDay?.day_label} (${minDay?.date}) at ₹${minPrice.toFixed(2)}/kg. This is the best time to buy.`;
    }

    return {
        type: "price_prediction",
        product: commodity || "Vegetable",
        current_price: `₹${basePricePerKg.toFixed(2)}/kg`,
        data,
        best_day_to_sell: days[maxPriceIndex - 1],
        best_day_date: maxPriceDate,
        best_day_price: `₹${maxPrice.toFixed(2)}/kg`,
        suggestion
    };
};

const getPriceData = async (message) => {
    try {
        const commodity = normalizeCommodity(message);
        const lowerMessage = message.toLowerCase();
        const isPrediction = lowerMessage.includes('prediction') || lowerMessage.includes('forecast') || lowerMessage.includes('future') || lowerMessage.includes('next week') || lowerMessage.includes('tomorrow');

        if (isPrediction) {
            const predictions = await fetchPredictionsFromCSV(commodity);
            if (predictions && predictions.length > 0) {
                const basePrice = await getBasePricePerKg(commodity || 'Tomato');
                const result = buildPredictionRows(commodity, basePrice, predictions, req.user?.role || 'customer');
                if (result) {
                    return result;
                }
            }

            return {
                type: "no_data",
                message: "No prediction data available for that commodity. Try a specific vegetable name like tomato, potato, or onion."
            };
        }

        if (!commodity) {
            return {
                type: "no_data",
                message: "Please ask for a specific commodity price such as tomato, potato, onion, or banana."
            };
        }

        const apiKey = process.env.GOVT_API_KEY;
        const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=10&filters[commodity]=${encodeURIComponent(commodity.toUpperCase())}`;
        const apiRes = await fetch(apiUrl);
        const apiData = await apiRes.json();
        if (apiData.records && apiData.records.length > 0) {
            const data = apiData.records.slice(0, 5).map(record => ({
                commodity: `${record.commodity} (${record.variety || 'Standard'})`,
                price: formatPricePerKg(record.modal_price) || 'N/A',
                location: `${record.market}, ${record.state}`,
                trend: record.trend || 'Stable'
            }));
            return {
                type: "price_table",
                data: data
            };
        }

        return {
            type: "no_data",
            message: "No price data available for the requested commodity"
        };
    } catch (error) {
        console.error("Error fetching price data:", error);
        return {
            type: "no_data",
            message: "Unable to fetch price data at the moment"
        };
    }
};

// Tool definitions for Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: "searchProducts",
        description: "Search for products in the Agrimart marketplace by name or category.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING", description: "The product name or category to search for." }
          },
          required: ["query"]
        }
      },
      {
        name: "trackOrder",
        description: "Fetch the real-time status of an order using its Order ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            orderId: { type: "STRING", description: "The unique ID of the order." }
          },
          required: ["orderId"]
        }
      },
      {
        name: "getLivePrices",
        description: "Get the current market prices for a specific commodity (e.g., Tomato, Potato).",
        parameters: {
          type: "OBJECT",
          properties: {
            commodity: { type: "STRING", description: "The name of the commodity." }
          },
          required: ["commodity"]
        }
      },
      {
        name: "getPricePrediction",
        description: "Predict the price trend for a commodity for the next 7 days.",
        parameters: {
          type: "OBJECT",
          properties: {
            commodity: { type: "STRING", description: "The name of the vegetable/commodity." }
          },
          required: ["commodity"]
        }
      },
      {
        name: "submitComplaint",
        description: "Register a formal complaint for an order or general issue.",
        parameters: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING", description: "Category of the complaint (e.g., Delivery Delay, Quality Issue)." },
            subject: { type: "STRING", description: "Brief title of the issue." },
            description: { type: "STRING", description: "Detailed description of the complaint." },
            orderId: { type: "STRING", description: "Optional Order ID related to the complaint." }
          },
          required: ["category", "subject", "description"]
        }
      },
      {
        name: "navigateToPage",
        description: "Redirect the user to a specific page on the website (e.g., My Orders, Market, Profile).",
        parameters: {
          type: "OBJECT",
          properties: {
            pageCode: { 
                type: "STRING", 
                description: "The logic code for the target page.",
                enum: ["HOME", "PRODUCTS", "ORDERS", "CART", "PROFILE", "PRICES", "SELL", "MY_PRODUCTS", "REVENUE", "PREDICTIONS", "CONTACT"]
            }
          },
          required: ["pageCode"]
        }
      }
    ]
  }
];

// Helper to fetch price predictions from CSV
const fetchPredictionsFromCSV = (commodity) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const csvFilePath = path.join(__dirname, '../../future_price_predictions.csv');
        
        if (!fs.existsSync(csvFilePath)) return resolve([]);

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => {
                if (!commodity || data.Vegetable.toLowerCase().includes(commodity.toLowerCase())) {
                    results.push(data);
                }
            })
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
};

const NAVIGATION_TARGETS = [
    { page: 'HOME', label: 'Home', keywords: ['home page', 'go home', 'home', 'homepage', 'main page', 'dashboard'] },
    { page: 'ABOUT', label: 'About Us', keywords: ['about', 'about us', 'company info', 'who are you', 'information about'] },
    { page: 'PREDICTIONS', label: 'Price Prediction', keywords: ['price prediction', 'forecast page', 'prediction page', 'price predictions', 'market forecast', '7 day forecast'] },
    { page: 'PRICES', label: 'Live Prices', keywords: ['market price', 'live price', 'prices page', 'price page', 'market data', 'market prices', 'current price'] },
    { page: 'SELL', label: 'Sell Produce', keywords: ['sell produce', 'sell my produce', 'sell product', 'list produce', 'add product', 'sell farm'] },
    { page: 'MY_PRODUCTS', label: 'My Products', keywords: ['my products', 'my listings', 'product listings', 'owned products', 'my inventory', 'my produce'] },
    { page: 'REVENUE', label: 'Orders Received', keywords: ['revenue', 'sales report', 'earnings', 'income', 'order details', 'orders received', 'sales'] },
    { page: 'ORDERS', label: 'Orders', keywords: ['my orders', 'order history', 'track my order', 'customer orders', 'orders page', 'my order', 'order status'] },
    { page: 'CART', label: 'Cart', keywords: ['cart', 'checkout', 'shopping cart', 'my cart', 'add to cart'] },
    { page: 'PROFILE', label: 'Profile', keywords: ['profile', 'my account', 'account details', 'account page', 'my details', 'edit profile'] },
    { page: 'PRODUCTS_VEGS', label: 'Fresh Vegetables', keywords: ['vegetables', 'fresh vegetables', 'vegetable', 'veggies', 'browse vegetables'] },
    { page: 'PRODUCTS_FRUITS', label: 'Fresh Fruits', keywords: ['fruits', 'fresh fruits', 'fruit', 'buy fruits', 'browse fruits'] },
    { page: 'PRODUCTS_GRAINS', label: 'Grains & Pulses', keywords: ['grains', 'pulses', 'grains and pulses', 'grains & pulses', 'dal', 'rice', 'wheat'] },
    { page: 'PRODUCTS', label: 'Products', keywords: ['products page', 'browse products', 'product listing', 'shop page', 'shopping', 'browse all'] },
    { page: 'HOME', label: 'Home', keywords: ['home page', 'homepage', 'main page', 'landing page', 'home', 'go back home'] }
];

const PAGE_ROLE_ACCESS = {
    HOME: ['guest', 'customer', 'farmer'],
    ABOUT: ['guest', 'customer', 'farmer'],
    PRODUCTS: ['guest', 'customer', 'farmer'],
    PRODUCTS_VEGS: ['guest', 'customer', 'farmer'],
    PRODUCTS_FRUITS: ['guest', 'customer', 'farmer'],
    PRODUCTS_GRAINS: ['guest', 'customer', 'farmer'],
    PRICES: ['guest', 'customer', 'farmer'],
    PREDICTIONS: ['guest', 'customer', 'farmer'],
    PROFILE: ['customer', 'farmer'],
    CART: ['customer'],
    ORDERS: ['customer'],
    SELL: ['farmer'],
    MY_PRODUCTS: ['farmer'],
    REVENUE: ['farmer']
};

const customerOnlyKeywords = ['cart', 'checkout', 'customer order', 'order history', 'my orders', 'customer orders', 'shopping cart'];
const farmerOnlyKeywords = ['sell produce', 'sell my produce', 'farmer stock', 'my products', 'revenue', 'sales report', 'orders received', 'farmer orders', 'list produce', 'my listings'];

const isNavigationIntent = (message) => {
    const navPhrases = ['go to', 'open', 'navigate', 'take me to', 'show me the', 'visit', 'bring me', 'where is', 'take me', 'direct me', 'jump to'];
    const lower = message.toLowerCase();
    return navPhrases.some(phrase => lower.includes(phrase));
};

const findNavigationTarget = (message) => {
    const lowerMessage = message.toLowerCase();
    return NAVIGATION_TARGETS.find(target => target.keywords.some(keyword => lowerMessage.includes(keyword)));
};

const buildNavigationResponse = (target, authRole) => {
    if (!target) return null;

    const allowedRoles = PAGE_ROLE_ACCESS[target.page] || [];
    if (!allowedRoles.includes(authRole)) {
        if (authRole === 'guest') {
            return {
                type: 'no_data',
                message: `You must log in to view the ${target.label} page. Please sign in to continue.`
            };
        }
        const roleHint = authRole === 'customer' ? 'farmer' : 'customer';
        return {
            type: 'no_data',
            message: `Your account is a ${authRole}. The ${target.label} page is available only to ${roleHint} users.`
        };
    }

    const routeMapping = {
        HOME: '/',
        ABOUT: '/about',
        PRODUCTS: '/products',
        PRODUCTS_VEGS: '/products?category=Vegetables',
        PRODUCTS_FRUITS: '/products?category=Fruits',
        PRODUCTS_GRAINS: '/products?category=Grains%20%26%20Pulses',
        ORDERS: '/orders',
        CART: '/cart',
        PROFILE: '/profile',
        PRICES: '/prices',
        PREDICTIONS: '/price-prediction',
        SELL: '/sell-produce',
        MY_PRODUCTS: '/my-products',
        REVENUE: '/orders-received'
    };

    const route = routeMapping[target.page];
    if (!route) return null;

    return {
        type: "navigation",
        message: `You can view your ${target.label.toLowerCase()} in the ${target.label} page.`,
        actions: [
            {
                label: `Go to ${target.label}`,
                route: route
            }
        ]
    };
};

// Main Chatbot Controller
// EXECUTION FLOW:
// 1. Role validation → early return if access denied
// 2. Navigation queries → return navbar routes WITHOUT Gemini
// 3. Price/Prediction queries → return structured data WITHOUT Gemini
// 4. General queries → call Gemini for understanding and response generation
exports.chat = async (req, res) => {
    try {
        const { message, chatHistory, role } = req.body; // role: 'customer' or 'farmer'
        const authRole = ['customer', 'farmer'].includes(req.user?.role) ? req.user.role : (['customer', 'farmer'].includes(role) ? role : 'guest');
        const text = String(message || '').trim();
        const lowerText = text.toLowerCase();

        const priceKeywords = ['price', 'market', 'rate', 'cost', 'prediction', 'forecast', 'tomorrow', 'next week', 'future'];
        const isPriceQuery = priceKeywords.some(keyword => lowerText.includes(keyword));
        const isCustomerOnlyQuery = customerOnlyKeywords.some(keyword => lowerText.includes(keyword));
        const isFarmerOnlyQuery = farmerOnlyKeywords.some(keyword => lowerText.includes(keyword));

        const navigationTarget = findNavigationTarget(text);
        const explicitNavigation = navigationTarget && isNavigationIntent(text);

        if (isFarmerOnlyQuery && authRole === 'customer') {
            return res.json({
                type: 'no_data',
                message: 'This feature is farmer-only. Please log in with a farmer account to access it.'
            });
        }

        if (isCustomerOnlyQuery && authRole === 'farmer') {
            return res.json({
                type: 'no_data',
                message: 'This feature is customer-only. Please log in with a customer account to access it.'
            });
        }

        if (explicitNavigation) {
            const navigationResponse = buildNavigationResponse(navigationTarget, authRole);
            return res.json(navigationResponse);
        }

        if (isPriceQuery) {
            const priceData = await getPriceData(text);
            return res.json(priceData);
        }

        // Check cache for repeated queries
        const cachedResponse = getCachedResponse(text);
        if (cachedResponse) {
            console.log(`[CACHE HIT] Query from cache: ${text.substring(0, 50)}...`);
            return res.json(cachedResponse);
        }

        // Periodic cleanup of expired cache entries
        clearOldCacheEntries();

        const aiInstance = getAI();
        const model = "gemini-1.5-pro";

        const systemInstruction = `You are the Agrimart AI Assistant. Your job is to help Customers and Farmers navigate Agrimart, answer product queries, track orders, and manage complaints.

CRITICAL RULES FOR RESPONSE STRUCTURE:
1. Answer only the user query. Do not add greetings, explanations, navigation instructions, or unrelated details.
2. Keep responses concise and directly relevant to the query.
3. If the user asks for navigation or action guidance explicitly, provide a short answer and avoid extra paragraphs.
4. If the user asks for current market prices or price predictions, return the JSON payload from the backend, not a long narrative.
5. Do not include extra sections, bullet lists, or suggestions unless asked explicitly.

BEHAVIORAL RULES:
1. Respond even if the user has spelling or grammar mistakes. Interpret their intent.
2. Only answer queries about Agrimart, agriculture, products, website features, orders, complaints, or predictions.
3. If a query is out of scope, briefly say it is outside Agrimart support and recommend contacting support at spmproject66@gmail.com.
4. Always respond in the same language as the user's input (English, Telugu, Hindi, Tamil).`;

        const contents = `${systemInstruction}\n\nUser query: ${text}`;

        const response = await aiInstance.models.generateContent({
            model: model,
            contents: contents,
        });

        const botText = response.text || "I'm sorry, I couldn't generate a response right now.";

        const responsePayload = {
            text: botText,
            history: chatHistory ? [...chatHistory, { role: 'user', parts: [{ text }] }, { role: 'model', parts: [{ text: botText }] }] : []
        };

        // Cache successful responses
        setCachedResponse(text, responsePayload);

        res.json(responsePayload);

    } catch (error) {
        console.error("Chatbot Error:", error.message);
        
        // Log to persistent file for developer inspection
        const logEntry = `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`;
        try {
            fs.appendFileSync(path.join(process.cwd(), 'chatbot_debug.log'), logEntry);
        } catch (logErr) { /* fallback if outside current wd */ }

        // Check for quota exceeded error (429 RESOURCE_EXHAUSTED)
        if (error.message && error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota')) {
            console.warn("[QUOTA_ERROR] Gemini API daily quota exceeded. Using fallback response.");
            return res.status(429).json({
                error: "Rate Limit Reached",
                text: "🔄 The AI assistant is temporarily at its daily limit. However, you can still:\n✅ Ask about live prices (no AI needed)\n✅ Navigate to features using our guides\n✅ Try again after a moment for general questions",
                type: 'quota_exceeded'
            });
        }

        res.status(500).json({ 
            error: `Assistant Error: ${error.message || "Unknown Failure"}`,
            text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment."
        });
    }
};
