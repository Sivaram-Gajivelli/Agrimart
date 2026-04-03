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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/admin/stats', {
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
  }, []);

  if (loading || !stats) {
    return <div className="admin-loading">Loading Dashboard...</div>;
  }

  const chartData = stats.chartData;

  const statCards = [
    { title: "Total Farmers", value: stats.farmers, icon: <UserCheck />, color: "bg-green-100 text-green-600" },
    { title: "Total Customers", value: stats.customers, icon: <Users />, color: "bg-blue-100 text-blue-600" },
    { title: "Total Retailers", value: stats.retailers, icon: <Store />, color: "bg-purple-100 text-purple-600" },
    { title: "Total Orders", value: stats.totalOrders, icon: <ShoppingBag />, color: "bg-yellow-100 text-yellow-600" },
    { title: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: <DollarSign />, color: "bg-emerald-100 text-emerald-600" },
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
          <h2>Orders per day</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f4f7f6'}} />
                <Bar dataKey="orders" fill="#27ae60" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-box">
          <h2>Revenue per day (₹)</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2980b9" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

