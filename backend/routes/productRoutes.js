const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const Hub = require('../models/hubModel');
const User = require('../models/userModel');
const auth = require('../middleware/authMiddleware');
const { translate } = require('@vitalets/google-translate-api');
const Fuse = require('fuse.js');
const { getDistance } = require('../utils/distanceHelper');

// Super Dictionary: High-Precision Agricultural Terms in 12 Languages
const seedDictionary = {
  // Tomatoes
  "టమాటా": "Tomato", "టమోటా": "Tomato", "టమాటాలు": "Tomato", "టమోటాలు": "Tomato", "टमाटर": "Tomato", "தக்காளி": "Tomato", "ಟೊಮೆಟೊ": "Tomato", "ತಕ್ಕಾಳಿ": "Tomato", "टोमॅटो": "Tomato", "ટામેટાં": "Tomato", "ਟਮਾਟਰ": "Tomato", "টমেটো": "Tomato", "ଟମାଟୋ": "Tomato", "বিলাহী": "Tomato",
  // Potatoes
  "బంగాళాదుంప": "Potato", "ఆలూ": "Potato", "బంగాళాదుంపలు": "Potato", "ఆలూగడ్డ": "Potato", "आलू": "Potato", "உருளைக்கிழங்கு": "Potato", "ಆಲೂಗಡ್ಡೆ": "Potato", "ಉರುಳక్కిಳంగు": "Potato", "बటాటా": "Potato", "બટાકા": "Potato", "ਆਲੂ": "Potato", "আলু": "Potato", "ଆଳୁ": "Potato",
  // Onions
  "ఉల్లిపాయ": "Onion", "ప్యాజ్": "Onion", "ఉల్లిపాయలు": "Onion", "प्याज": "Onion", "வெங்காயம்": "Onion", "ఈరుಳ್ಳಿ": "Onion", "సవాళ": "Onion", "कांदा": "Onion", "డుంగళి": "Onion", "పియాజ్": "Onion", "পেয়াঁজ": "Onion", "ପିଆଜ": "Onion", "পিঁয়াজ": "Onion",
  // Chillies & Spices
  "మిరపకాయ": "Chilli", "మిర్చి": "Chilli", "మిరపకాయలు": "Chilli", "మిర్చీ": "Chilli", "मिर्च": "Chilli", "மிளகாய்": "Chilli", "మెణసినకాయి": "Chilli", "ముളക്": "Chilli", "मिरची": "Chilli", "મરચું": "Chilli", "ਮਿਰਚ": "Chilli", "লঙ্কা": "Chilli", "ଲଙ୍କା": "Chilli", "জালকীয়া": "Chilli",
  "అల్లం": "Ginger", "అడ్రక్": "Ginger", "అదరక్": "Ginger", "अदरक": "Ginger", "இஞ்சி": "Ginger", "ಶುಂಠಿ": "Ginger", "ഇഞ്ചി": "Ginger", "आले": "Ginger", "આદું": "Ginger", "ਅਦਰਕ": "Ginger", "আদা": "Ginger", "ଅଦା": "Ginger",
  "వెల్లుల్లి": "Garlic", "లహసన్": "Garlic", "లహసున్": "Garlic", "పూండు": "Garlic", "బెళ్ళుళ్ళి": "Garlic", "వెళ్లుత్తి": "Garlic", "వెళుత్తുള്ളి": "Garlic", "లసూణ": "Garlic", "లసణ": "Garlic", "ਲਸਣ": "Garlic", "রসুন": "Garlic", "ରସୁଣ": "Garlic",
  // Grains & Pulses
  "బియ్యం": "Rice", "వడ్లు": "Rice", "ప్యాడీ": "Rice", "చావల్": "Rice", "चावल": "Rice", "అరిసి": "Rice", "అక్కి": "Rice", "అరి": "Rice", "తాందూళ": "Rice", "చోఖ": "Rice", "చावल": "Rice", "చావల్": "Rice",
  "గోధుమలు": "Wheat", "గేహం": "Wheat", "గేహూం": "Wheat", "గేహూ": "Wheat", "గెహు": "Wheat", "కౌదుమై": "Wheat", "గోధి": "Wheat", "గోతంబ్": "Wheat", "గహూ": "Wheat", "ఘౌం": "Wheat", "కణక్": "Wheat", "গম": "Wheat", "ଗହମ": "Wheat",
  "పప్పు": "Pulse", "పప్పులు": "Pulse", "కందిపప్పు": "Pulse", "దాల్": "Pulse", "పల్స్": "Pulse", "బేళె": "Pulse", "పరిప్": "Pulse", "డాళ": "Pulse", "దాల్": "Pulse", "ডাল": "Pulse", "ଡାଲି": "Pulse", "ডাইল": "Pulse",
  // Fruits
  "మామిడి": "Mango", "మామిడిపండు": "Mango", "आम": "Mango", "மாம்பழம்": "Mango", "ಮಾವಿನಹಣ್ಣು": "Mango", "മാങ്ങ": "Mango", "आंबा": "Mango", "કેરી": "Mango", "ਅੰਬ": "Mango", "আম": "Mango", "ଆମ୍ବ": "Mango", "আম": "Mango",
  "అరటి": "Banana", "అరటిపండు": "Banana", "केला": "Banana", "வாழைப்பழம்": "Banana", "ಬಾಳೆಹಣ್ಣು": "Banana", "പഴം": "Banana", "केळी": "Banana", "કેળા": "Banana", "ਕੇਲਾ": "Banana", "কলা": "Banana", "କଦଳୀ": "Banana", "কল": "Banana",
  "సెబ్": "Apple", "ఆపిల్": "Apple", "सेब": "Apple", "ஆப்பிள்": "Apple", "ಸೇಬು": "Apple", "ആപ്പിൾ": "Apple", "सफरचंद": "Apple", "સફરજન": "Apple", "ਸੇਬ": "Apple", "আপেল": "Apple", "ସେଓ": "Apple", "আপেল": "Apple",
  "ద్రాక్ష": "Grapes", "अंगूर": "Grapes", "திராட்சை": "Grapes", "ದ್ರಾಕ್ಷಿ": "Grapes", "മുന്തിരി": "Grapes", "द्राक्षे": "Grapes", "દ્રાક્ષ": "Grapes", "ਅੰਗੂਰ": "Grapes", "আঙুর": "Grapes", "ଅଙ୍ଗୁର": "Grapes", "আঙুৰ": "Grapes",
  "పుచ్చకాయ": "Watermelon", "तरबूज": "Watermelon", "తర్బూజ్": "Watermelon", "కల్లంగడి": "Watermelon", "దానిమ్మ": "Pomegranate", "अनार": "Pomegranate", "జామకాయ": "Guava", "అమ్రూద్": "Guava", "నీంబూ": "Lemon", "నిమ్మ": "Lemon",
  // Categories
  "కూరగాయలు": "Vegetables", "కాయగూరలు": "Vegetables", "సబ్జీ": "Vegetables", "సబ్జियां": "Vegetables", "పండ్లు": "Fruits", "ఫలాలు": "Fruits", "ధాన్యాలు": "Grains & Pulses", "విత్తనాలు": "Seeds", "ఎరువులు": "Fertilizers"
};

