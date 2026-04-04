import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Clock, CheckCircle, Truck, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import '../assets/styles/Delivery.css';

const DeliveryHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/delivery/history', { withCredentials: true });
        setHistory(res.data);
      } catch (err) {
        toast.error('Failed to fetch delivery history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div>Loading History...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '8px', fontSize: '1.875rem', fontWeight: 800 }}>Delivery History</h1>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>Review your past pickups and deliveries.</p>

      {history.length === 0 ? (
        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <History size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: '#1e293b' }}>No history found</h3>
          <p style={{ color: '#64748b' }}>Completed tasks will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {history.map((item) => (
            <div 
              key={item._id} 
              style={{ 
                background: 'white', 
                borderRadius: '16px', 
                padding: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px',
                border: '1px solid #f1f5f9'
              }}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', background: item.type === 'Pickup' ? '#fff7ed' : '#ecfdf5', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {item.type === 'Pickup' ? <Package size={24} color="#f59e0b" /> : <CheckCircle size={24} color="#10b981" />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{item.type === 'Pickup' ? 'Farmer Pickup' : 'Customer Delivery'}</h4>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>#{item.order?._id?.slice(-8).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '4px', color: '#64748b', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Completed on {new Date(item.completedAt).toLocaleDateString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {item.type === 'Pickup' ? 'Hub Drop-off' : 'Home Delivery'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#10b981' }}>Success</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>ID: {item._id.slice(-6).toUpperCase()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory;
