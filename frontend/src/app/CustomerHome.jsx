import React, { useState } from 'react';
import ProductsSection from '../components/ProductsSection';
import LivePrices from '../components/LivePrices';

// Mock trending products for display
const trendingProducts = [
    {
        name: "Organic Honey",
        price: 350,
        unit: "kg",
        producer: "Bee Farm",
        location: "Coorg, KA",
        image: "https://placehold.co/200x200/fff3e0/e65100?text=Honey"
    },
    {
        name: "Alphonso Mango",
        price: 800,
        unit: "dozen",
        producer: "Orchard",
        location: "Ratnagiri, MH",
        image: "https://placehold.co/200x200/fff3e0/e65100?text=Mango"
    },
    {
        name: "Cold Pressed Oil",
        price: 250,
        unit: "litre",
        producer: "Mill",
        location: "Erode, TN",
        image: "https://placehold.co/200x200/fff3e0/e65100?text=Oil"
    }
];

const CategoryCard = ({ label, active, onClick, image }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'var(--transition)',
            width: '110px'
        }}
    >
        <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: '#e0f2cb', /* Light green Amazon Fresh vibe */
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            border: active ? '3px solid var(--primary)' : 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <img src={image} alt={label} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
        </div>
        <span style={{
            fontWeight: '600',
            color: active ? 'var(--primary-dark)' : 'var(--text-dark)',
            fontSize: '0.9rem',
            textAlign: 'center',
            lineHeight: '1.2'
        }}>
            {label}
        </span>
    </div>
);

const CustomerHome = () => {
    const [activeFilter, setActiveFilter] = useState('Fresh vegetables');

    return (
        <>
            <div style={{ paddingTop: '100px', paddingBottom: '40px', textAlign: 'center', background: 'var(--primary-dark)', color: 'white' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Customer Portal</h1>
                <p style={{ opacity: 0.9 }}>Explore fresh produce directly from farmers and manage your orders.</p>
            </div>

            {/* Fresh Categories (Amazon Fresh Style Circular Layout) */}
            <div style={{ padding: '30px 5%', background: 'white' }}>
                <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
                    <CategoryCard
                        label="Fresh vegetables"
                        image="https://placehold.co/150x150/transparent/2f7d32?text=🥬"
                        active={activeFilter === 'Fresh vegetables'}
                        onClick={() => setActiveFilter('Fresh vegetables')}
                    />
                    <CategoryCard
                        label="Fresh fruits"
                        image="https://placehold.co/150x150/transparent/2f7d32?text=🍎"
                        active={activeFilter === 'Fresh fruits'}
                        onClick={() => setActiveFilter('Fresh fruits')}
                    />
                    <CategoryCard
                        label="Atta, rice & grains"
                        image="https://placehold.co/150x150/transparent/2f7d32?text=🌾"
                        active={activeFilter === 'Atta, rice & grains'}
                        onClick={() => setActiveFilter('Atta, rice & grains')}
                    />
                    <CategoryCard
                        label="Dals & pulses"
                        image="https://placehold.co/150x150/transparent/2f7d32?text=🥣"
                        active={activeFilter === 'Dals & pulses'}
                        onClick={() => setActiveFilter('Dals & pulses')}
                    />
                </div>
            </div>

            {/* Featured Products (Using existing ProductsSection) */}
            <div style={{ padding: '20px 0', background: 'var(--bg-main)' }}>
                {/* We pass the active filter to ProductsSection (which we will update to accept it) */}
                <ProductsSection activeFilter={activeFilter} />
            </div>

            {/* Trending Products (Dense Layout) */}
            <div style={{ padding: '30px 5%', background: 'white' }}>
                <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem', marginBottom: '20px' }}>Trending Now</h2>
                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px' }}>
                    {trendingProducts.map((product, idx) => (
                        <div key={idx} style={{ flex: '0 0 auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', width: '200px', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                            <img src={product.image} alt={product.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '10px' }} />
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 5px 0' }}>{product.name}</h3>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{product.location} • {product.producer}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary-dark)' }}>₹{product.price}/{product.unit}</span>
                                <button style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>Add</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Price Comparison */}
            <div style={{ padding: '40px 0', background: 'var(--bg-main)' }}>
                <h2 style={{ textAlign: 'center', color: 'var(--primary-dark)', fontSize: '2rem', marginBottom: '10px' }}>💰 Price Comparison</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px' }}>Check daily wholesale market rates vs retail prices.</p>
                <LivePrices />
            </div>
        </>
    );
};

export default CustomerHome;