const translationCache = new Map();

// Optimized Dictionary Matcher
const getDictionaryMatch = (query) => {
    if (!query) return null;
    const normalizedQuery = query.trim().toLowerCase();
    
    // 1. Direct or fuzzy dictionary lookup in seed
    for (const key of Object.keys(seedDictionary)) {
        if (key.toLowerCase() === normalizedQuery) return seedDictionary[key];
    }
    
    // 2. Fallback to reverse lookup
    for (const key of Object.keys(reverseSeedDictionary)) {
        if (key.toLowerCase() === normalizedQuery) return key; 
    }
    
    return null;
};

// Precise Reverse Dictionary for 12 Languages
const reverseSeedDictionary = {
    "Tomato": { te: "టమాటా", hi: "टमाटर", ta: "தக்காளி", kn: "ಟೊಮೆಟೊ", ml: "തക്കാളി", mr: "टोमॅटो", gu: "ટામેટાં", pa: "ਟਮਾਟਰ", bn: "টমেটো", or: "ଟମାଟୋ", as: "বিলাহী" },
    "Tomatoes": { te: "టమోటాలు", hi: "टमाटर", ta: "தக்காளி", kn: "ಟೊಮೆಟొలు", ml: "തക്കാളി", mr: "टोमॅटो", gu: "ટામેટાં", pa: "ਟਮାਟਰ", bn: "টমেটো", or: "ଟମାଟୋ", as: "বিলাহী" },
    "Potato": { te: "బంగాళాదుంప", hi: "आलू", ta: "உருளைக்கிழங்கு", kn: "ಆಲೂಗಡ್ಡೆ", ml: "ഉരുളക്കിഴങ്ങ്", mr: "बटाटा", gu: "બટાકા", pa: "ਆਲੂ", bn: "আলু", or: "ଆଳୁ", as: "আলু" },
    "Potatoes": { te: "బంగాళాదుంపలు", hi: "आलू", ta: "உருளைக்கிழங்கு", kn: "ಆಲೂಗಡ್ಡೆ", ml: "ഉരുളക്കിഴങ്ങ്", mr: "बटाटे", gu: "બટાકા", pa: "ਆਲੂ", bn: "আলু", or: "ଆଳୁ", as: "আলু" },
    "Onion": { te: "ఉల్లిపాయ", hi: "प्याज", ta: "வெங்காயம்", kn: "ಈరుಳ್ಳಿ", ml: "സവാള", mr: "कांदा", gu: "ડુંગળી", pa: "ਪਿਆਜ਼", bn: "পেঁয়াজ", or: "ପିଆଜ", as: "পিঁয়াজ" },
    "Onions": { te: "ఉల్లిపాయలు", hi: "प्याज", ta: "வெங்காயம்", kn: "ఈరుಳ್ಳಿ", ml: "സവാള", mr: "कांदा", gu: "ડુંગળી", pa: "ਪਿਆਜ਼", bn: "পেঁয়াজ", or: "ପିଆଜ", as: "পিঁয়াজ" },
    "Mango": { te: "మామిడి", hi: "आम", ta: "மாம்பழம்", kn: "ಮಾವಿನಹಣ್ಣು", ml: "മാങ്ങ", mr: "आंबा", gu: "કેરી", pa: "ਅੰਬ", bn: "আম", or: "ଆମ୍ବ", as: "আম" },
    "Banana": { te: "అరటి", hi: "केला", ta: "வாழைப்பழம்", kn: "ಬಾಳೆಹಣ್ಣು", ml: "പഴം", mr: "केळी", gu: "કેળા", pa: "ਕੇਲਾ", bn: "কলা", or: "କଦଳୀ", as: "কল" },
    "Apple": { te: "ఆపిల్", hi: "सेब", ta: "ஆப்பிள்", kn: "ಸೇಬು", ml: "ആപ്പിൾ", mr: "सफरचंद", gu: "સફરજન", pa: "ਸੇਬ", bn: "আপেল", or: "ସେଓ", as: "আপেল" },
    "Grapes": { te: "ద్రాక్ష", hi: "अंगूर", ta: "திராட்சை", kn: "ದ್ರಾಕ್ಷಿ", ml: "മുന്തിரி", mr: "ద్రాक्षे", gu: "દ્રાક્ષ", pa: "ਅੰਗੂਰ", bn: "আঙুর", or: "ଅଙ୍ଗୁର", as: "আঙুৰ" },
    "Brinjal": { te: "వంకాయ", hi: "बैंगन", ta: "கத்தரிக்காய்", kn: "ಬದನೆಕಾಯಿ", ml: "വഴുതനങ്ങ", mr: "वांगी", gu: "રીંગણ", pa: "ਬੈਂਗਣ", bn: "বেগুন", or: "ବାଇଗଣ", as: "বেঙেনা" },
    "Chilli": { te: "మిరపకాయ", hi: "मिर्च", ta: "மிளகாய்", kn: "ಮೆಣಸಿನಕಾಯಿ", ml: "മുളക്", mr: "मिरची", gu: "મરચું", pa: "ਮਿਰਚ", bn: "লঙ্কা", or: "ଲଙ୍କା", as: "জালকীয়া" },
    "Okra": { te: "బెండకాయ", hi: "भिंडी", ta: "வெண்டைக்காய்", kn: "ಬೆಂಡೆಕಾಯಿ", ml: "വെണ്ടയ്ക്ക", mr: "भेंडी", gu: "ભીંડા", pa: "ਭਿੰਡੀ", bn: "ঢ্যাঁড়স", or: "ଭେଣ୍ଡି", as: "ভেণ্ডি" },
    "Carrot": { te: "క్యారెట్", hi: "गाजर", ta: "கேரட்", kn: "ಕ್ಯಾರೆಟ್", ml: "കാരറ്റ്", mr: "गाजर", gu: "ગાજર", pa: "ਗਾਜਰ", bn: "গাজর", or: "ଗାଜର", as: "গাজৰ" }
};

