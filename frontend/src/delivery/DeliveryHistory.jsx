import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Clock, CheckCircle, Truck, MapPin, History, Inbox, RefreshCw, Star } from 'lucide-react';
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
      <RefreshCw className="animate-spin" style={{ marginRight: '10px' }} /> Loading History...
    </div>
  );

  return (
    <div style={{ padding: '10px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ marginBottom: '8px', fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>Delivery History</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Review and track every successful logistics milestone you've achieved.</p>
      </header>

      {history.length === 0 ? (
        <div style={{ 
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)', 
          padding: '80px 40px', 
          borderRadius: '32px', 
          textAlign: 'center', 
          border: '2px dashed #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ 
            width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' 
          }}>
            <Inbox size={48} color="#94a3b8" />
          </div>
          <h3 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Your history is a blank slate</h3>
          <p style={{ color: '#64748b', maxWidth: '300px', margin: '0 auto', fontSize: '1rem', lineHeight: '1.6' }}>
            Complete your first assignment and it will be permanently recorded here with full details.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {history.map((item) => (
            <div 
              key={item._id} 
              style={{ 
                background: 'white', 
                borderRadius: '24px', 
                padding: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                transition: 'transform 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ 
                width: '60px', height: '60px', borderRadius: '18px', 
                background: item.type === 'Pickup' ? '#fff7ed' : '#ecfdf5', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                {item.type === 'Pickup' ? <Package size={28} color="#f59e0b" /> : <Truck size={28} color="#10b981" />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                    {item.type === 'Pickup' ? 'Farmer Pickup' : 'Customer Delivery'}
                  </h4>
                  <span style={{ 
                    fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', 
                    background: '#f1f5f9', color: '#475569', fontWeight: 600, letterSpacing: '0.05em' 
                  }}>
                    #{item.order?._id?.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} color="#94a3b8" /> Completed {new Date(item.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} color="#94a3b8" /> {item.type === 'Pickup' ? 'Assigned Hub' : 'Customer Address'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ 
                  background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '100px', 
                  fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' 
                }}>
                  <CheckCircle size={14} /> SUCCESS
                </div>
                {item.rating ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '4px 10px', borderRadius: '8px' }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b45309' }}>{item.rating}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Pending Rating</span>
                )}
                {item.feedback && (
                  <div style={{ 
                    marginTop: '4px', maxWidth: '200px', fontSize: '0.75rem', color: '#64748b', 
                    background: '#f8fafc', padding: '6px', borderRadius: '8px', border: '1px solid #f1f5f9',
                    fontStyle: 'italic', textAlign: 'left'
                  }}>
                    "{item.feedback}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory;
