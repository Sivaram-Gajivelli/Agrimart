import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
    Package, AlertTriangle, CheckCircle, Clock, 
    ArrowRight, Info, BarChart3, MapPin, Layers
} from 'lucide-react';

const produceImages = import.meta.glob('../assets/images/produce/*.{png,jpg,jpeg,webp,svg}', { eager: true });

const imageMap = {};
for (const path in produceImages) {
    const filename = path.split('/').pop().toLowerCase();
    const nameWithoutExt = filename.split('.')[0];
    imageMap[nameWithoutExt] = produceImages[path].default || produceImages[path];
}

const getProductImage = (productName) => {
    if (!productName || productName.trim() === '') return null;
    const name = productName.trim().toLowerCase();
    const withDash = name.replace(/\s+/g, '-');
    const withUnderscore = name.replace(/\s+/g, '_');
    if (imageMap[withDash]) return imageMap[withDash];
    if (imageMap[withUnderscore]) return imageMap[withUnderscore];
    for (const key in imageMap) {
        if (name.length > 2 && key.length > 2) {
            if (name.includes(key) || key.includes(name)) return imageMap[key];
        }
    }
    return null;
};

const FarmerStock = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/api/products/my-products', { withCredentials: true });
            setProducts(res.data);
        } catch (error) {
            toast.error("Could not load inventory.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    if (loading) {
        return <div style={{ padding: '120px 5%', textAlign: 'center' }}><h2>Loading Stock Data...</h2></div>;
    }

    return (
        <div style={{ padding: '100px 5% 60px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ color: 'var(--primary-dark)', fontSize: '2.5rem', fontWeight: 800 }}>Harvest Stock Levels</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Real-time inventory tracking and storage distribution.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                    {products.map((product) => {
                        const stockPercent = Math.min((product.quantityAvailable / (product.initialQuantity || product.quantityAvailable || 1000)) * 100, 100);
                        const isLow = product.initialQuantity 
                            ? (product.quantityAvailable / product.initialQuantity) < 0.15 
                            : product.quantityAvailable < 15;

                        return (
                            <div key={product._id} className="glass-panel" style={{ borderRadius: '24px', padding: '24px' }}>
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                                        {getProductImage(product.productName) ? (
                                            <img src={getProductImage(product.productName)} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={24} opacity={0.3} /></div>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>{product.productName}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ 
                                                fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', 
                                                background: product.verificationStatus === 'verified' ? '#ecfdf5' : '#fffbeb',
                                                color: product.verificationStatus === 'verified' ? '#059669' : '#d97706'
                                            }}>
                                                {product.verificationStatus?.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{product.category}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-end' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Available Stock</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isLow ? '#ef4444' : 'var(--primary)' }}>
                                            {product.quantityAvailable} <small style={{ fontSize: '0.9rem', fontWeight: 400 }}>{product.unit}</small>
                                        </div>
                                    </div>
                                    
                                    {/* Custom Progress Bar */}
                                    <div style={{ height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{ 
                                            position: 'absolute', top: 0, left: 0, bottom: 0,
                                            width: `${stockPercent}%`, // Visual representation of availability
                                            background: isLow ? 'linear-gradient(90deg, #f87171, #ef4444)' : 'linear-gradient(90deg, #34d399, #10b981)',
                                            borderRadius: '6px', transition: 'width 1s ease'
                                        }} />
                                    </div>
                                    
                                    {isLow && (
                                        <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                            <AlertTriangle size={14} /> Low stock warning
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ background: 'white', width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                            <MapPin size={16} color="var(--primary)" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Assigned Storage Hub</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{product.nearestHub?.name || 'Distance Hub Assignment...'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FarmerStock;
