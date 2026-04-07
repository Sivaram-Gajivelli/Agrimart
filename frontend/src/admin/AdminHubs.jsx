import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, MapPin, Trash2, RefreshCw, Ban, CheckCircle, XCircle } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

const AdminHubs = () => {
    const [hubs, setHubs] = useState([]);
    const [products, setProducts] = useState([]);
    const [hubOrders, setHubOrders] = useState([]); // For Quality Check and Packing
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('management'); // management, stock, qc, packing
    const [showAddModal, setShowAddModal] = useState(false);
    const [newHub, setNewHub] = useState({ name: '', location: '', latitude: '', longitude: '', status: 'active' });
    
    // Filters
    const [stockVerifyFilter, setStockVerifyFilter] = useState('all');
    const [qcSearch, setQcSearch] = useState('');
    const [qcVerifyFilter, setQcVerifyFilter] = useState('all');
    const [packingSearch, setPackingSearch] = useState('');

    const fetchHubs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/hubs', { withCredentials: true });
            setHubs(res.data);
        } catch (err) {
            toast.error('Failed to fetch hubs');
        } finally {
            setLoading(false);
        }
    };

    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/products', { withCredentials: true });
            setProducts(res.data);
        } catch (err) {
            toast.error('Failed to fetch stock data');
        } finally {
            setLoading(false);
        }
    };

    const fetchHubOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/delivery/hub-quality-check', { withCredentials: true });
            setHubOrders(res.data);
        } catch (err) {
            toast.error('Failed to fetch hub orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'management') fetchHubs();
        else if (activeTab === 'stock') fetchStock();
        else fetchHubOrders();
    }, [activeTab]);

    const handleAddHub = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/hubs', newHub, { withCredentials: true });
            toast.success('Hub added successfully');
            setShowAddModal(false);
            fetchHubs();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add hub');
        }
    };

    const handleDeleteHub = async (id) => {
        if (!window.confirm('Delete this hub?')) return;
        try {
            await axios.delete(`/api/admin/hubs/${id}`, { withCredentials: true });
            toast.success('Hub deleted');
            fetchHubs();
        } catch (err) {
            toast.error('Failed to delete hub');
        }
    };

    const handleApproveStock = async (id, status) => {
        try {
            await axios.put(`/api/admin/products/${id}/approve`, { status }, { withCredentials: true });
            toast.success(`Produce ${status} successfully`);
            fetchStock();
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const updateQC = async (orderId, status, itemType = 'Order') => {
        try {
            await axios.put(`/api/admin/delivery/hub-quality-check/${orderId}`, { trackingStatus: status, itemType }, { withCredentials: true });
            toast.success(`Status updated to ${status}`);
            fetchHubOrders();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1 className="admin-page-title">Hub Logistics</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="refresh-btn" onClick={() => activeTab === 'management' ? fetchHubs() : fetchStock()}>
                        <RefreshCw size={18} /> Refresh
                    </button>
                    {activeTab === 'management' && (
                        <button className="refresh-btn" onClick={() => setShowAddModal(true)} style={{ background: 'var(--primary)', color: 'white' }}>
                            <Plus size={18} /> Add Hub
                        </button>
                    )}
                </div>
            </div>

            <div className="admin-tab-group">
                {[
                    { id: 'management', label: 'Hub Management' },
                    { id: 'stock', label: 'Hub Stock & Verification' },
                    { id: 'qc', label: 'Hub Quality Check' },
                    { id: 'packing', label: 'Hub Packing' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="table-wrapper">
                {loading ? <div className="admin-loading">Loading...</div> : (
                    activeTab === 'management' ? (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Hub Name</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hubs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
                                            <div style={{ opacity: 0.1, marginBottom: '15px' }}><MapPin size={48} style={{ margin: '0 auto' }} /></div>
                                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No Hubs Registered</p>
                                            <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Click "Add Hub" to initialize your logistics network.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    hubs.map(hub => (
                                        <tr key={hub._id}>
                                            <td><strong>{hub.name}</strong></td>
                                            <td>{hub.location}</td>
                                            <td>
                                                <span className={`badge badge-${hub.status === 'active' ? 'success' : 'secondary'}`}>
                                                    {hub.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button onClick={() => handleDeleteHub(hub._id)} className="action-btn reject"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : activeTab === 'stock' ? (
                        <>
                            <div style={{ padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '15px' }}>
                                <select 
                                    value={stockVerifyFilter} 
                                    onChange={(e) => setStockVerifyFilter(e.target.value)} 
                                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: 'white', fontWeight: 600 }}
                                >
                                    <option value="all">All Verification Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="quality assessment">QC Passed</option>
                                    <option value="verified">Verified</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Farmer</th>
                                        <th>Hub (Nearest)</th>
                                        <th>Quantity</th>
                                        <th>Verification Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.filter(p => stockVerifyFilter === 'all' || (p.verificationStatus || 'pending') === stockVerifyFilter).length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
                                                <div style={{ opacity: 0.1, marginBottom: '15px' }}><RefreshCw size={48} style={{ margin: '0 auto' }} /></div>
                                                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No Products Found</p>
                                                <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>There are no products matching the {stockVerifyFilter} status.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.filter(p => stockVerifyFilter === 'all' || (p.verificationStatus || 'pending') === stockVerifyFilter).map(product => {
                                            const hasArrived = product.deliveryStatus === 'At Hub';
                                            const hasPassedQC = product.verificationStatus === 'quality assessment';
                                            const isFinalized = product.verificationStatus === 'verified' || product.verificationStatus === 'rejected';

                                            return (
                                                <tr key={product._id}>
                                                    <td><strong>{product.productName}</strong></td>
                                                    <td>{product.farmer?.name}</td>
                                                    <td>{product.nearestHub?.name || hubs.find(h => h._id === product.nearestHub)?.name || 'Not Assigned'}</td>
                                                    <td>{product.quantityAvailable} {product.unit}</td>
                                                    <td>
                                                        <span className={`badge badge-${
                                                            product.verificationStatus === 'verified' ? 'success' : 
                                                            product.verificationStatus === 'rejected' ? 'danger' : 
                                                            product.verificationStatus === 'quality assessment' ? 'info' : 'warning'
                                                        }`}>
                                                            {product.verificationStatus === 'quality assessment' ? 'QC Passed' : (product.verificationStatus || 'pending')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {!isFinalized && (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <button 
                                                                    className={`action-btn approve ${!hasPassedQC ? 'disabled' : ''}`}
                                                                    onClick={() => hasPassedQC && handleApproveStock(product._id, 'verified')}
                                                                    title={hasPassedQC ? "Verify & List for Sale" : (!hasArrived ? "Restricted: Product must be At Hub" : "Restricted: Hub Quality check pending")}
                                                                    style={{ 
                                                                        padding: '4px 8px', borderRadius: '4px', border: '1px solid currentColor', fontSize: '0.75rem',
                                                                        background: hasPassedQC ? '#ecfdf5' : '#f1f5f9',
                                                                        color: hasPassedQC ? '#059669' : '#94a3b8',
                                                                        cursor: hasPassedQC ? 'pointer' : 'not-allowed',
                                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                                    }}
                                                                >
                                                                    {!hasPassedQC && <Ban size={12} />}
                                                                    {!hasArrived ? "Hub Arrival Pending" : (!hasPassedQC ? "Hub Quality check pending" : "Verify")}
                                                                </button>
                                                                <button 
                                                                    className="action-btn reject"
                                                                    onClick={() => handleApproveStock(product._id, 'rejected')}
                                                                    title="Reject and Return to Farmer"
                                                                    style={{ 
                                                                        padding: '4px 8px', borderRadius: '4px', border: '1px solid currentColor', fontSize: '0.75rem',
                                                                        background: '#fef2f2',
                                                                        color: '#dc2626',
                                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                                    }}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                        {isFinalized && (
                                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>System Locked</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </>
                    ) : activeTab === 'qc' ? (
                        <div style={{ padding: '20px' }}>
                             <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <input type="text" placeholder="Search Order/Product" value={qcSearch} onChange={(e) => setQcSearch(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', flex: 1 }} />
                                <select value={qcVerifyFilter} onChange={(e) => setQcVerifyFilter(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: 'white' }}>
                                    <option value="all">Verif. Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="quality assessment">QC Passed</option>
                                    <option value="verified">Verified</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                                {(() => {
                                    const filteredItems = hubOrders.filter(item => {
                                        // QC only shows items that have arrived (including passed QC)
                                        const inEligibleStatuses = ['Hub Packed', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed'];
                                        if (inEligibleStatuses.includes(item.trackingStatus)) return false;
                                        
                                        const matchSearch = !qcSearch || 
                                            (item.productName && item.productName.toLowerCase().includes(qcSearch.toLowerCase())) ||
                                            (item._id && item._id.includes(qcSearch));
                                        
                                        let vStatus = 'pending';
                                        if (item.itemType === 'Stocking') vStatus = item.verificationStatus || 'pending';
                                        else {
                                            const allVerified = item.items?.every(it => it.product?.verificationStatus === 'verified');
                                            const anyQC = item.items?.some(it => it.product?.verificationStatus === 'quality assessment');
                                            vStatus = allVerified ? 'verified' : (anyQC ? 'quality assessment' : 'pending');
                                        }
                                        const matchVerify = qcVerifyFilter === 'all' || vStatus === qcVerifyFilter;
                                        
                                        return matchSearch && matchVerify;
                                    });

                                    if (filteredItems.length === 0) {
                                        return (
                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '32px', border: '1px dashed #e2e8f0', color: '#64748b' }}>
                                                <div style={{ opacity: 0.1, marginBottom: '15px' }}><CheckCircle size={64} /></div>
                                                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No Products Pending QC</p>
                                                <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>All arrivals at this hub have been quality checked.</p>
                                            </div>
                                        );
                                    }

                                    return filteredItems.map(item => (
                                        <div key={item._id} style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                                    {item.itemType === 'Stocking' ? `Stocking: ${item.productName}` : `Order #${item._id.slice(-8).toUpperCase()}`}
                                                </span>
                                                <span style={{ 
                                                    background: item.trackingStatus === 'Quality Checked' ? '#ecfdf5' : '#fef3c7', 
                                                    color: item.trackingStatus === 'Quality Checked' ? '#10b981' : '#d97706', 
                                                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 
                                                }}>
                                                    {item.trackingStatus || 'Pending'}
                                                </span>
                                            </div>
                                            {item.itemType === 'Order' ? (
                                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                                    {item.items.map((it, idx) => (
                                                        <img key={idx} src={it.product?.image} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #f1f5f9' }} title={it.product?.productName} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
                                                    <img src={item.image} style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }} />
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{item.productName}</p>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{item.quantity} {item.unit}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                {item.trackingStatus === 'Processing' ? (
                                                    <button onClick={() => updateQC(item._id, 'Quality Checked', item.itemType)} style={{ gridColumn: '1 / span 2', padding: '10px', borderRadius: '10px', border: 'none', background: '#ecfdf5', color: '#10b981', fontWeight: 800, cursor: 'pointer' }}>Mark QC Passed</button>
                                                ) : item.trackingStatus === 'Quality Checked' ? (
                                                    <div style={{ gridColumn: '1 / span 2', textAlign: 'center', background: '#ecfdf5', color: '#10b981', padding: '10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800 }}>
                                                        VERIFIED
                                                    </div>
                                                ) : (
                                                    <button onClick={() => updateQC(item._id, 'Cancelled', item.itemType)} style={{ padding: '10px', borderRadius: '10px', border: 'none', background: '#fef2f2', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>Reject</button>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <input type="text" placeholder="Search Order/Customer" value={packingSearch} onChange={(e) => setPackingSearch(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', flex: 1 }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                                {(() => {
                                    const activePackings = hubOrders.filter(item => {
                                        if (item.itemType !== 'Order') return false;
                                        return ['Quality Checked', 'Hub Packed', 'Ready for Delivery'].includes(item.trackingStatus);
                                    });
                                    const historicalPackings = hubOrders.filter(item => {
                                        if (item.itemType !== 'Order') return false;
                                        return ['Out for Delivery', 'Delivered', 'Completed'].includes(item.trackingStatus);
                                    });

                                    const _s = packingSearch.toLowerCase();
                                    const filterFn = item => !packingSearch || 
                                        (item.buyer?.name?.toLowerCase().includes(_s)) ||
                                        (item._id?.includes(_s));

                                    const filteredActive = activePackings.filter(filterFn);
                                    const filteredHistory = historicalPackings.filter(filterFn);

                                    if (filteredActive.length === 0 && filteredHistory.length === 0) {
                                        return (
                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '32px', border: '1px dashed #e2e8f0', color: '#64748b' }}>
                                                <div style={{ opacity: 0.1, marginBottom: '15px' }}><MapPin size={64} /></div>
                                                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No Hub Packing Pending</p>
                                                <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>All orders have been processed and dispatched.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <>
                                            {filteredActive.map(item => (
                                                <div key={item._id} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Order ID</p>
                                                            <p style={{ margin: 0, fontWeight: 800 }}>#{item._id.slice(-8).toUpperCase()}</p>
                                                        </div>
                                                        <span style={{ 
                                                            background: item.trackingStatus === 'Ready for Delivery' ? '#eff6ff' : (item.trackingStatus === 'Hub Packed' ? '#f0fdf4' : (item.trackingStatus === 'Processing' ? '#fff1f2' : '#fff7ed')), 
                                                            color: item.trackingStatus === 'Ready for Delivery' ? '#3b82f6' : (item.trackingStatus === 'Hub Packed' ? '#10b981' : (item.trackingStatus === 'Processing' ? '#dc2626' : '#f59e0b')), 
                                                            padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 
                                                        }}>
                                                            {item.trackingStatus === 'Processing' ? 'Arrival Pending' : (item.trackingStatus === 'Quality Checked' ? 'Ready to Pack' : item.trackingStatus)}
                                                        </span>
                                                    </div>

                                                    <div style={{ marginBottom: '20px' }}>
                                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>Customer</p>
                                                        <p style={{ margin: 0, fontWeight: 700 }}>{item.buyer?.name}</p>
                                                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{item.deliveryAddress}</p>
                                                    </div>

                                                    <div style={{ marginBottom: '25px' }}>
                                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '10px' }}>Packing Items</p>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {item.items.map((it, idx) => (
                                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                                                    <img src={it.product?.image} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{it.product?.productName} ({it.quantity}{it.product?.unit})</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                                        {item.trackingStatus === 'Quality Checked' && (
                                                            <button onClick={() => updateQC(item._id, 'Hub Packed', 'Order')} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#ecfdf5', color: '#10b981', fontWeight: 800, cursor: 'pointer' }}>Hub Packed</button>
                                                        )}
                                                        {item.trackingStatus === 'Hub Packed' && (
                                                            <button onClick={() => updateQC(item._id, 'Ready for Delivery', 'Order')} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Ready for Delivery</button>
                                                        )}
                                                        {item.trackingStatus === 'Ready for Delivery' && (
                                                            <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
                                                                Order Ready - Hand over to Agent
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Historical Section */}
                                            {filteredHistory.length > 0 && (
                                                <div style={{ gridColumn: '1 / -1', marginTop: '40px', borderTop: '2px solid #f1f5f9', paddingTop: '40px' }}>
                                                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '12px', fontSize: '0.9rem', color: '#64748b' }}>{filteredHistory.length}</span>
                                                        Historical Packings
                                                    </h2>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                                        {filteredHistory.map(item => (
                                                            <div key={item._id} style={{ background: '#fcfdfd', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', opacity: 0.8 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>#{item._id.slice(-8).toUpperCase()}</span>
                                                                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <CheckCircle size={14} /> VERIFIED AT HUB
                                                                    </div>
                                                                </div>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>{item.buyer?.name}</p>
                                                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Status: {item.trackingStatus}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Simple Add Modal */}
            {showAddModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '400px' }}>
                        <h2 style={{ marginBottom: '20px' }}>Add New Hub</h2>
                        <form onSubmit={handleAddHub} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="text" placeholder="Hub Name" value={newHub.name} onChange={e => setNewHub({...newHub, name: e.target.value})} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px'}} />
                            <input type="text" placeholder="Address" value={newHub.location} onChange={e => setNewHub({...newHub, location: e.target.value})} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px'}} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="number" step="any" placeholder="Latitude" value={newHub.latitude} onChange={e => setNewHub({...newHub, latitude: e.target.value})} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', flex: 1}} />
                                <input type="number" step="any" placeholder="Longitude" value={newHub.longitude} onChange={e => setNewHub({...newHub, longitude: e.target.value})} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px', flex: 1}} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px', background: '#eee', border: 'none', borderRadius: '5px'}}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '5px'}}>Create Hub</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHubs;

