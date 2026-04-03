import React, { useState, useEffect } from 'react';
import LivePrices from '../components/LivePrices';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PhoneticTerm from '../components/PhoneticTerm';

const FarmerHome = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/dashboard/farmer-stats', {
                    credentials: 'include'
                });
                if (!response.ok) throw new Error('Failed to fetch dashboard stats');
                const data = await response.json();
                setStats(data);
            } catch (error) {
                console.error("Error fetching stats:", error);
                toast.error("Could not load dashboard statistics.");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <>
            {/* Farmer Dashboard Header View */}
            <div style={{ paddingTop: '100px', paddingBottom: '40px', textAlign: 'center', background: 'var(--primary-dark)', color: 'white' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                    <PhoneticTerm english="Farmer" te="ఫార్మర్" hi="फार्मर" ta="பார்மர்" kn="ಫಾರ್ಮರ್" ml="ഫാർമർ" mr="फार्मर" gu="ફાર્મર" pa="ਫਾਰਮਰ" bn="ফার্মার" or="ଫାର୍ମର୍" as="ফাৰ্মাৰ" /> <PhoneticTerm english="Portal" te="పోర్టల్" hi="पोर्टल" ta="போர்ட்டல்" kn="ಪೋರ್ಟಲ್" ml="പോർട്ടൽ" mr="पोर्टल" gu="પોર્ટલ" pa="ਪੋਰਟਲ" bn="পোর্টাল" or="ପୋର୍ଟାଲ୍" as="প’ৰ্টেল" />
                </h1>
                <p style={{ opacity: 0.9 }}>Manage your crops, track active listings, and stay updated on market trends.</p>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/sell-produce')} style={{ background: 'var(--secondary)', color: 'white' }}>+ Sell Produce</button>
                    <button className="btn btn-secondary" onClick={() => navigate('/revenue')} style={{ background: 'transparent', border: '2px solid white' }}>View My Sales</button>
                </div>
            </div>

            {/* Main Screen Summary Cards */}
            <div style={{ padding: '40px 5%', background: 'var(--bg-main)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--text-dark)', marginBottom: '10px', fontSize: '1.2rem' }}>Total Products Listed</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {loading ? '...' : stats.totalProducts}
                        </p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--text-dark)', marginBottom: '10px', fontSize: '1.2rem' }}>Total Orders Received</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {loading ? '...' : stats.totalOrders}
                        </p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--text-dark)', marginBottom: '10px', fontSize: '1.2rem' }}>Total Revenue</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {loading ? '...' : `₹${stats.totalRevenue.toLocaleString()}`}
                        </p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--text-dark)', marginBottom: '10px', fontSize: '1.2rem' }}>Pending Orders</h3>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                            {loading ? '...' : stats.pendingOrders}
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <h2 style={{ color: 'var(--primary)', marginBottom: '20px', textAlign: 'center' }}>Quick Actions</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '40px' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/add-product')} style={{ padding: '15px 30px', fontSize: '1.1rem' }}>Add New Product</button>
                    <button className="btn btn-secondary" onClick={() => navigate('/orders-received')} style={{ padding: '15px 30px', fontSize: '1.1rem' }}>View Orders</button>
                    <button className="btn btn-secondary" onClick={() => navigate('/my-products')} style={{ padding: '15px 30px', fontSize: '1.1rem' }}>My Products</button>
                </div>

                {/* Market Prices Overview */}
                <h2 style={{ color: 'var(--primary)', marginBottom: '20px', textAlign: 'center' }}>Current Market Trends</h2>
                <LivePrices />
            </div>
        </>
    );
};

export default FarmerHome;

