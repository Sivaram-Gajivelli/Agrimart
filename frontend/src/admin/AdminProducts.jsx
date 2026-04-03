import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Eye, RefreshCw, Filter } from 'lucide-react';
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
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => (
                                <tr key={product._id}>
                                    <td><strong>{product.productName}</strong></td>
                                    <td>{product.farmer?.name || 'Unknown'}</td>
                                    <td>₹{product.pricePerKg} / {product.unit}</td>
                                    <td>
                                        <span className={`badge badge-${product.verificationStatus === 'verified' ? 'success' : product.verificationStatus === 'pending' ? 'warning' : 'danger'}`}>
                                            {product.verificationStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {product.verificationStatus === 'pending' && (
                                                <>
                                                    <button className="action-btn approve" onClick={() => handleApprove(product._id, 'verified')}><CheckCircle size={16} /></button>
                                                    <button className="action-btn reject" onClick={() => handleApprove(product._id, 'rejected')}><XCircle size={16} /></button>
                                                </>
                                            )}
                                            {product.verificationStatus === 'verified' && (
                                                <button className="action-btn reject" onClick={() => handleApprove(product._id, 'rejected')}><XCircle size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminProducts;

