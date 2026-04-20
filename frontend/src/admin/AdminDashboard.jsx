import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, UserCheck, Store, ShoppingBag, 
  DollarSign, Truck, AlertTriangle, Calendar 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import '../assets/styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState('weekly');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`/api/admin/stats?period=${revenuePeriod}`, {
          withCredentials: true
        });
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch admin stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [revenuePeriod]);

  if (loading || !stats) {
    return <div className="admin-loading">Loading Dashboard...</div>;
  }

  const chartData = stats.chartData;
  const currentRevenue = stats.periodRevenue?.[revenuePeriod] || 0;

  const statCards = [
    { title: "Total Farmers", value: stats.farmers, icon: <UserCheck />, color: "bg-green-100 text-green-600" },
    { title: "Total Customers", value: stats.customers, icon: <Users />, color: "bg-blue-100 text-blue-600" },
    { title: "Total Products", value: stats.totalProducts, icon: <ShoppingBag />, color: "bg-purple-100 text-purple-600" },
    { title: "Total Orders", value: stats.totalOrders, icon: <ShoppingBag />, color: "bg-yellow-100 text-yellow-600" },
    { 
      title: "Total Revenue", 
      value: `₹${Number(stats.totalRevenue || 0).toLocaleString()}`, 
      icon: <DollarSign />, 
      color: "bg-emerald-100 text-emerald-600"
    },
    { title: "Pending Deliveries", value: stats.pendingDeliveries, icon: <Truck />, color: "bg-orange-100 text-orange-600" },
    { title: "Complaints / Tickets", value: stats.complaints, icon: <AlertTriangle />, color: "bg-red-100 text-red-600" },
    { title: "Today's Orders", value: stats.todaysOrders, icon: <Calendar />, color: "bg-indigo-100 text-indigo-600" }
  ];

  return (
    <div className="admin-dashboard">
      <h1 className="admin-page-title">Dashboard Overview</h1>
      
      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card">
            <div className={`stat-icon ${card.color.split(' ')[0]}`}>
              {React.cloneElement(card.icon, { className: card.color.split(' ')[1] })}
            </div>
            <div className="stat-info">
              <h3>{card.title}</h3>
              <p className="stat-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-container">
        <div className="chart-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Revenue Analysis (₹)</h2>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
              {['weekly', 'monthly', 'yearly'].map(p => (
                <button 
                  key={p}
                  onClick={() => setRevenuePeriod(p)}
                  style={{
                    padding: '6px 16px', borderRadius: '8px', border: 'none',
                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                    textTransform: 'capitalize',
                    background: revenuePeriod === p ? 'white' : 'transparent',
                    color: revenuePeriod === p ? '#1e293b' : '#64748b',
                    boxShadow: revenuePeriod === p ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(val) => `₹${Number(val).toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} 
                  activeDot={{r: 8, strokeWidth: 0}} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-box">
          <h2>Order Frequency</h2>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

