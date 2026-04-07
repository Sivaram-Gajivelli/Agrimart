import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
    ShoppingBag, User, Phone, Mail, MapPin, 
    Calendar, CheckCircle, Clock, Package,
    ArrowRight
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

const OrdersReceived = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/orders/farmer', { withCredentials: true });
            setOrders(res.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Could not load your orders.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '120px 5% 40px', minHeight: '100vh', background: 'var(--bg-main)', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--primary-dark)' }}>Loading your orders...</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '100px 5% 60px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ color: 'var(--primary-dark)', fontSize: '2.5rem', fontWeight: 800 }}>Order History</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Review details of all purchases made for your produce.</p>
                </div>

                {orders.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '24px' }}>
                        <ShoppingBag size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
                        <h3 style={{ color: 'var(--text-dark)' }}>No orders yet</h3>
                        <p style={{ color: 'var(--text-muted)' }}>When customers buy your products, they will appear here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        {orders.map((order) => (
                            <div key={order._id} className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden', padding: '0' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                    
                                    {/* Order Main Info */}
                                    <div style={{ flex: '1 1 60%', padding: '30px', borderRight: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', marginBottom: '4px' }}>Order ID</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-dark)', fontFamily: 'monospace' }}>#{order._id.toString().slice(-8).toUpperCase()}</div>
                                            </div>
                                            <div style={{ 
                                                padding: '6px 14px', borderRadius: '12px', background: '#f0f9ff', color: '#0369a1', 
                                                fontSize: '0.85rem', fontWeight: 700, border: '1px solid #e0f2fe' 
                                            }}>
                                                {order.trackingStatus}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {order.items.map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '16px' }}>
                                                    <div style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                                                        {getProductImage(item.product?.productName) ? (
                                                            <img src={getProductImage(item.product?.productName)} alt={item.product?.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} opacity={0.3} /></div>}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{item.product?.productName || 'Unknown Product'}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.quantity} {item.product?.unit || 'kg'} @ ₹{item.pricePerKg}/unit</div>
                                                    </div>
                                                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{item.itemTotal}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ marginTop: '25px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Calendar size={16} /> Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    {/* Buyer Details Panel */}
                                    <div style={{ flex: '1 1 35%', padding: '30px', background: '#f8fafc' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <User size={20} color="var(--primary)" /> Customer Info
                                        </h3>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                    <User size={18} color="#64748b" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{order.buyer?.name || 'Guest'}</div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                    <Phone size={18} color="#64748b" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{order.buyer?.phone || 'N/A'}</div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                    <Mail size={18} color="#64748b" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, wordBreak: 'break-all' }}>{order.buyer?.email || 'N/A'}</div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                    <MapPin size={18} color="#64748b" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Address</div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: '1.4' }}>{order.deliveryAddress || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                                            {order.trackingStatus === 'Order Placed' ? (
                                                <button 
                                                    onClick={async () => {
                                                        try {
                                                            await axios.put(`/api/orders/${order._id}/status`, { trackingStatus: 'Processing' }, { withCredentials: true });
                                                            toast.success('Order marked as Processing. Delivery Agent has been assigned for pickup!');
                                                            fetchData();
                                                        } catch (err) {
                                                            toast.error(err.response?.data?.message || 'Failed to update order status');
                                                        }
                                                    }}
                                                    style={{ 
                                                        background: 'var(--primary)', color: 'white', padding: '10px 24px', 
                                                        borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, 
                                                        border: 'none', cursor: 'pointer', display: 'flex', 
                                                        alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                                        width: '100%', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Package size={16} /> Mark as Processing (Request Pickup)
                                                </button>
                                            ) : (
                                                <div style={{ color: '#64748b', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    <Clock size={16} /> Order is {order.trackingStatus}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersReceived;
