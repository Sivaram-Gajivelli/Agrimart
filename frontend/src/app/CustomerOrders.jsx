import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

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

const CustomerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/orders/customer', {
                    withCredentials: true
                });
                setOrders(response.data);
            } catch (error) {
                console.error("Error fetching orders:", error);
                toast.error("Failed to load your orders");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchOrders();
        }
    }, [user]);

    if (loading) {
        return (
            <div style={{ padding: '120px 20px', textAlign: 'center', minHeight: '60vh' }}>
                <h2>Loading your orders...</h2>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '120px 20px 60px', minHeight: '80vh' }}>
            <h1 style={{ marginBottom: '30px', color: '#333' }}>Your Orders</h1>
            
            {(!orders || orders.length === 0) ? (
                <div style={{ background: '#f9f9f9', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '20px' }}>You haven't placed any orders yet.</p>
                    <Link to="/products" style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--primary)', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {orders.map(order => (
                        <div key={order._id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                            <div style={{ background: '#f0f2f2', padding: '15px 20px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#565959', textTransform: 'uppercase' }}>Order Placed</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: '#333' }}>{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#565959', textTransform: 'uppercase' }}>Total</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: '#B12704' }}>₹{order.totalPrice.toFixed(2)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#565959', textTransform: 'uppercase' }}>Order #</p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#333' }}>{order._id}</p>
                                </div>
                            </div>
                            
                            <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div style={{ width: '100px', height: '100px', flexShrink: 0, background: '#f9f9f9', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                    <img 
                                        src={getProductImage(order.product?.productName) || order.product?.image || "/placeholder.png"} 
                                        alt={order.product?.productName} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#007185', fontSize: '1.2rem' }}>
                                        {order.product?.productName || 'Unknown Product'}
                                    </h3>
                                    <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
                                        <strong>Farmer:</strong> {order.farmer?.name || 'Unknown'}
                                    </p>
                                    <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
                                        <strong>Quantity:</strong> {order.quantity} {order.product?.unit || 'kg'}
                                    </p>
                                    <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
                                        <strong>Status:</strong> <span style={{ 
                                            padding: '3px 8px', 
                                            borderRadius: '12px', 
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            background: order.trackingStatus === 'Completed' ? '#d4edda' : '#fff3cd',
                                            color: order.trackingStatus === 'Completed' ? '#155724' : '#856404',
                                        }}>
                                            {order.trackingStatus || 'Processing'}
                                        </span>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                                    <Link to={`/product/${order.product?._id}`} style={{ width: '100%', padding: '10px', textAlign: 'center', background: '#FFD814', border: '1px solid #FCD200', borderRadius: '8px', color: '#111', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
                                        Buy it again
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerOrders;
