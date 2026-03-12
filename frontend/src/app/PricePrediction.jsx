import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Glob import all images from assets (reusing logic from MyProducts)
const produceImages = import.meta.glob('../assets/images/*.{jpg,jpeg,png,webp}', { eager: true });

const imageMap = Object.keys(produceImages).reduce((acc, path) => {
    const filename = path.split('/').pop().split('.')[0].toLowerCase();
    acc[filename] = produceImages[path].default;
    return acc;
}, {});

const getProductImage = (productName) => {
    const defaultImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23a0aec0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'%3E%3C/path%3E%3Cpath d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'%3E%3C/path%3E%3C/svg%3E";
    if (!productName) return defaultImage;
    const nameStr = String(productName).toLowerCase().trim();
    // Use the image map if available
    for (const [key, value] of Object.entries(imageMap)) {
        if (key.includes(nameStr) || nameStr.includes(key)) {
            return value;
        }
    }
    return defaultImage;
};

const PricePrediction = () => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                // Fetch ML Multipliers
                const predResponse = await fetch("http://localhost:3000/api/predictions");
                if (!predResponse.ok) throw new Error("Failed to fetch predictions.");
                const predData = await predResponse.json();

                // Fetch Live API Prices
                const liveResponse = await fetch("http://localhost:3000/api/market/prices?limit=100");
                const mangoRes = await fetch("http://localhost:3000/api/market/prices?commodity=Mango&limit=5");
                const melonRes = await fetch("http://localhost:3000/api/market/prices?commodity=Water%20Melon&limit=5");
                const potatoRes = await fetch("http://localhost:3000/api/market/prices?commodity=Potato&limit=25");

                let liveRecords = [];
                if (liveResponse.ok) {
                    const data = await liveResponse.json();
                    if (data.records) liveRecords = [...data.records];
                }
                if (mangoRes.ok) {
                    const data = await mangoRes.json();
                    if (data.records) liveRecords = [...liveRecords, ...data.records];
                }
                if (melonRes.ok) {
                    const data = await melonRes.json();
                    if (data.records) liveRecords = [...liveRecords, ...data.records];
                }
                if (potatoRes.ok) {
                    const data = await potatoRes.json();
                    if (data.records) liveRecords = [...liveRecords, ...data.records];
                }

                let livePricesMap = {};
                if (liveRecords.length > 0) {
                    const priceLists = {};
                    liveRecords.forEach(record => {
                        const name = record.commodity.toLowerCase();
                        const priceKg = Number(record.modal_price) / 100;
                        if (!priceLists[name]) priceLists[name] = [];
                        priceLists[name].push(priceKg);
                    });

                    for (const name in priceLists) {
                        const arr = priceLists[name];
                        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
                        livePricesMap[name] = Math.max(1, avg); // use exact decimal average
                    }
                }
                
                // Format the data into grouped 7-day arrays
                const grouped = {};
                predData.forEach(item => {
                    const vegNameBase = item.Vegetable.toLowerCase();
                    let prettyName = item.Vegetable.replace(/_/g, ' ');
                    prettyName = prettyName.charAt(0).toUpperCase() + prettyName.slice(1);

                    if (!grouped[item.Vegetable]) {
                        let base = 40; 
                        for (const [key, val] of Object.entries(livePricesMap)) {
                            if (key.includes(vegNameBase) || vegNameBase.includes(key)) {
                                base = val;
                                break;
                            }
                        }
                        grouped[item.Vegetable] = {
                            id: item.Vegetable,
                            name: prettyName,
                            forecast: [],
                            runningPrice: base
                        };
                    }
                    
                    const group = grouped[item.Vegetable];

                    const multiplier = parseFloat(item['Predicted Multiplier']);
                    const rangeMinMult = parseFloat(item['Range Min Multiplier']);
                    const rangeMaxMult = parseFloat(item['Range Max Multiplier']);
                    const confidence = item['Confidence'];
                    
                    const current = group.runningPrice;
                    const predicted = current * multiplier;
                    const rangeMin = current * rangeMinMult;
                    const rangeMax = current * rangeMaxMult;
                    
                    group.runningPrice = predicted; // compound for tomorrow loop

                    let trendStr = 'stable';
                    if (predicted > current) trendStr = 'up';
                    if (predicted < current) trendStr = 'down';

                    const percentChange = current === 0 ? 0 : ((predicted - current) / current) * 100;

                    const predObj = {
                        date: item.Date,
                        current: current.toFixed(2),
                        predicted: predicted.toFixed(2),
                        rangeMin: isNaN(rangeMin) ? predicted.toFixed(2) : rangeMin.toFixed(2),
                        rangeMax: isNaN(rangeMax) ? predicted.toFixed(2) : rangeMax.toFixed(2),
                        confidence: confidence || "Medium",
                        trend: trendStr,
                        trendPercent: Math.abs(percentChange).toFixed(1) + '%'
                    };

                    group.forecast.push(predObj);
                });

                // Convert to array and get primary prediction (day 1)
                const formatted = Object.values(grouped).map(group => {
                    const firstDay = group.forecast[0];
                    return {
                        ...group,
                        ...firstDay // spread primary day properties for easy access on main card
                    };
                });

                setPredictions(formatted);
            } catch (error) {
                console.error("Error formatting predictions:", error);
                toast.error("Failed to load AI predictions.");
            } finally {
                setLoading(false);
            }
        };

        fetchPredictions();
    }, []);

    const getTrendColor = (trend) => {
        switch(trend) {
            case 'up': return '#10b981'; // green
            case 'down': return '#ef4444'; // red
            default: return '#64748b'; // slate
        }
    }

    const getTrendIcon = (trend) => {
        switch(trend) {
            case 'up': return '▲';
            case 'down': return '▼';
            default: return '—';
        }
    }

    return (
        <div style={{ padding: '4rem 5%', minHeight: '80vh', background: 'var(--bg-main)' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', marginBottom: '1rem' }}>AI Price Predictions</h1>
                <p style={{ color: 'var(--text-light)', fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto' }}>
                    Stay ahead of the market. Our Random Forest AI analyzes historical trends to predict tomorrow's modal prices, helping you price your produce strategically.
                </p>
                <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '1rem' }}>
                    Last updated: {new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)', fontSize: '1.2rem' }}>
                    Loading AI predictions...
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                    gap: '24px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    {predictions.map(pred => (
                        <div key={pred.id} onClick={() => setSelectedProduct(pred)} style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                <img 
                                    src={getProductImage(pred.id)} 
                                    alt={pred.name} 
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        background: '#f8fafc'
                                    }}
                                />
                                <div>
                                    <h3 style={{ fontSize: '1.4rem', color: 'var(--text-dark)', margin: '0 0 4px 0' }}>{pred.name}</h3>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                                        Next Day: {pred.date}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <div>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 4px 0' }}>Current Price</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-dark)', margin: 0 }}>₹{pred.current}</p>
                                </div>

                                <div style={{ textAlign: 'center', padding: '0 10px', color: '#cbd5e1' }}>
                                    →
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 4px 0' }}>Predicted Price</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                        <p style={{ fontSize: '1.5rem', fontWeight: '900', color: getTrendColor(pred.trend), margin: 0 }}>₹{pred.predicted}</p>
                                        <span style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 'auto', 
                                            padding: '2px 8px',
                                            height: '24px', 
                                            borderRadius: '12px', 
                                            background: `${getTrendColor(pred.trend)}20`,
                                            color: getTrendColor(pred.trend),
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            gap: '4px'
                                        }}>
                                            <span>{getTrendIcon(pred.trend)}</span>
                                            <span>{pred.trendPercent}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '15px 0 0 0', borderTop: '1px solid #f1f5f9', marginTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Prediction confidence:</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: pred.confidence === 'High' ? '#10b981' : pred.confidence === 'Medium' ? '#f59e0b' : '#ef4444' }}>{pred.confidence}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Expected range:</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-dark)' }}>₹{pred.rangeMin} – ₹{pred.rangeMax}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedProduct && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '100px 20px 20px 20px'
                }} onClick={() => setSelectedProduct(null)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '800px',
                        width: '100%',
                        maxHeight: 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <img src={getProductImage(selectedProduct.id)} alt={selectedProduct.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', background: '#f8fafc' }} />
                                <div>
                                    <h2 style={{ fontSize: '2rem', margin: '0 0 5px 0', color: 'var(--text-dark)' }}>{selectedProduct.name}</h2>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>7 Day Market Forecast Dashboard</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProduct(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', transition: 'background 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gap: '15px' }}>
                            {selectedProduct.forecast.map((day, index) => (
                                <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: index === 0 ? '#f8fafc' : 'white' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem' }}>Date {index === 0 && <span style={{ marginLeft: '10px', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Tomorrow</span>}</p>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-dark)' }}>{day.date}</p>
                                    </div>
                                    <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                        <div>
                                            <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem' }}>Model Prediction</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <p style={{ margin: 0, fontWeight: '900', fontSize: '1.4rem', color: getTrendColor(day.trend) }}>₹{day.predicted}</p>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', color: getTrendColor(day.trend), background: `${getTrendColor(day.trend)}20`, padding: '4px 8px', borderRadius: '8px' }}>
                                                    <span>{getTrendIcon(day.trend)}</span> {day.trendPercent}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                                        <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.9rem' }}>Expected Range & Confidence</p>
                                        <p style={{ margin: '0 0 5px 0', fontSize: '1rem', fontWeight: '600', color: 'var(--text-dark)' }}>₹{day.rangeMin} – ₹{day.rangeMax}</p>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block', padding: '2px 0', color: day.confidence === 'High' ? '#10b981' : day.confidence === 'Medium' ? '#f59e0b' : '#ef4444' }}>{day.confidence} Confidence</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricePrediction;
