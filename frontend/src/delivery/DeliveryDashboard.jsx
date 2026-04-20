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
  const [revenuePeriod, setRevenuePeriod] = useState('weekly');

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
        const location = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                (err) => reject(err),
                { timeout: 10000 }
            );
        }).catch(() => null);

        if (newStatus && !location) {
            const confirm = window.confirm("Location access denied. We'll use your last known zone. Continue?");
            if (!confirm) {
                setToggling(false);
                return;
            }
        }

        const res = await axios.put('/api/delivery/toggle-active', { 
            isOnline: newStatus,
            ...location
        }, { withCredentials: true });

        setIsOnline(res.data.isOnline);
        setAssignedHub(res.data.assignedHub);
        toast.success(newStatus ? `ACTIVATE: You are now ACTIVE at ${res.data.assignedHub?.name || 'Nearest Hub'}` : "DEACTIVATE: You are now INACTIVE");
    } catch (err) {
        toast.error("Failed to update status");
    } finally {
        setToggling(false);
    }
  };

  const GaugeMeter = ({ percentage }) => {
    const radius = 140;
    const stroke = 30;
    const normalizedRadius = radius - (stroke / 2);
    const circumference = normalizedRadius * Math.PI; 
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{ 
            position: 'relative', 
            width: radius * 2, 
            height: radius + 40, 
            margin: '0 auto', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'flex-start'
        }}>
            <svg height={radius + 20} width={radius * 2} style={{ filter: 'drop-shadow(0px 8px 16px rgba(99, 102, 241, 0.2))' }}>
                <defs>
                    <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <circle
                    stroke="#f1f5f9"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset: 0, transform: `rotate(-180deg)`, transformOrigin: `${radius}px ${radius}px` }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke="url(#gauge-gradient)"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ 
                        strokeDashoffset, 
                        transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)', 
                        transform: `rotate(-180deg)`, 
                        transformOrigin: `${radius}px ${radius}px` 
                    }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    filter="url(#glow)"
                />
            </svg>
            <div style={{
                position: 'absolute', 
                top: '50%', 
                left: '50%',
                transform: 'translate(-50%, 0%)',
                textAlign: 'center',
                width: '100%'
            }}>
                <span style={{ 
                    fontSize: '4.5rem', 
                    fontWeight: 900, 
                    color: '#1e293b', 
                    display: 'block', 
                    lineHeight: 0.85,
                    background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    {percentage.toFixed(0)}%
                </span>
                <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 800, 
                    color: '#94a3b8', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.2em',
                    marginTop: '12px',
                    display: 'inline-block'
                }}>
                    Performance
                </span>
            </div>
        </div>
    );
  };

  if (loading) return <div>Loading Stats...</div>;

  const currentRevenue = stats.earnings?.[revenuePeriod] || 0;

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

  const successRate = (stats.deliveryRating || 0) * 20; // Transform 5 stars to 100%

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
                {isOnline ? 'ACTIVE' : 'INACTIVE'}
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
            ? (assignedHub ? `Zone: ${assignedHub.name} Hub` : "Waiting for zone alignment...") 
            : "Activate your toggle to start receiving assignments nearby."}
      </p>

      {/* Hero Stats Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 2fr', gap: '24px', marginBottom: '32px' }}>
          {/* Semicircle Gauge Card */}
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 8px 16px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GaugeMeter percentage={successRate} />
          </div>

          {/* Revenue & Period Selection Card */}
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings Overview</h3>
                      <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, color: '#1e293b' }}>₹{currentRevenue.toLocaleString()}</p>
                  </div>
                  <select 
                      value={revenuePeriod} 
                      onChange={(e) => setRevenuePeriod(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, color: '#475569', cursor: 'pointer', outline: 'none' }}
                  >
                      <option value="weekly">Current Week</option>
                      <option value="monthly">Current Month</option>
                      <option value="yearly">Full Year</option>
                  </select>
              </div>

              <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, padding: '16px', borderRadius: '16px', background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '8px' }}>Lifetime Balance</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#166534' }}>₹{Number(stats.revenue || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ flex: 1, padding: '16px', borderRadius: '16px', background: '#f5f3ff', border: '1px solid #ede9fe' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '8px' }}>Payout Status</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#5b21b6' }}>Verified</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="delivery-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {statConfig.map((stat, idx) => (
          <div key={idx} className="delivery-stat-card" style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
