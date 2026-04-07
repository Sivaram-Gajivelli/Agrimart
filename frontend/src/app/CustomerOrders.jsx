import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import StarRating from '../components/StarRating';

const produceImages = import.meta.glob('../assets/images/produce/*.{png,jpg,jpeg,webp,svg}', { eager: true });
const imageMap = {};
for (const path in produceImages) {
    const filename = path.split('/').pop().toLowerCase();
    const nameWithoutExt = filename.split('.')[0];
    imageMap[nameWithoutExt] = produceImages[path].default || produceImages[path];
}

const getProductImage = (productName) => {
    if (!productName || productName.trim() === '') return null;
    
    // Normalize: lowercase, trim, and replace spaces with both dash and underscore
    const name = productName.trim().toLowerCase();
    const withDash = name.replace(/\s+/g, '-');
    const withUnderscore = name.replace(/\s+/g, '_');
    
    // Check exact matches
    if (imageMap[withDash]) return imageMap[withDash];
    if (imageMap[withUnderscore]) return imageMap[withUnderscore];
    
    // Check plural/singular matches
    const checkPlural = (n) => {
        if (imageMap[n]) return imageMap[n];
        if (n.endsWith('s') && imageMap[n.slice(0, -1)]) return imageMap[n.slice(0, -1)];
        if (imageMap[n + 's']) return imageMap[n + 's'];
        return null;
    };
    
    let res = checkPlural(withDash) || checkPlural(withUnderscore);
    if (res) return res;

    // Substring matching as fallback
    for (const key in imageMap) {
        if (name.length > 2 && key.length > 2) {
            if (name.includes(key) || key.includes(name)) return imageMap[key];
        }
    }
    return null;
};

