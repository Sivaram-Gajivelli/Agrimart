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

const OrdersReceived = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const validStatuses = ['Order Placed', 'Processing', 'Quality Checked', 'Packed', 'Ready for Pickup', 'Completed', 'Cancelled'];
    
    const trackingSteps = [
        'Product Listed', 
        'Order Placed', 
        'Processing', 
        'Quality Checked', 
        'Packed', 
        'Ready for Pickup', 
        'Completed'
    ];

    const getStepIndex = (status) => {
        if (status === 'Cancelled') return -1;
        // 'Product Listed' is implicitly done when an order exists
        const index = trackingSteps.indexOf(status);
        return index !== -1 ? index : 1; 
    };

    const fetchData = async () => {
        try {
            const [ordersRes, productsRes] = await Promise.all([
                fetch('http://localhost:3000/api/orders/farmer', { credentials: 'include' }),
                fetch('http://localhost:3000/api/products/my-products', { credentials: 'include' })
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
            const response = await fetch(`http://localhost:3000/api/orders/${orderId}/status`, {
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
            case 'Quality Checked': return '#8b5cf6';
            case 'Packed': return '#d946ef';
            case 'Ready for Pickup': return '#ecc94b';
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

                                <div style={{ flex: '1 1 100%', marginTop: '20px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
                                        {/* Connecting Line */}
                                        <div style={{ position: 'absolute', top: '15px', left: '30px', right: '30px', height: '4px', background: '#e2e8f0', zIndex: 0 }}></div>
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '15px', 
                                            left: '30px', 
                                            width: order.trackingStatus === 'Cancelled' ? '0%' : `calc(${(getStepIndex(order.trackingStatus) / (trackingSteps.length - 1)) * 100}% - 30px)`, 
                                            height: '4px', 
                                            background: order.trackingStatus === 'Cancelled' ? 'transparent' : '#10b981', 
                                            zIndex: 0,
                                            transition: 'width 0.3s ease'
                                        }}></div>

                                        {trackingSteps.map((step, index) => {
                                            const currentStepIndex = getStepIndex(order.trackingStatus);
                                            const isCompleted = order.trackingStatus !== 'Cancelled' && index <= currentStepIndex;
                                            const isCurrent = order.trackingStatus !== 'Cancelled' && index === currentStepIndex;
                                            const isCancelled = order.trackingStatus === 'Cancelled';

                                            return (
                                                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '60px', textAlign: 'center' }}>
                                                    <div style={{ 
                                                        width: '30px', 
                                                        height: '30px', 
                                                        borderRadius: '50%', 
                                                        background: isCancelled ? '#ef4444' : (isCompleted ? '#10b981' : 'white'),
                                                        border: isCancelled ? '3px solid #ef4444' : (isCompleted ? '3px solid #10b981' : '3px solid #cbd5e1'),
                                                        color: isCancelled || isCompleted ? 'white' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginBottom: '8px',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        {(isCompleted || isCancelled) && <span style={{ fontSize: '14px' }}>✓</span>}
                                                    </div>
                                                    <span style={{ 
                                                        fontSize: '0.75rem', 
                                                        fontWeight: isCurrent ? 'bold' : 'normal',
                                                        color: isCancelled && index === currentStepIndex ? '#ef4444' : (isCompleted ? 'var(--text-dark)' : '#94a3b8'),
                                                        wordWrap: 'break-word',
                                                        lineHeight: '1.1'
                                                    }}>
                                                        {step}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ flex: '1 1 100%', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <label style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>Order Status:</label>
                                    {order.isProductOnly ? (
                                        <div style={{ flex: 1, color: 'var(--text-dark)' }}>
                                            {order.trackingStatus}
                                        </div>
                                    ) : (
                                        <select
                                            value={order.trackingStatus}
                                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', flex: 1, maxWidth: '250px' }}
                                            disabled={order.trackingStatus === 'Completed' || order.trackingStatus === 'Cancelled'}
                                        >
                                            {validStatuses.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
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
