import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
// Import all images from the produce directory eagerly
const produceImages = import.meta.glob('../assets/images/produce/*.{png,jpg,jpeg,webp,svg}', { eager: true });

// Create a map of normalized filenames to their imported URLs
const imageMap = {};
for (const path in produceImages) {
    const filename = path.split('/').pop().toLowerCase();
    const nameWithoutExt = filename.split('.')[0];
    imageMap[nameWithoutExt] = produceImages[path].default || produceImages[path];
}

const CATEGORY_MAPPING = {
    'Vegetables': ['tomato', 'potato', 'onion', 'cabbage', 'carrot', 'spinach', 'brinjal', 'eggplant', 'garlic', 'ginger', 'peas', 'cucumber', 'pumpkin', 'radish', 'capsicum', 'cauliflower', 'broccoli', 'beans'],
    'Fruits': ['apple', 'banana', 'mango', 'orange', 'grapes', 'papaya', 'watermelon', 'pomegranate', 'guava', 'pineapple', 'lemon', 'berry', 'cherry', 'strawberry', 'blueberry', 'kiwi'],
    'Grains & Pulses': ['wheat', 'rice', 'paddy', 'maize', 'corn', 'millet', 'bajra', 'jowar', 'dal', 'lentil', 'chickpea', 'gram', 'soybean', 'mustard', 'oats', 'barley'],
    'Spices': ['chilli', 'pepper', 'turmeric', 'coriander', 'cumin', 'clove', 'cardamom', 'cinnamon', 'nutmeg', 'fennel', 'saffron', 'garlic', 'ginger']
};

const guessCategory = (name) => {
    let lowerName = name.trim().toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_MAPPING)) {
        if (keywords.some(kw => lowerName.includes(kw))) {
            return cat;
        }
    }
    return '';
};

