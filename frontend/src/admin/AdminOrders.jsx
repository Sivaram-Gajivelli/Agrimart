import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RefreshCw, Package, User, Truck, MapPin, CheckCircle, Clock, Search, AlertCircle } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

/**
 * Ordered sequence of statuses an order progresses through.
 * Excludes 'Cancelled' since admin cannot cancel orders.
 */
const STATUS_FLOW = [
    'Order Placed',
    'Processing',
    'Quality Checked',
    'Hub Packed',
    'Ready for Delivery',
    'Out for Delivery',
    'Delivered',
    'Completed'
];

/**
 * Formats a numeric value to two decimal places.
 * Falls back to '0.00' for null, undefined, or NaN values.
 */
const fmt = (n) => {
    if (n === null || n === undefined) return '0.00';
    const num = parseFloat(n);
    return isNaN(num) ? '0.00' : num.toFixed(2);
};

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
 * Displays a colored badge indicating the current order status.
 */
const StatusBadge = ({ status }) => {
    const style = STATUS_BADGE_STYLE[status] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
    return (
        <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '999px',
            background: style.bg,
            color: style.color,
            border: `1px solid ${style.border}`,
            fontSize: '0.75rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
        }}>
            {status}
        </span>
    );
};

/**
 * Renders a horizontal row of action badge buttons representing each step in the order lifecycle.
 * The active next-step button is highlighted in amber as a call-to-action.
 * Past statuses appear as completed (green). Future statuses are greyed out.
 * Cancelled orders display a read-only indicator.
 *
 * @param {object} order - The current order object.
 * @param {function} onUpdate - Callback invoked with (orderId, newStatus) when the badge is clicked.
 */
