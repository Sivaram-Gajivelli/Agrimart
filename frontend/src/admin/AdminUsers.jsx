import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Ban, RefreshCw, Eye } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('farmer');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3000/api/admin/users?role=${activeTab}`, {
        withCredentials: true
      });
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to fetch users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await axios.put(`http://localhost:3000/api/admin/users/${userId}/status`, {
        status: newStatus
      }, { withCredentials: true });
      
      toast.success(`User status updated to ${newStatus}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="badge badge-success">Active</span>;
      case 'pending': return <span className="badge badge-warning">Pending</span>;
      case 'blocked': return <span className="badge badge-danger">Blocked</span>;
      case 'rejected': return <span className="badge badge-error">Rejected</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="admin-users-container">
      <div className="admin-users-header">
        <h1 className="admin-page-title">User Management</h1>
        <button onClick={fetchUsers} className="refresh-btn">
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="users-tabs">
        {['farmer', 'customer', 'retailer', 'delivery_partner'].map(role => (
          <button 
            key={role}
            className={`tab-btn ${activeTab === role ? 'active' : ''}`}
            onClick={() => setActiveTab(role)}
          >
            {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}s
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="admin-loading">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="no-data">No {activeTab}s found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Phone</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>
                    <div className="user-name">
                      {user.name}
                      {user.isVerified && <CheckCircle size={14} className="verified-icon" title="Email Verified" />}
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      {user.email && <div>{user.email}</div>}
                      {user.phone && <div className="user-phone">{user.phone}</div>}
                    </div>
                  </td>
                  <td>{getStatusBadge(user.status)}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn view" title="View Details">
                        <Eye size={16} />
                      </button>
                      
                      {user.status === 'pending' && (
                        <>
                          <button 
                            className="action-btn approve" 
                            title="Approve"
                            onClick={() => handleStatusChange(user._id, 'active')}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            className="action-btn reject" 
                            title="Reject"
                            onClick={() => handleStatusChange(user._id, 'rejected')}
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}

                      {user.status === 'active' && (
                        <button 
                          className="action-btn block" 
                          title="Block User"
                          onClick={() => handleStatusChange(user._id, 'blocked')}
                        >
                          <Ban size={16} />
                        </button>
                      )}

                      {user.status === 'blocked' && (
                        <button 
                          className="action-btn unblock" 
                          title="Unblock User"
                          onClick={() => handleStatusChange(user._id, 'active')}
                        >
                          <CheckCircle size={16} />
                        </button>
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

export default AdminUsers;