const SellProduce = () => {
    const [marketPrices, setMarketPrices] = useState({ min: null, max: null, modal: null, fetching: false, error: null });

    const [formData, setFormData] = useState({
        productName: '',
        category: '',
        description: '',
        pricePerKg: '',
        quantityAvailable: '',
        unit: 'kg',
        locationType: 'manual', // 'manual' or 'current'
        manualLocation: '',
    });

    const categories = ['Vegetables', 'Fruits', 'Grains & Pulses', 'Spices', 'Others'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePriceBlur = (e) => {
        const adjustedPrices = getAdjustedPrices();
        if (adjustedPrices) {
            let val = parseFloat(formData.pricePerKg);
            if (!isNaN(val)) {
                if (val < adjustedPrices.min) {
                    toast.warning(`Price increased to minimum allowed (₹${adjustedPrices.min})`);
                    setFormData(prev => ({ ...prev, pricePerKg: adjustedPrices.min.toString() }));
                } else if (val > adjustedPrices.max) {
                    toast.warning(`Price decreased to maximum allowed (₹${adjustedPrices.max})`);
                    setFormData(prev => ({ ...prev, pricePerKg: adjustedPrices.max.toString() }));
                }
            }
        }
    };

    useEffect(() => {
        const fetchMarketPrices = async () => {
            if (!formData.productName || formData.productName.trim().length < 3) {
                setMarketPrices({ min: null, max: null, modal: null, fetching: false, error: null });
                return;
            }

            setMarketPrices(prev => ({ ...prev, fetching: true, error: null }));

            try {
                // Basic plural normalization for the API
                let searchCommodity = formData.productName.trim().toLowerCase();
                if (searchCommodity.endsWith('atoes')) {
                    searchCommodity = searchCommodity.slice(0, -2); // tomatoes -> tomato, potatoes -> potato
                } else if (searchCommodity.endsWith('oes') && !searchCommodity.endsWith('shoes')) {
                    searchCommodity = searchCommodity.slice(0, -2); // mangoes -> mango
                } else if (searchCommodity.endsWith('ies')) {
                    searchCommodity = searchCommodity.slice(0, -3) + 'y'; // berries -> berry
                } else if (searchCommodity.endsWith('s') && !searchCommodity.endsWith('ss')) {
                    searchCommodity = searchCommodity.slice(0, -1); // onions -> onion, apples -> apple
                }

                // Fetch securely from our Express backend instead of directly from frontend
                const apiUrl = `/api/market/prices?commodity=${encodeURIComponent(searchCommodity)}`;

                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error("Backend API returned an error");

                const data = await response.json();

                if (data && data.records && data.records.length > 0) {
                    let min = Infinity;
                    let max = -Infinity;
                    let modalSum = 0;
                    let modalCount = 0;

                    data.records.forEach(record => {
                        if (record.min_price && record.min_price < min) min = record.min_price;
                        if (record.max_price && record.max_price > max) max = record.max_price;
                        if (record.modal_price) {
                            modalSum += record.modal_price;
                            modalCount++;
                        }
                    });

                    if (min !== Infinity && max !== -Infinity) {
                        const modal = modalCount > 0 ? (modalSum / modalCount) : ((min + max) / 2);
                        setMarketPrices({ min, max, modal, fetching: false, error: null });
                    } else {
                        setMarketPrices({ min: null, max: null, modal: null, fetching: false, error: 'Could not determine price range.' });
                    }
                } else {
                    setMarketPrices({ min: null, max: null, modal: null, fetching: false, error: 'No market data found for this product.' });
                }

            } catch (error) {
                console.error("Error fetching market prices:", error);
                setMarketPrices({ min: null, max: null, modal: null, fetching: false, error: 'Failed to fetch market prices.' });
            }
        };

        const timeoutId = setTimeout(() => {
            fetchMarketPrices();
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [formData.productName]);

    const getAdjustedPrices = () => {
        if (marketPrices.modal === null) return null;

        let multiplier = 1; // Base is quintal
        if (formData.unit === 'kg') multiplier = 0.01;
        else if (formData.unit === 'ton') multiplier = 10;
        else if (formData.unit === 'pieces') return null; // Cannot convert pieces to weight reliably

        const adjustedModal = marketPrices.modal * multiplier;

        return {
            min: parseFloat((adjustedModal * 0.8).toFixed(2)),
            max: parseFloat((adjustedModal * 1.2).toFixed(2)),
            modal: parseFloat(adjustedModal.toFixed(2))
        };
    };

    // Auto-populate price when modal price is updated and a multiplier is evaluated
    useEffect(() => {
        const adjustedPrices = getAdjustedPrices();
        if (adjustedPrices && adjustedPrices.modal) {
            setFormData(prev => ({
                ...prev,
                pricePerKg: adjustedPrices.modal.toString()
            }));
        }
    }, [marketPrices.modal, formData.unit]);

    // Auto-match category
    const autoCategory = guessCategory(formData.productName);
    useEffect(() => {
        if (autoCategory) {
            setFormData(prev => ({ ...prev, category: autoCategory }));
        } else if (!formData.productName) {
            setFormData(prev => ({ ...prev, category: '' }));
        }
    }, [autoCategory, formData.productName]);

    const handleGetCurrentLocation = async () => {
        if (navigator.geolocation) {
            toast.info("Fetching location...");
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();

                        // Extract a readable address
                        const address = data.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;

                        setFormData(prev => ({
                            ...prev,
                            locationType: 'current',
                            manualLocation: address
                        }));
                        toast.success("Location fetched successfully!");
                    } catch (error) {
                        toast.error("Failed to get address. Using coordinates.");
                        setFormData(prev => ({
                            ...prev,
                            locationType: 'current',
                            manualLocation: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
                        }));
                    }
                },
                (error) => {
                    toast.error("Unable to get location. Please enter manually.");
                    setFormData(prev => ({ ...prev, locationType: 'manual' }));
                }
            );
        } else {
            toast.error("Geolocation is not supported by your browser");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Price validation against market range
        const adjustedPrices = getAdjustedPrices();
        if (adjustedPrices) {
            const enteredPrice = parseFloat(formData.pricePerKg);
            if (isNaN(enteredPrice)) {
                toast.error("Please enter a valid price.");
                return;
            }
            if (enteredPrice < adjustedPrices.min || enteredPrice > adjustedPrices.max) {
                toast.error(`Price must be between ₹${adjustedPrices.min} and ₹${adjustedPrices.max} per ${formData.unit} according to market rates.`);
                return;
            }
        } else if (!marketPrices.error && marketPrices.fetching) {
            toast.error("Please wait for market prices to fetch.");
            return;
        } else if (!formData.productName) {
            toast.error("Please enter a product name first.");
            return;
        } else if (!formData.pricePerKg || isNaN(parseFloat(formData.pricePerKg))) {
            toast.error("Please enter a valid price.");
            return;
        }

        // Make sure we have a category assigned (either auto-detected or explicitly set)
        const finalCategory = autoCategory || formData.category;
        if (!finalCategory) {
            toast.error("Could not determine product category. Please try a different product name.");
            return;
        }

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Includes HTTP-only cookies like auth token
                body: JSON.stringify({
                    productName: formData.productName,
                    category: finalCategory,
                    description: formData.description,
                    pricePerKg: formData.pricePerKg,
                    quantityAvailable: formData.quantityAvailable,
                    unit: formData.unit,
                    locationType: formData.locationType,
                    manualLocation: formData.manualLocation
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to list product.");
            }

            console.log("Submitting Produce Data:", formData);
            toast.success("Product listed successfully!");

            // Reset form after standard submission
            setFormData({
                productName: '',
                category: '',
                description: '',
                pricePerKg: '',
                quantityAvailable: '',
                unit: 'kg',
                locationType: 'manual',
                manualLocation: '',
            });

        } catch (error) {
            console.error("Error submitting product:", error);
            toast.error(error.message || "Failed to submit product.");
        }
    };

    // Advanced image matching logic
    const getProductImage = (productName) => {
        if (!productName || productName.trim() === '') return null;
        
        // Normalize: lowercase, trim, and replace spaces with both dash and underscore
        const name = productName.trim().toLowerCase();
        const withDash = name.replace(/\s+/g, '-');
        const withUnderscore = name.replace(/\s+/g, '_');
        
        // Check exact matches
        if (imageMap[withDash]) return imageMap[withDash];
        if (imageMap[withUnderscore]) return imageMap[withUnderscore];
        
        // Check plural/singular matches
        const checkPlural = (n) => {
            if (imageMap[n]) return imageMap[n];
            if (n.endsWith('s') && imageMap[n.slice(0, -1)]) return imageMap[n.slice(0, -1)];
            if (imageMap[n + 's']) return imageMap[n + 's'];
            return null;
        };
        
        let res = checkPlural(withDash) || checkPlural(withUnderscore);
        if (res) return res;

        // Substring matching as fallback
        for (const key in imageMap) {
            if (name.length > 2 && key.length > 2) {
                if (name.includes(key) || key.includes(name)) return imageMap[key];
            }
        }
        return null;
    };

    const imageSrc = getProductImage(formData.productName);
    const adjustedPrices = getAdjustedPrices();

    return (
        <div style={{ padding: '120px 5% 40px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <h1 style={{ color: 'var(--primary-dark)', marginBottom: '30px', textAlign: 'center', fontSize: '2rem' }}>Sell Produce</h1>

                <form onSubmit={handleSubmit}>
                    {/* Section 1: Basic Information */}
                    <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>1</span>
                            Basic Information
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Product Name</label>
                                <input
                                    type="text"
                                    name="productName"
                                    value={formData.productName}
                                    onChange={handleChange}
                                    placeholder="e.g., Tomatoes, Wheat, Apples"
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Category</label>
                                <div style={{
                                    width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem',
                                    backgroundColor: '#f8fafc', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', minHeight: '48px'
                                }}>
                                    {autoCategory || formData.category || <span style={{ color: '#94a3b8' }}>Auto-detected from product name</span>}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Description <span style={{ color: '#94a3b8', fontSize: '0.9em', fontWeight: 'normal' }}>(Optional)</span></label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe your produce (Optional)"
                                    rows="4"
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', resize: 'vertical' }}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Pricing & Stock */}
                    <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>2</span>
                            Pricing & Stock
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>
                                    Price (₹) {(!formData.productName || marketPrices.fetching) && <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>(Enter product name first)</span>}
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        name="pricePerKg"
                                        value={formData.pricePerKg}
                                        onChange={(e) => {
                                            let val = e.target.value;
                                            const adjustedPrices = getAdjustedPrices();
                                            if (adjustedPrices && val !== '') {
                                                let num = parseFloat(val);
                                                if (!isNaN(num) && num > adjustedPrices.max) {
                                                    toast.warning(`Price corrected to max (₹${adjustedPrices.max})`);
                                                    val = adjustedPrices.max.toString();
                                                }
                                            }
                                            handleChange({ target: { name: 'pricePerKg', value: val } });
                                        }}
                                        onBlur={handlePriceBlur}
                                        placeholder="Ask price"
                                        min={adjustedPrices ? adjustedPrices.min : "0"}
                                        step="0.01"
                                        required
                                        disabled={!formData.productName || marketPrices.fetching}
                                        style={{
                                            flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '8px 0 0 8px', fontSize: '1rem',
                                            backgroundColor: (!formData.productName || marketPrices.fetching) ? '#f1f5f9' : 'white',
                                            cursor: (!formData.productName || marketPrices.fetching) ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <span style={{ padding: '12px', background: '#f5f5f5', border: '1px solid #ccc', borderLeft: 'none', borderRadius: '0 8px 8px 0', color: '#555' }}>
                                        per {formData.unit}
                                    </span>
                                </div>
                                {(() => {
                                    if (adjustedPrices && formData.pricePerKg) {
                                        const p = parseFloat(formData.pricePerKg);
                                        if (!isNaN(p) && p < adjustedPrices.min) {
                                            return <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '6px', fontWeight: '500' }}>⚠️ Minimum allowed is ₹{adjustedPrices.min}. It will auto-correct on tab.</div>;
                                        }
                                    }
                                    return null;
                                })()}
                                {marketPrices.fetching && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>Fetching current market prices...</div>}
                                {marketPrices.error && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '6px' }}>{marketPrices.error}</div>}
                                {!marketPrices.fetching && adjustedPrices && (
                                    <div style={{ padding: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginTop: '10px' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>
                                            📊 Market Trends (per {formData.unit})
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', fontSize: '0.85rem', color: '#15803d' }}>
                                            <div>Min: <strong>₹{adjustedPrices.min}</strong></div>
                                            <div>Max: <strong>₹{adjustedPrices.max}</strong></div>
                                            <div>Suggested: <strong style={{ color: 'var(--primary-dark)' }}>₹{adjustedPrices.modal}</strong></div>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '6px 0 0 0', fontStyle: 'italic' }}>
                                            We've auto-filled the suggested price. You can adjust it within the min and max limits.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dark)', fontWeight: '500' }}>Quantity Available</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="number"
                                        name="quantityAvailable"
                                        value={formData.quantityAvailable}
                                        onChange={handleChange}
                                        placeholder="Stock"
                                        min="1"
                                        required
                                        disabled={!formData.productName}
                                        style={{
                                            flex: 2, padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem',
                                            backgroundColor: !formData.productName ? '#f1f5f9' : 'white',
                                            cursor: !formData.productName ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <select
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleChange}
                                        disabled={!formData.productName}
                                        style={{
                                            flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem',
                                            backgroundColor: !formData.productName ? '#f1f5f9' : 'white',
                                            cursor: !formData.productName ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <option value="kg">kg</option>
                                        <option value="quintal">quintal</option>
                                        <option value="ton">ton</option>
                                        <option value="pieces">pieces</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Summary of Price x Quantity */}
                        {formData.pricePerKg && formData.quantityAvailable && (
                            <div style={{ marginTop: '20px', padding: '15px', background: 'var(--primary-light)', borderRadius: '8px', color: 'var(--primary-dark)', fontWeight: 'bold' }}>
                                Total Value: ₹{(parseFloat(formData.pricePerKg) * parseFloat(formData.quantityAvailable)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Location */}
                    <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>3</span>
                            Location
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="locationType"
                                        value="manual"
                                        checked={formData.locationType === 'manual'}
                                        onChange={handleChange}
                                    />
                                    Enter manually
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="locationType"
                                        value="current"
                                        checked={formData.locationType === 'current'}
                                        onChange={handleChange}
                                    />
                                    Use current location
                                </label>
                            </div>

                            {formData.locationType === 'manual' ? (
                                <input
                                    type="text"
                                    name="manualLocation"
                                    value={formData.manualLocation}
                                    onChange={handleChange}
                                    placeholder="Enter farm address, village, or pincode"
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem' }}
                                />
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        name="manualLocation"
                                        value={formData.manualLocation}
                                        onChange={handleChange}
                                        placeholder="Location coordinates will appear here"
                                        required
                                        readOnly
                                        style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', background: '#f9f9f9' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGetCurrentLocation}
                                        className="btn btn-secondary"
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        Fetch Location
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Image Preview Box */}
                    <div style={{ marginBottom: '30px', padding: '20px', background: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1' }}>
                            {imageSrc ? (
                                <img
                                    src={imageSrc}
                                    alt={formData.productName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '10px' }}>
                                    {formData.productName ? 'Image not found' : 'Image Preview'}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Product Image</h4>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                                An image will be automatically selected based on the your product name (e.g., tomatoes.jpg).
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '15px', fontSize: '1.2rem', marginTop: '10px' }}
                    >
                        List Product for Sale
                    </button>
                </form>
            </div >
        </div >
    );
};

export default SellProduce;

