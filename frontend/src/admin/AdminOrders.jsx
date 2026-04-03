import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { RefreshCw, Package, User, Truck, MapPin } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

/**
 * Ordered sequence of statuses an order progresses through.
 * Excludes 'Cancelled' since admin cannot cancel orders.
 */
const STATUS_FLOW = [
    'Order Placed',
    'Processing',
    'Quality Checked',
    'Packed',
    'Ready for Pickup',
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
    'Order Placed': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    'Processing':   { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
    'Quality Checked': { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    'Packed':       { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    'Ready for Pickup': { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
    'Completed':    { bg: '#f0fdf4', color: '#065f46', border: '#6ee7b7' },
    'Cancelled':    { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
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
const StatusActionBar = ({ order, onUpdate }) => {
    const isCancelled = order.trackingStatus === 'Cancelled';
    const currentIdx = STATUS_FLOW.indexOf(order.trackingStatus);

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
            <p style={{
                fontSize: '0.7rem',
                color: '#6b7280',
                marginBottom: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
            }}>
                Update Status
            </p>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'center',
            }}>
                {STATUS_FLOW.map((s, i) => {
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    const isNext = i === currentIdx + 1;
                    const isLast = i === STATUS_FLOW.length - 1;

                    let bg = '#f3f4f6';
                    let color = '#9ca3af';
                    let border = '#e5e7eb';
                    let cursor = 'default';
                    let fontWeight = 500;

                    if (isPast) {
                        bg = '#d1fae5'; color = '#065f46'; border = '#6ee7b7'; fontWeight = 600;
                    } else if (isCurrent) {
                        bg = '#059669'; color = '#fff'; border = '#047857'; fontWeight = 700;
                    } else if (isNext) {
                        bg = '#f59e0b'; color = '#fff'; border = '#d97706'; cursor = 'pointer'; fontWeight = 700;
                    }

                    // Connector line color: green if this step is completed (past), gray otherwise
                    const connectorColor = isPast ? '#6ee7b7' : '#e5e7eb';
                    const arrowColor = isPast ? '#059669' : '#d1d5db';

                    return (
                        <React.Fragment key={s}>
                            <button
                                onClick={() => isNext ? onUpdate(order._id, s) : undefined}
                                disabled={!isNext}
                                title={isNext ? `Click to move order to: "${s}"` : s}
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
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                    boxShadow: isNext ? '0 2px 6px rgba(245,158,11,0.35)' : 'none',
                                    transform: isNext ? 'scale(1.04)' : 'none',
                                }}
                            >
                                {isPast ? '✓ ' : ''}{s}
                            </button>
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

    /**
     * Prompts admin for confirmation before advancing the order status.
     */
    const handleStatusUpdate = async (id, status) => {
        const confirmed = window.confirm(
            `Are you sure you want to update this order status to "${status}"?\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await axios.put(`/api/admin/orders/${id}/status`, { status }, { withCredentials: true });
            toast.success(`Order status updated to "${status}"`);
            fetchOrders();
        } catch {
            toast.error('Status update failed');
        }
    };

    const filteredOrders = statusFilter === 'all'
        ? orders
        : orders.filter(o => o.trackingStatus === statusFilter);

    const allStatuses = ['all', ...STATUS_FLOW, 'Cancelled'];

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1 className="admin-page-title">Order Management</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Filter by Status:</label>
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
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '0.95rem' }}>
                    No orders found for the selected status.
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
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', textTransform: 'capitalize' }}>{item.product?.productName || 'N/A'}</div>
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

                                {/* Status Action Bar — always at the bottom of the card */}
                                <StatusActionBar order={order} onUpdate={handleStatusUpdate} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
