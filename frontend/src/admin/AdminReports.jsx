import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingBag, Users, Layers, Calendar, Download, RefreshCw } from 'lucide-react';
import '../assets/styles/AdminUsers.css';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AdminReports = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/reports/analytics', { withCredentials: true });
            setData(res.data);
        } catch (err) {
            toast.error('Failed to fetch analytics data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const salesChartData = data?.stats.map(s => ({
        name: monthNames[s._id - 1],
        sales: s.sales,
        orders: s.orders,
        revenue: s.platformRevenue
    })) || [];

    const categoryData = data?.categoryStats.map(c => ({
        name: c._id || 'Uncategorized',
        value: c.count
    })) || [];

    return (
        <div className="admin-users-container">
            <div className="admin-users-header">
                <div>
                    <h1 className="admin-page-title">Reports & Analytics</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '-15px' }}>
                        Performance overview of the Agrimart ecosystem.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="refresh-btn" onClick={fetchReports}><RefreshCw size={18} /> Refresh</button>
                    <button className="refresh-btn" style={{ background: '#2563eb', color: 'white' }}><Download size={18} /> Export Data</button>
                </div>
            </div>

            {loading ? <div className="admin-loading">Crunching Data...</div> : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: 'white', padding: '25px', borderRadius: '25px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '15px', borderRadius: '20px' }}><TrendingUp size={24} /></div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>TOTAL SALES VOLUME</p>
                                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>₹{salesChartData.reduce((acc, v) => acc + v.sales, 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div style={{ background: 'white', padding: '25px', borderRadius: '25px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: '#f0fdf4', color: '#10b981', padding: '15px', borderRadius: '20px' }}><ShoppingBag size={24} /></div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>TOTAL ORDERS</p>
                                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{salesChartData.reduce((acc, v) => acc + v.orders, 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div style={{ background: 'white', padding: '25px', borderRadius: '25px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: '#faf5ff', color: '#8b5cf6', padding: '15px', borderRadius: '20px' }}><Layers size={24} /></div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>PLATFORM EARNINGS</p>
                                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>₹{salesChartData.reduce((acc, v) => acc + v.revenue, 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' }}>
                        <div style={{ background: 'white', padding: '30px', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 25px', fontSize: '1.2rem', fontWeight: 800 }}>Revenue Growth (Monthly)</h3>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesChartData}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ dy: 10, fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v}`} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}
                                            formatter={(val) => [`₹${val.toFixed(2)}`, 'Sales']}
                                        />
                                        <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: '30px', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 25px', fontSize: '1.2rem', fontWeight: 800 }}>Category Distribution</h3>
                            <div style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryData} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '20px' }}>
                                    {categoryData.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{c.name}</span>
                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>({c.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'white', padding: '30px', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 25px', fontSize: '1.2rem', fontWeight: 800 }}>Orders Count vs. Earnings</h3>
                        <div style={{ height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ dy: 10, fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="orders" fill="#10b981" radius={[8, 8, 0, 0]} barSize={40} />
                                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminReports;