const reverseCategoryDictionary = {
    "Vegetables": { te: "కాయగూరలు", hi: "सब्जियां", ta: "காய்கறிகள்", kn: "ತರಕಾರಿಗಳು", ml: "പച്ചക്കറികൾ", mr: "भाज्या", gu: "શાકભાજી", pa: "ਸਬਜ਼ੀਆਂ", bn: "শাকসবজি", or: "ପରିବା", as: "শাক-পাচলি" },
    "Fruits": { te: "పండ్లు", hi: "फल", ta: "பழங்கள்", kn: "ಹಣ್ಣುಗಳು", ml: "പഴങ്ങൾ", mr: "फळे", gu: "ફળો", pa: "ਫਲ", bn: "ফল", or: "ଫଳ", as: "ফল" },
    "Grains & Pulses": { te: "ధాన్యాలు & పప్పులు", hi: "अनाज और दालें", ta: "தானியங்கள்", kn: "ಧಾನ್ಯಗಳು", ml: "ധാന്യങ്ങൾ", mr: "धान्य", gu: "અનાજ", pa: "ਅਨਾਜ", bn: "শস্য", or: "ଶସ୍ୟ", as: "শস্য" }
};

// @route   GET /api/products/search
router.get('/search', async (req, res) => {
    try {
        let { q, lang } = req.query;
        if (!q) return res.json([]);
        q = q.trim();
        if (lang) lang = lang.split('-')[0];

        let englishQuery = q;
        const dictMatch = getDictionaryMatch(q);
        
        if (dictMatch) {
            englishQuery = dictMatch;
        } else if (translationCache.has(q.toLowerCase())) {
            englishQuery = translationCache.get(q.toLowerCase());
        } else {
            try {
                const tr = await translate(q, { to: 'en', from: 'auto' });
                englishQuery = tr.text;
                translationCache.set(q.toLowerCase(), englishQuery);
            } catch (err) {
                englishQuery = q;
            }
        }

        const products = await Product.find({
            verificationStatus: 'verified'
        }).populate('farmer', 'name email phone').sort({ createdAt: -1 });

        const lowerQ = englishQuery.toLowerCase();

        // Inclusive Search Logic
        const matchingProducts = products.filter(p => 
            p.productName.toLowerCase().includes(lowerQ) ||
            p.category.toLowerCase().includes(lowerQ)
        );

        // Fuzzy fallback (Stricter threshold)
        const fuse = new Fuse(products, {
            keys: [{ name: 'productName', weight: 4 }, { name: 'category', weight: 2 }],
            threshold: 0.35, // Stricter threshold to avoid irrelevant results
        });
        const fuzzyResults = fuse.search(englishQuery).map(r => r.item);

        // Combine results: Priority to inclusive matches, then fuzzy
        const combined = [...matchingProducts];
        
        // Only add fuzzy results that aren't already included
        fuzzyResults.forEach(item => {
            if (!combined.some(p => p._id.toString() === item._id.toString())) {
                combined.push(item);
            }
        });

        let finalResults = combined.slice(0, 15);

        // Robust Localization
        if (lang && lang !== 'en') {
            finalResults = finalResults.map(p => {
                const pObj = p.toObject ? p.toObject() : p;
                
                const findInDict = (dict, key) => {
                    const normalizedKey = key.toLowerCase();
                    // 1. Exact/Shortest match
                    const matchKey = Object.keys(dict).find(k => normalizedKey.includes(k.toLowerCase()) || k.toLowerCase().includes(normalizedKey));
                    return matchKey ? dict[matchKey][lang] : null;
                };

                return {
                    ...pObj,
                    displayName: findInDict(reverseSeedDictionary, pObj.productName) || pObj.productName,
                    displayCategory: findInDict(reverseCategoryDictionary, pObj.category) || pObj.category
                };
            });
        } else {
            finalResults = finalResults.map(p => ({
                ...p.toObject ? p.toObject() : p,
                displayName: p.productName,
                displayCategory: p.category
            }));
        }

        res.json(finalResults);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Other routes (Marketplace, Details, Reviews)
router.get('/my-products', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can view their products.' });
        const products = await Product.find({ farmer: req.user.id }).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        console.error('Error in /my-products:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

router.get('/marketplace', async (req, res) => {
    try {
        const products = await Product.find({ 
            verificationStatus: 'verified'
        }).populate('farmer', 'name email phone').sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('farmer', 'name email phone');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/:id/reviews', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        const review = { name: req.user.name, rating: Number(rating), comment, user: req.user.id };
        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
        await product.save();
        res.status(201).json({ message: 'Review added' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can list products.' });
        
        let nearestHub = null;
        let lat = req.body.latitude;
        let lng = req.body.longitude;

        // If no product coordinates, try to get from farmer's profile
        if (!lat || !lng) {
            const farmer = await User.findById(req.user.id);
            if (farmer && farmer.latitude && farmer.longitude) {
                lat = farmer.latitude;
                lng = farmer.longitude;
            }
        }

        if (lat && lng) {
            const hubs = await Hub.find({ status: 'active' });
            let minDistance = Infinity;
            hubs.forEach(hub => {
                const dist = getDistance(lat, lng, hub.latitude, hub.longitude);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestHub = hub._id;
                }
            });
        }

        const newProduct = new Product({ 
            ...req.body, 
            farmer: req.user.id,
            nearestHub: nearestHub,
            initialQuantity: req.body.quantityAvailable,
            verificationStatus: 'pending' // Force pending on creation
        });
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});


router.put('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product || product.farmer.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
        const updated = await Product.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product || product.farmer.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
