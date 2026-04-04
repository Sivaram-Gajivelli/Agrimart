import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, MapPin, Phone, Truck, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import '../assets/styles/Delivery.css';

const AssignedOrders = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get('/api/delivery/assignments', { withCredentials: true });
      setAssignments(res.data);
    } catch (err) {
      toast.error('Failed to fetch assigned orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.put(`/api/delivery/assignments/${id}/status`, { status }, { withCredentials: true });
      toast.success(`Order marked as ${status}`);
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  if (loading) return <div>Loading Assignments...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '8px', fontSize: '1.875rem', fontWeight: 800 }}>Assigned Orders</h1>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>Track your active tasks and update their progression.</p>

      {assignments.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <Package size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: '#1e293b' }}>No active assignments</h3>
          <p style={{ color: '#64748b' }}>Check back later for new pickup or delivery tasks.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {assignments.map((asng) => {
            const isPickup = asng.type === 'Pickup';
            const order = asng.order;
            const items = order?.items || [];
            const isExpanded = expandedId === asng._id;

            return (
              <div 
                key={asng._id} 
                style={{ 
                  background: 'white', 
                  borderRadius: '20px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '16px', background: isPickup ? '#fff7ed' : '#eff6ff', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {isPickup ? <Package size={32} color="#f59e0b" /> : <Truck size={32} color="#3b82f6" />}
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{isPickup ? 'Farmer Pickup' : 'Customer Delivery'}</h3>
                      <span style={{ 
                        background: '#f1f5f9', color: '#475569', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 
                      }}>
                        #{order?._id?.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                      Status: <span style={{ fontWeight: 600, color: asng.status === 'Picked Up' ? '#3b82f6' : '#f59e0b' }}>{asng.status}</span>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {asng.status === 'Assigned' && (
                      <button 
                        onClick={() => handleUpdateStatus(asng._id, 'Picked Up')}
                        style={{ 
                          padding: '10px 20px', borderRadius: '12px', border: '1px solid #d1d5db', background: 'white', 
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
                        }}
                      >
                        <Truck size={18} /> Mark Picked Up
                      </button>
                    )}
                    {asng.status === 'Picked Up' && (
                      <button 
                        onClick={() => handleUpdateStatus(asng._id, 'Delivered')}
                        style={{ 
                          padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', 
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
                        }}
                      >
                        <CheckCircle size={18} /> Mark Delivered
                      </button>
                    )}
                    <button 
                      onClick={() => setExpandedId(isExpanded ? null : asng._id)}
                      style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid #f1f5f9', background: '#fcfcfc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginTop: '24px' }}>
                      <div>
                        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '16px' }}>
                          {isPickup ? 'Pick Up From' : 'Deliver To'}
                        </h4>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <MapPin size={20} color="#6366f1" style={{ flexShrink: 0 }} />
                          <div>
                            <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>{isPickup ? items[0]?.farmer?.name : order?.buyer?.name}</p>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.925rem', color: '#475569', lineHeight: 1.5 }}>
                              {isPickup ? items[0]?.farmer?.address : order?.deliveryAddress}
                            </p>
                            <a 
                              href={`tel:${isPickup ? items[0]?.farmer?.phone : order?.buyer?.phone}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}
                            >
                              <Phone size={14} /> {isPickup ? items[0]?.farmer?.phone : order?.buyer?.phone || 'Contact Buyer'}
                            </a>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '16px' }}>Items Details</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden' }}>
                                {item.product?.image ? <img src={item.product?.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Package size={20} style={{ padding: '10px' }} color="#94a3b8" />}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: 500, fontSize: '0.925rem' }}>{item.product?.productName}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{item.quantity} {item.product?.unit || 'kg'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignedOrders;
