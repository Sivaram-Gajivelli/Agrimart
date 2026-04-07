import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Eye, RefreshCw, Filter, Ban } from 'lucide-react';
import '../assets/styles/AdminUsers.css'; // Reusing table styles

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/products', { withCredentials: true });
            setProducts(res.data);
        } catch (err) {
            toast.error('Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleApprove = async (id, status) => {
        try {
            await axios.put(`/api/admin/products/${id}/approve`, { status }, { withCredentials: true });
            toast.success(`Product ${status} successfully`);
            fetchProducts();
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const filteredProducts = filter === 'all' ? products : products.filter(p => p.verificationStatus === filter);

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1 className="admin-page-title">Product Management</h1>
                <button onClick={fetchProducts} className="refresh-btn">
                    <RefreshCw size={18} /> Refresh
                </button>
            </div>

            <div className="users-tabs">
                {['all', 'pending', 'verified', 'rejected'].map(f => (
                    <button 
                        key={f}
                        className={`tab-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="table-wrapper">
                {loading ? <div className="admin-loading">Loading products...</div> : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Farmer</th>
                                <th>Price</th>
                                <th>Logistics</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => {
                                const canVerify = product.deliveryStatus === 'At Hub';
                                const isFinalized = product.verificationStatus === 'verified' || product.verificationStatus === 'rejected';
                                
                                return (
                                    <tr key={product._id}>
                                        <td><strong>{product.productName}</strong></td>
                                        <td>{product.farmer?.name || 'Unknown'}</td>
                                        <td>₹{product.pricePerKg} / {product.unit}</td>
                                        <td>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: canVerify ? '#10b981' : '#64748b' }}>
                                                {product.deliveryStatus || 'Listed'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${product.verificationStatus === 'verified' ? 'success' : product.verificationStatus === 'pending' ? 'warning' : 'danger'}`}>
                                                {product.verificationStatus}
                                            </span>
                                        </td>
                                        <td>
                                            {!isFinalized ? (
                                                <div className="action-buttons">
                                                    <button 
                                                        className={`action-btn approve ${!canVerify ? 'disabled' : ''}`} 
                                                        onClick={() => canVerify && handleApprove(product._id, 'verified')}
                                                        title={canVerify ? "Approve Produce" : "Cannot verify until produce is At Hub"}
                                                        style={{ 
                                                            cursor: canVerify ? 'pointer' : 'not-allowed',
                                                            opacity: canVerify ? 1 : 0.5
                                                        }}
                                                    >
                                                        {canVerify ? <CheckCircle size={18} /> : <Ban size={18} color="#94a3b8" />}
                                                    </button>
                                                    <button 
                                                        className="action-btn reject" 
                                                        onClick={() => handleApprove(product._id, 'rejected')} 
                                                        title="Reject Produce"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Finalized</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminProducts;

