import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DollarSign, Search, Calendar, Filter, FileText, ArrowUpRight, TrendingUp } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

const AdminPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/payments', { withCredentials: true });
            setPayments(res.data);
        } catch (err) {
            toast.error('Failed to fetch payment records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const filteredPayments = payments.filter(p => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const matchesSearch = !searchTerm || 
            (p._id && p._id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.buyer?.name && p.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const totalVolume = payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const totalPlatformRevenue = payments.reduce((acc, p) => acc + (p.platformFee || 0), 0);

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <div>
                    <h1 className="admin-page-title">Payment Management</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '-15px' }}>
                        Track transactions, platform fees, and farmer payouts.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ 
                        background: 'white', padding: '15px 25px', borderRadius: '20px', 
                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ background: '#ecfdf5', color: '#10b981', padding: '10px', borderRadius: '12px' }}>
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PLATFORM REVENUE</p>
                            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>₹{totalPlatformRevenue.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by Transaction ID or Customer..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', padding: '12px 12px 12px 45px', borderRadius: '15px', 
                            border: '1px solid #e2e8f0', outline: 'none', background: 'white' 
                        }} 
                    />
                </div>
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ 
                        padding: '12px 20px', borderRadius: '15px', border: '1px solid #e2e8f0', 
                        outline: 'none', background: 'white', fontWeight: 600, color: '#1e293b' 
                    }}
                >
                    <option value="all">All Statuses</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Processing">Processing</option>
                </select>
            </div>

            <div className="table-wrapper" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                {loading ? (
                    <div className="admin-loading">Loading Transactions...</div>
                ) : filteredPayments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px 20px', background: 'white', color: '#64748b' }}>
                        <div style={{ opacity: 0.1, marginBottom: '20px' }}><DollarSign size={64} style={{ margin: '0 auto' }} /></div>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>No Transactions Found</p>
                        <p style={{ fontSize: '0.9rem' }}>We couldn't find any payment records matching your filters.</p>
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '20px' }}>Date</th>
                                <th>Transaction ID</th>
                                <th>Customer</th>
                                <th>Total Amount</th>
                                <th>Platform Fee</th>
                                <th>Farmer Revenue</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map(p => (
                                <tr key={p._id}>
                                    <td style={{ padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>
                                        {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                                        #{p._id.slice(-8).toUpperCase()}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.buyer?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.buyer?.email}</div>
                                    </td>
                                    <td style={{ fontWeight: 800, color: '#1e293b' }}>₹{p.totalAmount.toFixed(2)}</td>
                                    <td style={{ color: '#059669', fontWeight: 700 }}>₹{p.platformFee.toFixed(2)}</td>
                                    <td style={{ color: '#2563eb', fontWeight: 700 }}>₹{p.farmerRevenue.toFixed(2)}</td>
                                    <td>
                                        <span className={`badge badge-${
                                            p.status === 'Completed' || p.status === 'Delivered' ? 'success' : 
                                            p.status === 'Cancelled' ? 'danger' : 'warning'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            style={{ 
                                                padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', 
                                                background: 'white', color: '#64748b', cursor: 'pointer' 
                                            }}
                                            title="View Invoice Details"
                                        >
                                            <FileText size={16} />
                                        </button>
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

export default AdminPayments;
