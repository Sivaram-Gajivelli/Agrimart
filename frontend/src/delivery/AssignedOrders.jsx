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
        <div style={{ background: 'white', padding: '100px 30px', borderRadius: '24px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <Package size={48} color="#cbd5e1" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Your queue is currently empty</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
            New tasks will appear here as soon as farmers mark their produce as ready for pickup. Make sure you are online to receive the nearest assignments.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {assignments.map((asng) => {
            const isPickup = asng.type === 'Pickup';
            const order = asng.order;
            const product = asng.product;
            const items = order?.items || (product ? [{ product, farmer: product.farmer }] : []);
            const isExpanded = expandedId === asng._id;

            return (
              <div 
                key={asng._id} 
                style={{ 
                  background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden',
                  boxShadow: isExpanded ? '0 10px 30px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s ease',
                  marginBottom: '20px'
                }}
              >
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '56px', height: '56px', borderRadius: '16px', background: isPickup ? '#fef3c7' : '#dcfce7',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Package color={isPickup ? '#d97706' : '#16a34a'} size={28} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {isPickup ? (order ? 'Customer Pickup' : 'Stocking Pickup') : 'Customer Delivery'}
                      </span>
                      <h3 style={{ margin: '4px 0 0 0', fontSize: '1.125rem', fontWeight: 800, color: '#1e293b' }}>
                        {order ? `Order #${order._id.slice(-8).toUpperCase()}` : `Stocking #${asng._id.slice(-8).toUpperCase()}`}
                      </h3>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Status</p>
                      <p style={{ margin: 0, fontWeight: 700, color: asng.status === 'Assigned' ? '#f59e0b' : '#10b981' }}>{asng.status}</p>
                    </div>

                    {asng.status === 'Assigned' && (
                      <button 
                        onClick={() => handleUpdateStatus(asng._id, 'Picked Up')}
                        style={{ 
                          padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#6366f1', color: 'white', 
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
                            <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>{isPickup ? (order ? items[0]?.farmer?.name : product?.farmer?.name) : order?.buyer?.name}</p>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.925rem', color: '#475569', lineHeight: 1.5 }}>
                              {isPickup ? (order ? items[0]?.farmer?.address : product?.manualLocation || product?.farmer?.manualLocation || product?.farmer?.address) : order?.deliveryAddress}
                            </p>
                            <a 
                              href={`tel:${isPickup ? (order ? items[0]?.farmer?.phone : product?.farmer?.phone) : order?.buyer?.phone}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}
                            >
                              <Phone size={14} /> {isPickup ? (order ? items[0]?.farmer?.phone : product?.farmer?.phone) : order?.buyer?.phone || 'Contact Buyer'}
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
