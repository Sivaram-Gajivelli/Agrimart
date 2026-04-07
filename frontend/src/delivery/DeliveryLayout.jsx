import React, { useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  History, 
  User, 
  LogOut,
  Menu,
  X,
  Truck
} from 'lucide-react';
import '../assets/styles/Delivery.css';

const DeliveryLayout = () => {
  const { deliveryAgent, loading, logoutContext, isDeliveryAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Agent Portal...</div>;
  }

  // Protect Delivery Routes
  if (!isDeliveryAuthenticated || !deliveryAgent || deliveryAgent.role !== 'delivery_partner') {
    return <Navigate to="/delivery/login" />;
  }

  const handleLogout = async () => {
    await logoutContext('delivery');
    navigate('/delivery/login');
  };

  const navItems = [
    { path: '/delivery/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/delivery/assigned', name: 'Assigned Orders', icon: <Package size={20} /> },
    { path: '/delivery/history', name: 'Delivery History', icon: <History size={20} /> },
    { path: '/delivery/profile', name: 'Profile', icon: <User size={20} /> },
  ];

  return (
    <div className="delivery-layout notranslate skiplocalize" translate="no">
      {/* Sidebar */}
      <aside className={`delivery-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="delivery-sidebar-header">
          <h2><Truck size={24} style={{ marginRight: '10px' }} /> AGRIMART</h2>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="delivery-sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="delivery-sidebar-footer">
          <button onClick={handleLogout} className="delivery-logout-btn">
            <LogOut size={20} style={{ marginRight: '10px' }} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="delivery-main-content">
        <header className="delivery-topbar">
          <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: '#1e1b4b', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', padding: '6px' }}>
            <Menu size={24} />
          </button>
          <div className="delivery-topbar-profile">
            <span className="delivery-agent-badge">Delivery Agent</span>
            <span style={{ fontWeight: 600 }}>{deliveryAgent.name}</span>
          </div>
        </header>
        
        <div className="delivery-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DeliveryLayout;
