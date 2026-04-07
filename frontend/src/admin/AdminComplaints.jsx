import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { MessageSquare, Search, User, Filter, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

const AdminComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [resolutionText, setResolutionText] = useState('');

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/complaints', { withCredentials: true });
            setComplaints(res.data);
        } catch (err) {
            toast.error('Failed to fetch complaints');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleResolve = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/admin/complaints/${selectedComplaint._id}/status`, {
                status: 'Resolved',
                resolution: resolutionText
            }, { withCredentials: true });
            toast.success('Complaint resolved successfully!');
            setSelectedComplaint(null);
            setResolutionText('');
            fetchComplaints();
        } catch (err) {
            toast.error('Failed to update complaint status');
        }
    };

    const filteredComplaints = complaints.filter(c => {
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        const _s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            (c.subject?.toLowerCase().includes(_s)) ||
            (c.user?.name?.toLowerCase().includes(_s)) ||
            (c._id?.includes(_s));
        return matchesStatus && matchesSearch;
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Open': return <AlertTriangle size={18} color="#f59e0b" />;
            case 'In Progress': return <Clock size={18} color="#3b82f6" />;
            case 'Resolved': return <CheckCircle size={18} color="#10b981" />;
            default: return <Clock size={18} color="#64748b" />;
        }
    };

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <div>
                    <h1 className="admin-page-title">User Complaints & Feedback</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '-15px' }}>
                        Manage customer and farmer issues, quality reports, and delivery disputes.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="refresh-btn" onClick={fetchComplaints}>Refresh List</button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by ID, User, or Content..." 
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
                    <option value="all">All Complaints</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
                {loading ? (
                    <div className="admin-loading">Loading Complaints...</div>
                ) : filteredComplaints.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '32px', border: '1px dashed #e2e8f0', color: '#64748b' }}>
                        <div style={{ opacity: 0.1, marginBottom: '20px' }}><MessageSquare size={64} style={{ margin: '0 auto' }} /></div>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>Clean Inbox!</p>
                        <p style={{ fontSize: '0.9rem' }}>There are currently no active complaints matching your filters.</p>
                    </div>
                ) : (
                    filteredComplaints.map(c => (
                        <div key={c._id} style={{ background: 'white', padding: '25px', borderRadius: '25px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {getStatusIcon(c.status)}
                                    <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                                        #{c._id.slice(-6).toUpperCase()}
                                    </span>
                                </div>
                                <span className={`badge badge-${c.priority === 'Urgent' || c.priority === 'High' ? 'danger' : (c.priority === 'Medium' ? 'warning' : 'secondary')}`}>
                                    {c.priority} Priority
                                </span>
                            </div>

                            <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{c.subject}</h3>
                            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>{c.description}</p>

                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={12} color="#2563eb" />
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.user?.name} </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({c.user?.role})</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{c.user?.email} | {c.user?.phone}</p>
                            </div>

                            {c.resolution ? (
                                <div style={{ background: '#ecfdf5', padding: '15px', borderRadius: '15px', border: '1px solid #d1fae5', marginTop: '10px' }}>
                                    <p style={{ margin: '0 0 5px', fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>RESOLUTION</p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#065f46' }}>{c.resolution}</p>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setSelectedComplaint(c)} 
                                    style={{ 
                                        width: '100%', padding: '12px', borderRadius: '15px', 
                                        border: 'none', background: '#f1f5f9', color: '#1e293b', 
                                        fontWeight: 800, cursor: 'pointer', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center', gap: '10px' 
                                    }}
                                >
                                    Take Action
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {selectedComplaint && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '500px', maxWidth: '100%' }}>
                        <h2 style={{ marginBottom: '10px', fontSize: '1.5rem', fontWeight: 800 }}>Resolve Complaint</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '25px' }}>Subject: <strong>{selectedComplaint.subject}</strong></p>
                        
                        <form onSubmit={handleResolve} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>RESOLUTION DETAILS / RESPONSE</label>
                                <textarea 
                                    rows="5" 
                                    placeholder="Explain how the issue was resolved or provide instructions..." 
                                    value={resolutionText}
                                    onChange={e => setResolutionText(e.target.value)}
                                    required
                                    style={{ 
                                        width: '100%', padding: '15px', borderRadius: '15px', 
                                        border: '1px solid #e2e8f0', outline: 'none', resize: 'none' 
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setSelectedComplaint(null)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '15px', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Send size={18} /> Resolve Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminComplaints;
