import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, 
  User, 
  MapPin, 
  Truck, 
  Clock, 
  CheckCircle,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'react-toastify';
import '../assets/styles/Admin.css';

const AdminAssignedOrders = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/delivery/assignments', { withCredentials: true });
      setAssignments(res.data);
    } catch (err) {
      console.error('Fetch Assignments Error:', err);
      toast.error('Failed to load assigned orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const filteredAssignments = assignments.filter(asng => {
    const orderId = asng.order?._id?.toLowerCase() || '';
    const agentName = asng.agent?.name?.toLowerCase() || '';
    const matchesSearch = orderId.includes(searchTerm.toLowerCase()) || agentName.includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || asng.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p>Loading assigned orders...</p>
      </div>
    );
  }

  return (
    <div className="admin-assigned-orders">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '5px' }}>Assigned Orders</h1>
          <p style={{ color: '#64748b' }}>Track automated and manual delivery assignments in real-time.</p>
        </div>
        <button 
          onClick={fetchAssignments}
          style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer' }}
        >
          Refresh Data
        </button>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Agent Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Filter size={20} color="#64748b" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: 'white', fontWeight: 600 }}
          >
            <option value="all">All Types</option>
            <option value="pickup">Pickup (Farmer ➔ Hub)</option>
            <option value="delivery">Delivery (Hub ➔ Customer)</option>
          </select>
        </div>
      </div>

      {/* Assignments List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {filteredAssignments.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', background: 'white', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
            <Package size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No matching assignments found.</p>
          </div>
        ) : (
          filteredAssignments.map(asng => (
            <div key={asng._id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
              {/* Badge for Type */}
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px 16px', background: asng.type === 'Pickup' ? '#fff7ed' : '#eff6ff', color: asng.type === 'Pickup' ? '#f59e0b' : '#3b82f6', borderBottomLeftRadius: '16px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {asng.type}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</span>
                <h3 style={{ margin: '4px 0', fontSize: '1.25rem', fontWeight: 800 }}>#{asng.order?._id?.slice(-8).toUpperCase()}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.75rem', marginBottom: '8px' }}>
                    <Truck size={14} /> ASSIGNED AGENT
                  </div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{asng.agent?.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{asng.agent?.phone}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.75rem', marginBottom: '8px' }}>
                    <Clock size={14} /> STATUS
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, color: asng.status === 'Delivered' ? '#10b981' : '#f59e0b' }}>
                    {asng.status}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Since {new Date(asng.assignedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {asng.type === 'Pickup' ? (
                      <>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>PICKUP FROM (FARMER)</p>
                        <p style={{ margin: '4px 0', fontWeight: 600 }}>{asng.order?.items?.[0]?.farmer?.name || 'Unknown Farmer'}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{asng.order?.items?.[0]?.farmer?.address || 'N/A'}</p>
                      </>
                    ) : (
                      <>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>DELIVER TO (CUSTOMER)</p>
                        <p style={{ margin: '4px 0', fontWeight: 600 }}>{asng.order?.buyer?.name || 'Customer'}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{asng.order?.deliveryAddress || 'N/A'}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAssignedOrders;
