import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../context/CartContext';
import ProductsSection from '../components/ProductsSection';
import LivePrices from '../components/LivePrices';
import fruitsAndVegs from '../assets/images/produce/fruitsandvegs.png';
import vegetables from '../assets/images/produce/vegetables.png';
import fruits from '../assets/images/produce/fruits.png';
import grainsAndPulses from '../assets/images/produce/grainsandpulses.png';
import { getMarketplaceProducts } from '../services/productService';

// Import images for trending section
const produceImages = import.meta.glob('../assets/images/produce/*.{png,jpg,jpeg,webp,svg}', { eager: true });
const imageMap = {};
for (const path in produceImages) {
    const filename = path.split('/').pop().toLowerCase();
    const nameWithoutExt = filename.split('.')[0];
    imageMap[nameWithoutExt] = produceImages[path].default || produceImages[path];
}

const getProductImage = (productName) => {
    if (!productName || productName.trim() === '') return null;
    let normalized = productName.trim().toLowerCase().replace(/\s+/g, '-');
    if (imageMap[normalized]) return imageMap[normalized];
    if (normalized.endsWith('s') && imageMap[normalized.slice(0, -1)]) return imageMap[normalized.slice(0, -1)];
    if (imageMap[normalized + 's']) return imageMap[normalized + 's'];
    for (const key in imageMap) {
        if (normalized.length > 2 && key.length > 2) {
            if (normalized.includes(key) || key.includes(normalized)) return imageMap[key];
        }
    }
    return null;
};

import PhoneticTerm from '../components/PhoneticTerm';

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
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('All Products');
    const [trendingProducts, setTrendingProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCartGlobal } = useCart();

    const handleAddToCart = async (product) => {
        await addToCartGlobal(product._id, 1);
    };

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const response = await getMarketplaceProducts();
                // Pick 5 random or first products as trending
                setTrendingProducts(response.data.slice(0, 5));
            } catch (error) {
                console.error("Error fetching trending products:", error);
            }
        };
        fetchTrending();
    }, []);

    return (
        <>
            <div style={{ paddingTop: '100px', paddingBottom: '40px', textAlign: 'center', background: 'var(--primary-dark)', color: 'white' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                    <PhoneticTerm english="Customer" te="కస్టమర్" hi="कस्टमर" ta="கஸ்டமர்" kn="ಕಸ್ಟಮರ್" ml="കസ്റ്റമർ" mr="कस्टमर" gu="કસ્ટમર" pa="ਕਸਟਮਰ" bn="কাস্টমার" or="କଷ୍ଟମର୍" as="কাষ্টমাৰ" /> <PhoneticTerm english="Portal" te="పోర్టల్" hi="पोर्टल" ta="போர்ட்டல்" kn="ಪೋರ್ಟಲ್" ml="പോർട്ടൽ" mr="पोर्टल" gu="પોર્ટલ" pa="ਪੋਰਟਲ" bn="পোর্টাল" or="ପୋର୍ଟାଲ୍" as="প’ৰ্টেল" />
                </h1>
                <p style={{ opacity: 0.9 }}>Explore fresh produce directly from farmers and manage your orders.</p>
            </div>

            {/* Fresh Categories (Amazon Fresh Style Circular Layout) */}
            <div style={{ padding: '30px 5%', background: 'white' }}>
                <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
                    <CategoryCard
                        label="All Products"
                        image={fruitsAndVegs}
                        active={activeFilter === 'All Products'}
                        onClick={() => setActiveFilter('All Products')}
                    />
                    <CategoryCard
                        label="Fresh vegetables"
                        image={vegetables}
                        active={activeFilter === 'Fresh vegetables'}
                        onClick={() => setActiveFilter('Fresh vegetables')}
                    />
                    <CategoryCard
                        label="Fresh fruits"
                        image={fruits}
                        active={activeFilter === 'Fresh fruits'}
                        onClick={() => setActiveFilter('Fresh fruits')}
                    />
                    <CategoryCard
                        label="Grains & Pulses"
                        image={grainsAndPulses}
                        active={activeFilter === 'Grains & Pulses'}
                        onClick={() => setActiveFilter('Grains & Pulses')}
                    />
                </div>
            </div>

            {/* Featured Products (Using existing ProductsSection) */}
            <div style={{ padding: '20px 0', background: 'var(--bg-main)' }}>
                <ProductsSection 
                    activeFilter={activeFilter} 
                    onSeeAll={(category) => navigate(`/products?category=${category}`)}
                />
            </div>

            {/* Trending Products (Dense Layout) */}
            <div style={{ padding: '30px 5%', background: 'white' }}>
                <h2 style={{ color: 'var(--primary-dark)', fontSize: '1.5rem', marginBottom: '20px' }}>Trending Now</h2>
                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px' }}>
                    {trendingProducts.map((product, idx) => (
                        <div key={idx} style={{ flex: '0 0 auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', width: '240px', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                            <img 
                                src={getProductImage(product.productName) || "https://placehold.co/200x200/fff3e0/e65100?text=" + product.productName} 
                                alt={product.productName} 
                                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '10px' }} 
                            />
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 5px 0' }}>{product.productName}</h3>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{product.manualLocation} • {product.farmer?.name || "Farmer"}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary-dark)' }}>₹{parseFloat(product.pricePerKg).toFixed(2)}/{product.unit}</span>
                                <button 
                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                                    onClick={() => handleAddToCart(product)}
                                >
                                    Add to cart
                                </button>
                            </div>
                        </div>
                    ))}
                    {trendingProducts.length === 0 && (
                         <div style={{ color: 'var(--text-muted)' }}>No trending products at the moment.</div>
                    )}
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
