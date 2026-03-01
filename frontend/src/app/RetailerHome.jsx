import React from 'react';
import LivePrices from '../components/LivePrices';
import ProductsSection from '../components/ProductsSection';

const RetailerHome = () => {
    return (
        <>
            <div style={{ paddingTop: '100px', paddingBottom: '40px', textAlign: 'center', background: 'var(--primary-dark)', color: 'white' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Retailer Portal</h1>
                <p style={{ opacity: 0.9 }}>Place bulk orders and analyze wholesale market prices.</p>
            </div>

            <div style={{ background: 'var(--bg-main)' }}>
                <LivePrices />
            </div>

            <div style={{ padding: '20px 0' }}>
                <h2 style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '2rem', marginTop: '20px' }}>Available Bulk Produce</h2>
                <ProductsSection />
            </div>
        </>
    );
};

export default RetailerHome;
