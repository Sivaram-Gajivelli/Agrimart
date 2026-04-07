import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
    Trash2, Clock, Package, 
    ArrowRight, MapPin, Layers, ShieldCheck,
    TrendingUp
} from 'lucide-react';
import StatusActionBar from '../components/StatusActionBar';

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

const MyProducts = () => {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [prodRes, orderRes] = await Promise.all([
                axios.get('/api/products/my-products', { withCredentials: true }),
                axios.get('/api/orders/farmer', { withCredentials: true })
            ]);
            setProducts(prodRes.data);
            setOrders(orderRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Could not load your inventory.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRemove = async (productId) => {
        if (!window.confirm("Are you sure you want to remove this property from your produce list?")) return;
        try {
            await axios.delete(`/api/products/${productId}`, { withCredentials: true });
            toast.success("Produce removed successfully");
            fetchData();
        } catch (error) {
            toast.error("Failed to remove produce");
        }
    };

    const handleDeliveryUpdate = async (productId, newStatus) => {
        try {
            await axios.put(`/api/user/product/${productId}/status`, { deliveryStatus: newStatus }, { withCredentials: true });
            toast.success(`Product marked as ${newStatus}`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update delivery status");
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '120px 5% 40px', minHeight: '100vh', background: 'var(--bg-main)', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--primary-dark)', fontWeight: 400 }}>Reviewing harvests...</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '100px 5% 60px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                
                {/* Compact Header Area */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', fontWeight: 800, marginBottom: '2px' }}>My Harvests</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Seamlessly manage your fresh farm produce lifecycle.</p>
                    </div>
                    <a href="/sell-produce" className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '0.85rem' }}>
                        + List New Produce
                    </a>
                </div>

                {products.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '50px 30px', textAlign: 'center' }}>
                        <Package size={40} color="#CBD5E1" style={{ marginBottom: '10px' }} />
                        <h2 style={{ color: 'var(--text-dark)', fontSize: '1.25rem' }}>No products found</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fresh harvests will appear here once listed.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {products.map((product) => {
                            const orderCount = orders.filter(o => o.items.some(i => i.product?._id === product._id)).length;
                            
                            return (
                                <div key={product._id} className="glass-panel" style={{ 
                                    padding: '0', borderRadius: '16px', overflow: 'hidden',
                                    border: '1px solid var(--border-color)', boxShadow: '0 4px 8px rgba(0,0,0,0.015)'
                                }}>
                                    <div style={{ display: 'flex', flexWrap: 'nowrap' }}>
                                        {/* Left: Image (Slightly Larger & Contain) */}
                                        <div style={{ width: '160px', height: '160px', minWidth: '160px', background: '#FFFFFF', position: 'relative', borderRight: '1px solid #f1f5f9' }}>
                                            {getProductImage(product.productName) ? (
                                                <img 
                                                    src={getProductImage(product.productName)} 
                                                    alt={product.productName} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} 
                                                />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1' }}>
                                                    <Package size={28} opacity={0.3} />
                                                </div>
                                            )}
                                            
                                            {/* Minimal Status Badge */}
                                            <div style={{ 
                                                position: 'absolute', top: '8px', left: '8px', 
                                                padding: '3px 8px', borderRadius: '6px', 
                                                background: product.verificationStatus === 'verified' ? '#16A34A' : '#F59E0B',
                                                color: 'white', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                            }}>
                                                {product.verificationStatus === 'verified' ? <ShieldCheck size={10} /> : <Clock size={10} />}
                                                {product.verificationStatus?.toUpperCase() || 'PND'}
                                            </div>

                                            {/* Prominent Quantity Badge */}
                                            <div style={{ 
                                                position: 'absolute', bottom: '8px', right: '8px', 
                                                padding: '4px 10px', borderRadius: '10px', 
                                                background: 'rgba(255, 255, 255, 0.95)', border: '1.5px solid var(--primary)',
                                                color: 'var(--primary-dark)', fontSize: '0.75rem', fontWeight: 900, 
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.05)', backdropFilter: 'blur(4px)'
                                            }}>
                                                <Layers size={14} color="var(--primary)" />
                                                {product.quantityAvailable} <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.7 }}>{product.unit}</span>
                                            </div>
                                        </div>

                                        {/* Right: Content Area (Compacted) */}
                                        <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{product.category}</span>
                                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dark)', margin: '1px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.productName}</h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} /> {product.manualLocation}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Layers size={12} /> {product.quantityAvailable} {product.unit}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>₹{product.pricePerKg}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>per {product.unit}</div>
                                                </div>
                                            </div>

                                            {/* Ultra Compact Status ActionBar */}
                                            <div style={{ marginTop: 'auto' }}>
                                                <StatusActionBar 
                                                    currentStatus={product.deliveryStatus || 'Listed'} 
                                                    onUpdate={(status) => handleDeliveryUpdate(product._id, status)}
                                                    isMini={true}
                                                />
                                            </div>

                                            {/* Minimal Actions Footer */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f8fafc' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {orderCount > 0 && (
                                                        <a href="/orders-received" style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                                                            <TrendingUp size={12} /> {orderCount} customer order(s)
                                                        </a>
                                                    )}
                                                </div>
                                                {(!['Picked Up', 'At Hub', 'Delivered'].includes(product.deliveryStatus)) ? (
                                                    <button 
                                                        onClick={() => handleRemove(product._id)}
                                                        style={{ 
                                                            background: 'transparent', border: '1px solid #fee2e2', color: '#EF4444', 
                                                            padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                                                            cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                                    >
                                                        <Trash2 size={12} /> Remove Produce
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                                                        Active Logistics - Deletion Disabled
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyProducts;
