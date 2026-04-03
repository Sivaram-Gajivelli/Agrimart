import React, { useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Truck, 
  MapPin, 
  CreditCard, 
  MessageSquare, 
  BarChart, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import '../assets/styles/Admin.css';

const AdminLayout = () => {
  const { admin, loading, logoutContext, isAdminAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  if (loading) {
    return <div className="admin-loading">Loading...</div>;
  }

  // Protect Admin Routes
  if (!isAdminAuthenticated || !admin || admin.role !== 'admin') {
    return <Navigate to="/admin/login" />;
  }

  const handleLogout = async () => {
    await logoutContext('admin');
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/admin/users', name: 'User Management', icon: <Users size={20} /> },
    { path: '/admin/products', name: 'Product Management', icon: <Package size={20} /> },
    { path: '/admin/orders', name: 'Orders', icon: <ShoppingCart size={20} /> },
    { path: '/admin/hubs', name: 'Hubs', icon: <MapPin size={20} /> },
    { path: '/admin/deliveries', name: 'Delivery Management', icon: <Truck size={20} /> },
    { path: '/admin/payments', name: 'Payments', icon: <CreditCard size={20} /> },
    { path: '/admin/complaints', name: 'Complaints', icon: <MessageSquare size={20} /> },
    { path: '/admin/reports', name: 'Reports & Analytics', icon: <BarChart size={20} /> },
    { path: '/admin/settings', name: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-sidebar-header">
          <h2>Agrimart Admin</h2>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="admin-sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => (isActive ? 'active-link' : '')}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="admin-logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main-content">
        <header className="admin-topbar">
          <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} />
          </button>
          <div className="admin-topbar-profile">
            <span className="admin-badge">Admin</span>
            <span>{admin.name}</span>
          </div>
        </header>
        
        <div className="admin-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