const StatusActionBar = ({ order }) => {
    const isCancelled = order.trackingStatus === 'Cancelled';
    
    const getMappedStatus = (status) => {
        const legacyProcessing = ['Farmer Packed', 'Ready for Pickup', 'Picked Up', 'Delivered to Hub'];
        if (legacyProcessing.includes(status)) return 'Processing';
        return status;
    };

    const currentIdx = STATUS_FLOW.indexOf(getMappedStatus(order.trackingStatus));

    if (isCancelled) {
        return (
            <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #fecdd3',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
            }}>
                <span style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: '#fff1f2',
                    color: '#9f1239',
                    border: '1px solid #fecdd3',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                }}>Order Cancelled — No Further Actions</span>
            </div>
        );
    }

    return (
        <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb',
        }}>
            <h4 style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <CheckCircle size={14} /> ORDER TIMELINE
                <span style={{ fontSize: '0.6rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', marginLeft: 'auto' }}>Automated Lifecycle</span>
            </h4>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'center',
            }}>
                {STATUS_FLOW.map((s, i) => {
                    let isPast = i < currentIdx;
                    let isCurrent = i === currentIdx;

                    const isNext = i === currentIdx + 1;
                    const isLast = i === STATUS_FLOW.length - 1;

                    // 🛑 FILTER REMOVED: Admins now have total visibility to push orders linearly through all states
                    let bg = '#f3f4f6';
                    let color = '#9ca3af';
                    let border = '#e5e7eb';
                    let cursor = 'default';
                    let fontWeight = 500;

                    if (isPast) {
                        bg = '#d1fae5'; color = '#065f46'; border = '#6ee7b7'; fontWeight = 600;
                    } else if (isCurrent) {
                        bg = '#10b981'; color = '#fff'; border = '#059669'; fontWeight = 700;
                    }

                    // Connector line color: green if this step is completed (past), gray otherwise
                    const connectorColor = isPast ? '#6ee7b7' : '#e5e7eb';
                    const arrowColor = isPast ? '#059669' : '#d1d5db';

                    return (
                        <React.Fragment key={s}>
                            <div
                                title={s}
                                style={{
                                    padding: '5px 13px',
                                    borderRadius: '999px',
                                    border: `1px solid ${border}`,
                                    background: bg,
                                    color,
                                    fontWeight,
                                    fontSize: '0.75rem',
                                    cursor,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {isPast ? '✓ ' : ''}{s}
                            </div>
                            {!isLast && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0',
                                    flexShrink: 0,
                                }}>
                                    {/* Connector line */}
                                    <div style={{
                                        width: '18px',
                                        height: '2px',
                                        background: connectorColor,
                                        borderRadius: '1px',
                                        transition: 'background 0.2s',
                                    }} />
                                    {/* Chevron arrow */}
                                    <svg width="8" height="10" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
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

/**
 * Admin Orders Management page.
 * Displays all platform orders in a card layout with full product, buyer,
 * farmer (including address), and pricing details.
 * Allows admins to advance order status through a badge-based action bar
 * with a confirmation dialog before each update.
 */
const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/orders', { withCredentials: true });
            setOrders(res.data);
        } catch {
            toast.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const filteredOrders = orders.filter(o => {
        const matchesStatus = statusFilter === 'all' || o.trackingStatus === statusFilter;
        
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            (o._id && o._id.toLowerCase().includes(searchLower)) ||
            (o.buyer && Object.values(o.buyer).some(val => val && val.toString().toLowerCase().includes(searchLower))) ||
            (o.items && o.items.some(item => item.farmer && Object.values(item.farmer).some(val => val && val.toString().toLowerCase().includes(searchLower))));
            
        return matchesStatus && matchesSearch;
    });

    const allStatuses = ['all', ...STATUS_FLOW, 'Cancelled'];

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1 className="admin-page-title">Order Management</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input 
                            type="text" 
                            placeholder="Search Order ID, Buyer, Farmer..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '0.85rem', width: '280px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Filter by Status:</label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                background: '#fff',
                                color: '#374151',
                                fontWeight: 500,
                            }}
                        >
                            {allStatuses.map(s => (
                                <option key={s} value={s}>{s === 'all' ? 'All Orders' : s}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={fetchOrders} className="refresh-btn">
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="admin-loading">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '32px', border: '1px dashed #e2e8f0', color: '#64748b', marginTop: '20px' }}>
                    <div style={{ opacity: 0.1, marginBottom: '20px' }}><ShoppingCart size={64} /></div>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>No Orders Found</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
                        {statusFilter === 'all' 
                            ? "We couldn't find any orders matching your criteria." 
                            : `There are currently no orders with the status "${statusFilter}".`}
                    </p>
                    <button 
                        onClick={() => { setStatusFilter('all'); setSearchTerm(''); }}
                        style={{ marginTop: '25px', padding: '10px 24px', borderRadius: '12px', background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredOrders.map(order => {
                        const buyer = order.buyer;
                        
                        // Extract unique farmers from items
                        const uniqueFarmers = [];
                        const farmerSet = new Set();
                        if (order.items) {
                            order.items.forEach(item => {
                                if (item.farmer && !farmerSet.has(item.farmer._id)) {
                                    farmerSet.add(item.farmer._id);
                                    uniqueFarmers.push(item.farmer);
                                }
                            });
                        }

                        return (
                            <div
                                key={order._id}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                }}
                            >
                                {/* Card Header */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '16px',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                }}>
                                    <div>
                                        <span style={{
                                            fontFamily: 'monospace',
                                            background: '#f3f4f6',
                                            padding: '3px 8px',
                                            borderRadius: '5px',
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            color: '#374151',
                                        }}>
                                            #{order._id.slice(-8).toUpperCase()}
                                        </span>
                                        <span style={{ color: '#9ca3af', fontSize: '0.78rem', marginLeft: '10px' }}>
                                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            {' · '}
                                            {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <StatusBadge status={order.trackingStatus} />
                                </div>

                                {/* Card Body: 4 columns */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '20px',
                                }}>
                                    {/* Product Details */}
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '8px' }}>Items ({order.items?.length || 0})</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {order.items && order.items.map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', borderBottom: idx !== order.items.length - 1 ? '1px dashed #e5e7eb' : 'none', paddingBottom: idx !== order.items.length - 1 ? '8px' : '0' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden',
                                                        background: '#f3f4f6', flexShrink: 0, border: '1px solid #e5e7eb',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {item.product?.image
                                                            ? <img src={item.product?.image} alt={item.product?.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : <Package size={16} color="#9ca3af" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', textTransform: 'capitalize' }}>{item.product?.productName || 'N/A'}</div>
                                                            {(() => {
                                                                const status = item.product?.verificationStatus || 'pending';
                                                                let bg = '#fffbeb', color = '#d97706', border = '#fef3c7', Icon = Clock, text = 'Pending';
                                                                
                                                                if (status === 'quality assessment') {
                                                                    bg = '#eff6ff'; color = '#2563eb'; border = '#dbeafe'; Icon = Search; text = 'QC Assessment';
                                                                } else if (status === 'verified') {
                                                                    bg = '#ecfdf5'; color = '#059669'; border = '#d1fae5'; Icon = CheckCircle; text = 'Verified';
                                                                } else if (status === 'rejected') {
                                                                    bg = '#fef2f2'; color = '#dc2626'; border = '#fee2e2'; Icon = AlertCircle; text = 'Rejected';
                                                                }

                                                                return (
                                                                    <span style={{ 
                                                                        display: 'flex', alignItems: 'center', gap: '3px', 
                                                                        background: bg, color: color, fontSize: '0.65rem',
                                                                        padding: '2px 8px', borderRadius: '99px', fontWeight: 700,
                                                                        border: `1px solid ${border}`, whiteSpace: 'nowrap'
                                                                    }}>
                                                                        <Icon size={10} /> {text}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                            {item.quantity} {item.product?.unit || 'kg'} · ₹{fmt(item.itemTotal)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Buyer Details */}
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '8px' }}>Buyer</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <User size={13} color="#2563eb" />
                                            </div>
                                            <strong style={{ fontSize: '0.88rem', color: '#111827' }}>{buyer?.name || 'N/A'}</strong>
                                        </div>
                                        {buyer?.email && <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{buyer.email}</div>}
                                        {buyer?.phone && <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{buyer.phone}</div>}
                                        {order.deliveryAddress && (
                                            <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginTop: '4px', display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                                                <MapPin size={11} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <span style={{ lineHeight: 1.4 }}>
                                                    {order.deliveryAddress.substring(0, 70)}{order.deliveryAddress.length > 70 ? '…' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Farmer Details */}
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '8px' }}>Farmers</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {uniqueFarmers.map((farmer, idx) => (
                                                <div key={idx}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <Truck size={11} color="#059669" />
                                                        </div>
                                                        <strong style={{ fontSize: '0.82rem', color: '#111827' }}>{farmer?.name || 'N/A'}</strong>
                                                    </div>
                                                    {farmer?.phone && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{farmer.phone}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pricing */}
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '8px' }}>Pricing</p>
                                        <div style={{ fontSize: '0.82rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                                                <span style={{ color: '#6b7280' }}>Subtotal</span>
                                                <span>₹{fmt(order.subtotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                                                <span style={{ color: '#6b7280' }}>Delivery</span>
                                                <span>₹{fmt(order.deliveryFee)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                                                <span style={{ color: '#6b7280' }}>Platform</span>
                                                <span>₹{fmt(order.platformFee)}</span>
                                            </div>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between', gap: '16px',
                                                fontWeight: 700, color: '#059669',
                                                borderTop: '1px solid #e5e7eb', paddingTop: '5px', marginTop: '2px',
                                            }}>
                                                <span style={{ color: '#374151' }}>Total</span>
                                                <span>₹{fmt(order.totalAmount)}</span>
                                            </div>
                                        </div>
                                        {order.cancellationReason && (
                                            <div style={{ fontSize: '0.74rem', color: '#ef4444', marginTop: '8px' }}>
                                                Cancellation Reason: {order.cancellationReason}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Action Bar — now read-only */}
                                <StatusActionBar order={order} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;

