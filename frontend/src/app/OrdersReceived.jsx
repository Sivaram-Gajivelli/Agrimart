import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

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

/**
 * Ordered sequence of statuses an order progresses through.
 */
const STATUS_FLOW = [
    'Product Listed',
    'Order Placed',
    'Processing',
    'Farmer Packed', // Displayed as 'Packed'
    'Ready for Pickup',
    'Completed'
];

/**
 * Color map for each status badge variant.
 */
const STATUS_BADGE_STYLE = {
    'Order Placed':      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    'Processing':        { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
    'Farmer Packed':     { bg: '#fdf4ff', color: '#86198f', border: '#f5d0fe' },
    'Ready for Pickup':  { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
    'Picked Up':         { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    'Delivered to Hub':  { bg: '#fdf4ff', color: '#701a75', border: '#f5d0fe' },
    'Quality Checked':   { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    'Hub Packed':        { bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff' },
    'Ready for Delivery': { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
    'Out for Delivery':  { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    'Delivered':         { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    'Completed':         { bg: '#f0fdf4', color: '#065f46', border: '#6ee7b7' },
    'Cancelled':         { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
};

/**
 * Renders a horizontal row of action badge buttons representing each step in the order lifecycle.
 * Tailored for Farmers: only allows specific farmer-owned transitions.
 */
const StatusActionBar = ({ order, onUpdate }) => {
    const isCancelled = order.trackingStatus === 'Cancelled';
    const getEffectiveIndex = (status) => {
        const idx = STATUS_FLOW.indexOf(status);
        if (idx !== -1) return idx;
        
        // Map intermediate logistics statuses to the last farmer milestone or first relevant one
        const intermediateToMilestone = {
            'Picked Up': 4,          // Ready for Pickup
            'Delivered to Hub': 4,
            'Quality Checked': 4,
            'Hub Packed': 4,
            'Ready for Delivery': 4,
            'Out for Delivery': 4,
            'Delivered': 4,
        };
        return intermediateToMilestone[status] || 0;
    };

    const currentIdx = getEffectiveIndex(order.trackingStatus);

    if (isCancelled) {
        return (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '999px', background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', fontSize: '0.75rem', fontWeight: 700 }}>Order Cancelled</span>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update Status</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {STATUS_FLOW.map((s, i) => {
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    const isNext = i === currentIdx + 1;
                    const isLast = i === STATUS_FLOW.length - 1;

                    // Farmers can only trigger these specific next-step actions
                    const isFarmerAction = ['Processing', 'Farmer Packed', 'Ready for Pickup'].includes(s);

                    let bg = '#f3f4f6';
                    let color = '#9ca3af';
                    let border = '#e5e7eb';
                    let cursor = 'default';
                    let fontWeight = 500;

                    const displayLabel = s === 'Farmer Packed' ? 'Packed' : s;

                    if (isPast) {
                        bg = '#d1fae5'; color = '#065f46'; border = '#6ee7b7'; fontWeight = 600;
                    } else if (isCurrent) {
                        bg = '#10b981'; color = '#fff'; border = '#059669'; fontWeight = 700;
                    } else if (isNext) {
                        if (isFarmerAction) {
                            bg = '#f59e0b'; color = '#fff'; border = '#d97706'; cursor = 'pointer'; fontWeight = 700;
                        } else {
                            bg = '#f3f4f6'; color = '#9ca3af'; border = '#e5e7eb'; cursor = 'not-allowed';
                        }
                    }

                    const connectorColor = isPast ? '#6ee7b7' : '#e5e7eb';
                    const arrowColor = isPast ? '#10b981' : '#d1d5db';

                    return (
                        <React.Fragment key={s}>
                            <button
                                onClick={() => (isNext && isFarmerAction) ? onUpdate(order._id, s) : undefined}
                                disabled={!isNext || !isFarmerAction}
                                style={{
                                    padding: '5px 12px', borderRadius: '999px', border: `1px solid ${border}`, background: bg, color, fontWeight, fontSize: '0.7rem', cursor, transition: '0.15s',
                                    boxShadow: (isNext && isFarmerAction) ? '0 2px 6px rgba(245,158,11,0.35)' : 'none',
                                    transform: (isNext && isFarmerAction) ? 'scale(1.04)' : 'none',
                                }}
                            >
                                {isPast ? '✓ ' : ''}{displayLabel}
                            </button>
                            {!isLast && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <div style={{ width: '12px', height: '2px', background: connectorColor }} />
                                    <svg width="6" height="8" viewBox="0 0 8 12" fill="none">
                                        <path d="M1 1L7 6L1 11" stroke={arrowColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const OrdersReceived = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [ordersRes, productsRes] = await Promise.all([
                fetch('/api/orders/farmer', { credentials: 'include' }),
                fetch('/api/products/my-products', { credentials: 'include' })
            ]);

            if (!ordersRes.ok || !productsRes.ok) throw new Error('Failed to fetch data');

            const ordersData = await ordersRes.json();
            const productsData = await productsRes.json();

            // Flatten items into separated virtual order lines for the dashboard
            const flattenedOrders = [];
            ordersData.forEach(order => {
                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => {
                        flattenedOrders.push({
                            ...order, // Inherit order metadata (like trackingStatus, createdAt, _id, buyer)
                            _id: order._id, 
                            product: item.product,
                            quantity: item.quantity,
                            pricePerKg: item.pricePerKg,
                            totalPrice: item.itemTotal, // Map itemTotal -> totalPrice for UI logic
                            isProductOnly: false
                        });
                    });
                }
            });

            // Get product IDs that have existing orders
            const orderedProductIds = new Set(flattenedOrders.map(o => o.product?._id?.toString()));
            
            // Create placeholders for products without orders
            const unorderedItems = productsData
                .filter(p => !orderedProductIds.has(p._id.toString()))
                .map(p => ({
                    _id: `product_${p._id}`,
                    isProductOnly: true,
                    product: p,
                    quantity: p.quantityAvailable,
                    trackingStatus: 'Product Listed',
                    createdAt: p.createdAt,
                    buyer: null,
                    totalPrice: 0 // Will display "Waiting for orders" instead
                }));

            // Combine and sort by date descending
            const combinedData = [...flattenedOrders, ...unorderedItems].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            
            setOrders(combinedData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Could not load your information.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ trackingStatus: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update status');

            toast.success("Order status updated!");
            fetchData(); // Refresh to show new status
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Product Listed': return '#10b981';
            case 'Order Placed': return '#f59e0b';
            case 'Processing': return '#3b82f6';
            case 'Farmer Packed': return '#8b5cf6';
            case 'Ready for Pickup': return '#d946ef';
            case 'Delivered to Hub': return '#0ea5e9';
            case 'Quality Checked': return '#6366f1';
            case 'Hub Packed': return '#a855f7';
            case 'Ready for Delivery': return '#f43f5e';
            case 'Out for Delivery': return '#3b82f6';
            case 'Delivered': return '#10b981';
            case 'Completed': return '#10b981';
            case 'Cancelled': return '#ef4444';
            default: return '#64748b';
        }
    };

    if (loading) {
        return <div style={{ padding: '120px 5% 40px', minHeight: '60vh', textAlign: 'center' }}><h2>Loading Orders...</h2></div>;
    }

    return (
        <div style={{ padding: '120px 5% 40px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--primary-dark)', marginBottom: '30px', textAlign: 'center', fontSize: '2.5rem' }}>Orders Received</h1>

                {orders.length === 0 ? (
                    <div style={{ background: 'white', padding: '50px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ color: 'var(--text-dark)' }}>No orders received yet.</h3>
                        <p style={{ color: '#64748b' }}>Make sure your products are listed and verified to start receiving orders!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {orders.map(order => (
                            <div key={order._id} style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>

                                <div style={{ flex: '1 1 300px', display: 'flex', gap: '15px' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                                        {getProductImage(order.product?.productName) ? (
                                            <img src={getProductImage(order.product?.productName)} alt={order.product?.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No Img</div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                            <h3 style={{ margin: 0, color: 'var(--primary-dark)', fontSize: '1.4rem' }}>{order.product?.productName || 'Unknown Product'}</h3>
                                            <span style={{ background: getStatusColor(order.trackingStatus), color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                {order.trackingStatus}
                                            </span>
                                        </div>
                                        <p style={{ color: '#64748b', margin: '0 0 5px 0' }}>{order.isProductOnly ? 'Product ID' : 'Tracking Id'}: <span style={{ fontFamily: 'monospace' }}>{order.isProductOnly ? order.product?._id : order._id}</span></p>
                                        <p style={{ color: '#64748b', margin: 0 }}>{order.isProductOnly ? 'Listed on' : 'Placed on'}: {new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 200px', background: '#f8fafc', padding: '15px', borderRadius: '10px' }}>
                                    {order.isProductOnly ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Waiting for orders...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)' }}>Customer Details</h4>
                                            <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}><strong>Name:</strong> {order.buyer?.name || 'N/A'}</p>
                                            <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}><strong>Phone:</strong> {order.buyer?.phone || 'N/A'}</p>
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Email:</strong> {order.buyer?.email || 'N/A'}</p>
                                        </>
                                    )}
                                </div>

                                <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'right' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{order.isProductOnly ? 'Available Quantity' : 'Quantity'}</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{order.quantity} {order.product?.unit || 'units'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{order.isProductOnly ? 'Price' : 'Total Earned'}</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--primary)' }}>
                                            {order.isProductOnly ? `₹${parseFloat(order.product?.pricePerKg).toFixed(2)}/${order.product?.unit}` : `₹${parseFloat(order.totalPrice).toFixed(2)}`}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 100%', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: '10px' }}>
                                    {order.isProductOnly ? (
                                        <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                            Status: Product Listed & Waiting for Orders
                                        </div>
                                    ) : (
                                        <>
                                            <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Progress & Actions</h4>
                                            <StatusActionBar order={order} onUpdate={handleStatusChange} />
                                        </>
                                    )}
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
