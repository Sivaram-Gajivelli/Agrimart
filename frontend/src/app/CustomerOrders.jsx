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

const getTimelineSteps = (status) => {
    const defaultStatus = status || 'Processing';
    const steps = [
        { label: 'Order Placed', completed: true, active: false },
        { label: 'Processing', completed: false, active: false },
        { label: 'Out for Delivery', completed: false, active: false },
        { label: 'Delivered', completed: false, active: false }
    ];

    if (defaultStatus === 'Cancelled') return null;

    if (['Processing', 'Quality Checked', 'Packed'].includes(defaultStatus)) {
        steps[1].active = true;
    } else if (defaultStatus === 'Ready for Pickup') {
        steps[1].completed = true;
        steps[2].active = true;
    } else if (defaultStatus === 'Completed') {
        steps[1].completed = true;
        steps[2].completed = true;
        steps[3].completed = true;
        steps[3].active = true;
    }

    return steps;
};

const CustomerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trackingStates, setTrackingStates] = useState({});
    
    // Cancellation Modal State
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
    const [cancelReason, setCancelReason] = useState('Ordered by mistake');
    const [cancelOtherReason, setCancelOtherReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    
    const { user } = useAuth();

    const toggleTracking = (orderId) => {
        setTrackingStates(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const openCancelModal = (order) => {
        setSelectedOrderToCancel(order);
        setCancelModalOpen(true);
        setCancelReason('Ordered by mistake');
        setCancelOtherReason('');
    };

    const handleCancelOrder = async () => {
        if (!selectedOrderToCancel) return;

        const finalReason = cancelReason === 'Other' ? cancelOtherReason : cancelReason;

        try {
            setIsCancelling(true);
            await axios.put(`http://localhost:3000/api/orders/${selectedOrderToCancel._id}/cancel`, 
                { reason: finalReason }, 
                { withCredentials: true }
            );
            toast.success("Order cancelled successfully");
            
            // Update local state
            setOrders(orders.map(o => o._id === selectedOrderToCancel._id ? { ...o, trackingStatus: 'Cancelled', cancellationReason: finalReason } : o));
            setCancelModalOpen(false);
        } catch (error) {
            console.error("Error cancelling order:", error);
            toast.error(error.response?.data?.message || "Failed to cancel order");
        } finally {
            setIsCancelling(false);
        }
    };

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
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: 'var(--primary-dark)' }}>₹{order.totalPrice.toFixed(2)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#565959', textTransform: 'uppercase' }}>Tracking Id</p>
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
                                    <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '1.2rem' }}>
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
                                    {order.trackingStatus === 'Cancelled' && order.cancellationReason && (
                                        <p style={{ margin: '5px 0', fontSize: '0.85rem', color: '#d32f2f' }}>
                                            <strong>Cancel Reason:</strong> {order.cancellationReason}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                                    {order.trackingStatus !== 'Cancelled' && (
                                        <button 
                                            onClick={() => toggleTracking(order._id)}
                                            style={{ width: '100%', padding: '10px', textAlign: 'center', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                            {trackingStates[order._id] ? 'Hide tracking' : 'Track your order'}
                                        </button>
                                    )}
                                    {['Order Placed', 'Processing'].includes(order.trackingStatus || 'Processing') && (
                                        <button 
                                            onClick={() => openCancelModal(order)}
                                            style={{ width: '100%', padding: '10px', textAlign: 'center', background: '#fff', border: '1px solid #d32f2f', borderRadius: '8px', color: '#d32f2f', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                                            onMouseOver={(e) => { e.currentTarget.style.background = '#fff5f5'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
                                        >
                                            Cancel Order
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {order.trackingStatus === 'Cancelled' && (
                                <div style={{ padding: '0 20px 20px', background: '#fff' }}>
                                    <div style={{ background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px', color: '#c62828' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 'bold' }}>Order Cancelled</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {trackingStates[order._id] && getTimelineSteps(order.trackingStatus) && (
                                <div style={{ padding: '0 20px 30px 20px', borderTop: '1px solid #e0e0e0', marginTop: '10px', background: '#fafafa' }}>
                                    <h4 style={{ margin: '20px 0 25px 0', color: '#333', textAlign: 'center', fontSize: '1.1rem' }}>Tracking Details</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', maxWidth: '80%', margin: '0 auto', padding: '0 10px' }}>
                                        {/* Connecting Line background */}
                                        <div style={{ position: 'absolute', top: '14px', left: '40px', right: '40px', height: '4px', background: '#e0e0e0', zIndex: 1, borderRadius: '2px' }}></div>
                                        
                                        {/* Active Line foreground */}
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '14px', 
                                            left: '40px', 
                                            height: '4px', 
                                            background: 'var(--primary)', 
                                            zIndex: 2,
                                            borderRadius: '2px',
                                            transition: 'width 0.5s ease-in-out',
                                            width: order.trackingStatus === 'Completed' ? 'calc(100% - 80px)' : 
                                                   order.trackingStatus === 'Ready for Pickup' ? 'calc(66% - 53px)' : 
                                                   ['Processing', 'Quality Checked', 'Packed'].includes(order.trackingStatus || 'Processing') ? 'calc(33% - 26px)' : '0%'
                                        }}></div>

                                        {getTimelineSteps(order.trackingStatus).map((step, index) => (
                                            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: '120px' }}>
                                                <div style={{ 
                                                    width: '32px', 
                                                    height: '32px', 
                                                    borderRadius: '50%', 
                                                    background: step.completed || step.active ? 'var(--primary)' : '#fff',
                                                    border: step.completed || step.active ? '4px solid var(--primary-dark)' : '4px solid #e0e0e0',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    boxShadow: '0 0 0 3px #fff inset',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    {(step.completed || step.active) && <div style={{width: '10px', height: '10px', background: '#fff', borderRadius: '50%'}}></div>}
                                                </div>
                                                <span style={{ 
                                                    marginTop: '12px', 
                                                    fontSize: '0.9rem', 
                                                    fontWeight: step.active ? '700' : '500',
                                                    color: step.active ? 'var(--primary-dark)' : '#666',
                                                    textAlign: 'center'
                                                }}>{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {cancelModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ marginTop: 0, color: '#333' }}>Cancel Order</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to cancel this order? Please tell us why:</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                            {['Ordered by mistake', 'Found a better price', 'Changed delivery address', 'Delivery is too slow', 'Other'].map(reason => (
                                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1rem' }}>
                                    <input 
                                        type="radio" 
                                        name="cancelReason" 
                                        value={reason} 
                                        checked={cancelReason === reason} 
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                                    />
                                    {reason}
                                </label>
                            ))}
                            
                            {cancelReason === 'Other' && (
                                <textarea 
                                    rows="3" 
                                    placeholder="Please provide details..."
                                    value={cancelOtherReason}
                                    onChange={(e) => setCancelOtherReason(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '5px', fontFamily: 'inherit', resize: 'vertical' }}
                                />
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setCancelModalOpen(false)}
                                disabled={isCancelling}
                                style={{ padding: '10px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}>
                                Keep Order
                            </button>
                            <button 
                                onClick={handleCancelOrder}
                                disabled={isCancelling}
                                style={{ padding: '10px 20px', background: '#d32f2f', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: isCancelling ? 'not-allowed' : 'pointer', opacity: isCancelling ? 0.7 : 1 }}>
                                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrders;
