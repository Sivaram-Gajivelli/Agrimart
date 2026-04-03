import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, MapPin, Trash2, RefreshCw } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

const AdminHubs = () => {
    const [hubs, setHubs] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchHubs();
    }, []);

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <h1 className="admin-page-title">Hub Management</h1>
                <button className="refresh-btn" style={{ background: 'var(--primary)', color: 'white' }}>
                    <Plus size={18} /> Add Hub
                </button>
            </div>

            <div className="table-wrapper">
                {loading ? <div className="admin-loading">Loading hubs...</div> : (
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
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No hubs found. Add your first hub!</td></tr>
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
                                            <button className="action-btn reject"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminHubs;

