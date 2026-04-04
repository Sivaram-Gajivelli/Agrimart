import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import '../assets/styles/Delivery.css';

const DeliveryDashboard = () => {
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pickupsPending: 0,
    outForDelivery: 0,
    deliveredToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/delivery/stats', { withCredentials: true });
        setStats(res.data);
      } catch (err) {
        toast.error('Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading Stats...</div>;

  const statConfig = [
    { 
      label: 'Orders Assigned', 
      value: stats.totalAssigned, 
      icon: <Package size={24} color="#6366f1" />, 
      bg: '#eef2ff' 
    },
    { 
      label: 'Pickups Pending', 
      value: stats.pickupsPending, 
      icon: <Clock size={24} color="#f59e0b" />, 
      bg: '#fff7ed' 
    },
    { 
      label: 'Out for Delivery', 
      value: stats.outForDelivery, 
      icon: <Truck size={24} color="#3b82f6" />, 
      bg: '#eff6ff' 
    },
    { 
      label: 'Delivered Today', 
      value: stats.deliveredToday, 
      icon: <CheckCircle size={24} color="#10b981" />, 
      bg: '#ecfdf5' 
    }
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '8px', fontSize: '1.875rem', fontWeight: 800 }}>Welcome Back!</h1>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>Here's what's happening with your deliveries today.</p>

      <div className="delivery-status-grid">
        {statConfig.map((stat, idx) => (
          <div key={idx} className="delivery-stat-card">
            <div className="delivery-stat-icon" style={{ backgroundColor: stat.bg }}>
              {stat.icon}
            </div>
            <div className="delivery-stat-info">
              <h3>{stat.label}</h3>
              <p>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
          <Package size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Ready for your next task?</h2>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 24px' }}>Check your assigned orders to start picking up and delivering produce to our customers.</p>
          <button 
            onClick={() => window.location.href='/delivery/assigned'}
            style={{ 
              backgroundColor: '#6366f1', 
              color: 'white', 
              padding: '12px 24px', 
              borderRadius: '12px', 
              border: 'none', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            View Assigned Orders
          </button>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
