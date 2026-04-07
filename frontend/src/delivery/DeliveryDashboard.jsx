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
  const [isOnline, setIsOnline] = useState(false);
  const [assignedHub, setAssignedHub] = useState(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, userRes] = await Promise.all([
            axios.get('/api/delivery/stats', { withCredentials: true }),
            axios.get('/api/delivery/check-auth', { withCredentials: true })
        ]);
        setStats(statsRes.data);
        setIsOnline(userRes.data?.user?.isOnline || false);
        setAssignedHub(userRes.data?.user?.assignedHub || null);
      } catch (err) {
        toast.error('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleOnline = async () => {
    setToggling(true);
    const newStatus = !isOnline;

    try {
        let location = { latitude: null, longitude: null };

        if (newStatus) {
            // Get current location when going online
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            }).catch(() => null);

            if (pos) {
                location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            } else {
                toast.warning("Could not get precise location. Hub assignment might be inaccurate.");
            }
        }

        const res = await axios.put('/api/user/toggle-online', { 
            isOnline: newStatus,
            ...location
        }, { withCredentials: true });

        setIsOnline(res.data.isOnline);
        setAssignedHub(res.data.assignedHub);
        toast.success(newStatus ? `You are now ONLINE at ${res.data.assignedHub?.name || 'Nearest Hub'}` : "You are now OFFLINE");
    } catch (err) {
        toast.error("Failed to update online status");
    } finally {
        setToggling(false);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0 }}>Welcome Back!</h1>
            {stats.deliveryRating !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '4px 12px', borderRadius: '100px', border: '1px solid #fde68a' }}>
                    <span style={{ color: '#d97706', fontSize: '1.1rem' }}>★</span>
                    <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.9rem' }}>{stats.deliveryRating?.toFixed(1) || '0.0'}</span>
                    <span style={{ color: '#d97706', fontSize: '0.75rem', marginLeft: '2px' }}>({stats.totalRatings || 0})</span>
                </div>
            )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '8px 16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isOnline ? '#10b981' : '#ef4444' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            <button 
                onClick={handleToggleOnline}
                disabled={toggling}
                style={{ 
                    width: '44px', height: '24px', borderRadius: '12px', 
                    backgroundColor: isOnline ? '#10b981' : '#e2e8f0', 
                    position: 'relative', border: 'none', cursor: 'pointer',
                    transition: 'all 0.3s'
                }}
            >
                <div style={{ 
                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                    position: 'absolute', top: '3px', left: isOnline ? '23px' : '3px',
                    transition: 'all 0.3s'
                }} />
            </button>
        </div>
      </div>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>
        {isOnline 
            ? (assignedHub ? `Assigned to: ${assignedHub.name} Hub` : "Waiting for hub assignment...") 
            : "Go online to start receiving assignments nearby."}
      </p>

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