const getTimelineSteps = (status) => {
    const steps = [
        { label: 'Order Placed', key: 'Order Placed' },
        { label: 'Processing', key: 'Processing' },
        { label: 'Quality Checked', key: 'Quality Checked' },
        { label: 'Hub Packed', key: 'Hub Packed' },
        { label: 'Out for Delivery', key: 'Out for Delivery' },
        { label: 'Delivered', key: 'Delivered' }
    ];

    if (status === 'Cancelled') return null;

    const statusOrder = [
        'Order Placed', 
        'Processing', 
        'Quality Checked', 
        'Hub Packed', 
        'Ready for Delivery', 
        'Out for Delivery', 
        'Delivered', 
        'Completed'
    ];

    const currentIdx = statusOrder.indexOf(status);
    
    return steps.map((step, index) => {
        let completed = false;
        let active = false;

        // Custom mapping for milestone completion
        if (index === 0) completed = true; // Order Placed
        if (index === 1 && currentIdx >= 1) completed = true; // Processing milestone
        if (index === 2 && currentIdx >= 2) completed = true; // QC milestone
        if (index === 3 && currentIdx >= 3) completed = true; // Packed milestone
        if (index === 4 && currentIdx >= 5) completed = true; // Out for Delivery milestone
        if (index === 5 && currentIdx >= 6) completed = true; // Delivered milestone

        // Set active status (only if not completed)
        if (!completed) {
            if (index === 1 && currentIdx === 1) active = true;
            if (index === 2 && currentIdx === 2) active = true;
            if (index === 3 && (currentIdx === 3 || currentIdx === 4)) active = true;
            if (index === 4 && currentIdx === 5) active = true;
            if (index === 5 && currentIdx >= 6) active = true;
        }

        if (currentIdx >= 7) {
            completed = true;
            active = false;
        }

        return { ...step, completed, active };
    });
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
            await axios.put(`/api/orders/${selectedOrderToCancel._id}/cancel`, 
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

    const handleRateAgent = async (assignmentId, rating) => {
        try {
            await axios.post(`/api/delivery/assignments/${assignmentId}/rate`, { rating }, { withCredentials: true });
            toast.success("Thank you for your feedback!");
            // Refresh orders
            const response = await axios.get('/api/orders/customer', { withCredentials: true });
            setOrders(response.data);
        } catch (error) {
            toast.error("Failed to submit rating");
        }
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get('/api/orders/customer', {
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
                        <div 
                            key={order._id} 
                            className={`order-card ${['Delivered', 'Completed'].includes(order.trackingStatus) && !order.isRated ? 'can-rate' : ''}`}
                            style={{ border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden', background: '#fff', transition: '0.3s all ease' }}
                        >
                            <div style={{ background: '#f0f2f2', padding: '15px 20px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#565959', textTransform: 'uppercase' }}>Order Placed</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: '#333' }}>{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#565959', textTransform: 'uppercase' }}>Total</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: 'var(--primary-dark)' }}>₹{(order.totalAmount || 0).toFixed(2)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#565959', textTransform: 'uppercase' }}>Tracking Id</p>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#333' }}>{order._id}</p>
                                </div>
                            </div>
                            
                            <div style={{ padding: '20px' }}>
                                {order.items && order.items.map((item, index) => (
                                    <div key={item.product?._id || index} style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: index !== order.items.length - 1 ? '15px' : '0', paddingBottom: index !== order.items.length - 1 ? '15px' : '0', borderBottom: index !== order.items.length - 1 ? '1px dashed #e0e0e0' : 'none' }}>
                                        <div style={{ width: '80px', height: '80px', flexShrink: 0, background: '#f9f9f9', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                            <img 
                                                src={getProductImage(item.product?.productName) || item.product?.image || "/placeholder.png"} 
                                                alt={item.product?.productName} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: '0 0 5px 0', color: 'var(--primary)', fontSize: '1.1rem', textTransform: 'capitalize' }}>
                                                {item.product?.productName || 'Unknown Product'}
                                            </h3>
                                            <p style={{ margin: '3px 0', fontSize: '0.9rem' }}>
                                                <strong>Farmer:</strong> {item.farmer?.name || 'Unknown'}
                                            </p>
                                            <p style={{ margin: '3px 0', fontSize: '0.9rem' }}>
                                                <strong>Quantity:</strong> {item.quantity} {item.product?.unit || 'kg'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                                <div style={{ borderTop: '1px solid #eee', marginTop: '15px', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>
                                            <strong>Status:</strong> <span style={{ 
                                                padding: '3px 12px', 
                                                borderRadius: '20px', 
                                                fontSize: '0.8rem',
                                                fontWeight: '700',
                                                background: order.trackingStatus === 'Completed' ? '#dcfce7' : '#fef9c3',
                                                color: order.trackingStatus === 'Completed' ? '#166534' : '#854d0e',
                                                display: 'inline-block'
                                            }}>
                                                {order.trackingStatus || 'Processing'}
                                            </span>
                                        </p>
                                        
                                        {/* 🚀 NEW: Delivery Rating Prompt with Hover and Badge logic */}
                                        {['Delivered', 'Completed'].includes(order.trackingStatus) && order.deliveryAssignmentId && (
                                            <div 
                                                className="rating-section"
                                                style={{ 
                                                    marginTop: '12px', 
                                                    padding: '10px 16px', 
                                                    background: order.isRated ? '#f0fdf4' : '#fff7ed', 
                                                    borderRadius: '10px', 
                                                    border: order.isRated ? '1px solid #dcfce7' : '1px solid #ffedd5', 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    transition: '0.3s all ease'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    {order.isRated ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ 
                                                                background: '#10b981', 
                                                                color: 'white', 
                                                                padding: '2px 8px', 
                                                                borderRadius: '4px', 
                                                                fontSize: '0.7rem', 
                                                                fontWeight: 'bold',
                                                                textTransform: 'uppercase'
                                                            }}>Feedback Received</span>
                                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803d' }}>Thank you for helping us improve!</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#9a3412' }}>How was your delivery?</p>
                                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#c2410c' }} className="hover-text">Hover to rate</p>
                                                        </>
                                                    )}
                                                </div>
                                                
                                                {!order.isRated && (
                                                    <div className="star-reveal" style={{ 
                                                        opacity: 0, 
                                                        visibility: 'hidden', 
                                                        transform: 'scale(0.9)', 
                                                        transition: '0.3s all cubic-bezier(0.4, 0, 0.2, 1)' 
                                                    }}>
                                                        <StarRating 
                                                            size={20} 
                                                            onRate={(r) => handleRateAgent(order.deliveryAssignmentId, r)} 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <style>{`
                                            .order-card.can-rate:hover {
                                                border-color: #fb923c !important;
                                                box-shadow: 0 4px 12px rgba(251, 146, 60, 0.1);
                                            }
                                            .order-card.can-rate:hover .rating-section {
                                                background: #ffedd5 !important;
                                                border-color: #fed7aa !important;
                                            }
                                            .order-card.can-rate:hover .star-reveal {
                                                opacity: 1 !important;
                                                visibility: visible !important;
                                                transform: scale(1) !important;
                                            }
                                            .order-card.can-rate:hover .hover-text {
                                                display: none;
                                            }
                                        `}</style>

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
                                                style={{ width: '100%', padding: '8px', textAlign: 'center', background: 'var(--primary)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                                {trackingStates[order._id] ? 'Hide tracking' : 'Track your order'}
                                            </button>
                                        )}
                                        {['Order Placed', 'Processing'].includes(order.trackingStatus || 'Processing') && (
                                            <button 
                                                onClick={() => openCancelModal(order)}
                                                style={{ width: '100%', padding: '8px', textAlign: 'center', background: '#fff', border: '1px solid #d32f2f', borderRadius: '6px', color: '#d32f2f', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                                                onMouseOver={(e) => { e.currentTarget.style.background = '#fff5f5'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
                                            >
                                                Cancel Order
                                            </button>
                                        )}
                                    </div>
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
                                            width: (() => {
                                                const statusOrder = ['Order Placed', 'Processing', 'Farmer Packed', 'Ready for Pickup', 'Picked Up', 'Delivered to Hub', 'Quality Checked', 'Hub Packed', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed'];
                                                const currentIdx = statusOrder.indexOf(order.trackingStatus);
                                                if (currentIdx <= 0) return '0%';
                                                if (currentIdx >= 10) return '100%';
                                                // Map indexes to percentage for 6 milestones
                                                if (currentIdx < 1) return '0%'; // Placed
                                                if (currentIdx < 4) return '20%'; // Processing
                                                if (currentIdx < 6) return '40%'; // In Transit
                                                if (currentIdx < 9) return '60%'; // At Hub
                                                if (currentIdx < 10) return '80%'; // Out for Delivery
                                                return '100%';
                                            })()
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

