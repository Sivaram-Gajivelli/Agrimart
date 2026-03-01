import React from 'react';
import LivePrices from '../components/LivePrices';

const FarmerHome = () => {
    return (
        <>
            {/* Farmer Dashboard Header View */}
            <div style={{ paddingTop: '100px', paddingBottom: '40px', textAlign: 'center', background: 'var(--primary-dark)', color: 'white' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Farmer Portal</h1>
                <p style={{ opacity: 0.9 }}>Manage your crops, track active listings, and stay updated on market trends.</p>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <button className="btn btn-primary" style={{ background: 'var(--secondary)', color: 'white' }}>+ Add New Crop</button>
                    <button className="btn btn-secondary" style={{ background: 'transparent', border: '2px solid white' }}>View My Sales</button>
                </div>
            </div>

            {/* Market Prices Overview */}
            <div style={{ padding: '40px 5%', background: 'var(--bg-main)' }}>
                <h2 style={{ color: 'var(--primary)', marginBottom: '20px', textAlign: 'center' }}>Current Market Trends</h2>
                <LivePrices />
            </div>
        </>
    );
};

export default FarmerHome;
