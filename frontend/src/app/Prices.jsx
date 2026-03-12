import React, { useState, useEffect } from 'react';
import "../assets/styles/LivePrices.css"; 

const Prices = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAllPrices = async () => {
            try {
                // Fetch up to 100 records for the "all prices" view
                const response = await fetch("http://localhost:3000/api/market/prices?limit=100");
                
                // Fetch explicit commodities
                const mangoRes = await fetch("http://localhost:3000/api/market/prices?commodity=Mango&limit=1");
                const melonRes = await fetch("http://localhost:3000/api/market/prices?commodity=Water%20Melon&limit=1");
        
                let allRecords = [];

                if (response.ok) {
                    const data = await response.json();
                    if (data.records) allRecords = [...data.records];
                }
        
                if (mangoRes.ok) {
                    const data = await mangoRes.json();
                    if (data.records) allRecords = [...data.records, ...allRecords]; // Prepend for visibility
                }
        
                if (melonRes.ok) {
                    const data = await melonRes.json();
                    if (data.records) allRecords = [...data.records, ...allRecords]; // Prepend for visibility
                }

                if (allRecords.length > 0) {
                    const formattedPrices = allRecords.map((record, index) => ({
                        id: index + 1,
                        name: record.commodity,
                        price: record.modal_price ? Math.round(Number(record.modal_price) / 100) : "N/A", // Convert quintal to kg
                        unit: "kg",
                        location: `${record.market}, ${record.state}`,
                        updated: record.arrival_date || "Today",
                        trend: "stable", 
                    }));

                    // Deduplicate by name and location
                    const uniquePrices = [];
                    const seen = new Set();
                    for (const item of formattedPrices) {
                        const key = `${item.name}-${item.location}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniquePrices.push(item);
                        }
                    }

                    setPrices(uniquePrices);
                }
            } catch (error) {
                console.error("Error loading live prices:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllPrices();
    }, []);

    const filteredPrices = prices.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '4rem 5%', minHeight: '60vh', background: 'var(--bg-main)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', marginBottom: '1rem' }}>Live Market Prices</h1>
                <p style={{ color: 'var(--text-light)', fontSize: '1.2rem' }}>Comprehensive real-time pricing data across all regions.</p>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                <input 
                    type="text" 
                    placeholder="Search by product name or location..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 20px',
                        fontSize: '1.1rem',
                        borderRadius: '30px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)", fontSize: "1.2rem" }}>
                    Loading market data...
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '800px', margin: '0 auto' }}>
                    {filteredPrices.length > 0 ? (
                        filteredPrices.map((item) => (
                            <div key={item.id} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                background: 'white', 
                                padding: '20px', 
                                borderRadius: '12px', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                flexWrap: 'wrap',
                                gap: '15px'
                            }}>
                                <div style={{ flex: '1 1 200px' }}>
                                    <h3 style={{ fontSize: '1.3rem', color: 'var(--text-dark)', margin: '0 0 5px 0' }}>{item.name}</h3>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '0.9rem', margin: '0' }}>
                                        📍 {item.location}
                                    </p>
                                </div>

                                <div style={{ flex: '1 1 100px', textAlign: 'right' }}>
                                    <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0 0 5px 0' }}>
                                        ₹{item.price} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal' }}>/ {item.unit}</span>
                                    </p>
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0' }}>📅 {item.updated}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            No products found matching your search.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Prices;
