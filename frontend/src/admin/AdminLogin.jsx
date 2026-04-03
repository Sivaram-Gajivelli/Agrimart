import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import '../assets/styles/AdminLogin.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginContext, isAdminAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAdminAuthenticated) {
      const timer = setTimeout(() => {
        navigate('/admin/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAdminAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await axios.post('/api/admin/login', {
        email,
        password
      }, { withCredentials: true });

      // Update AuthContext
      loginContext(res.data.user);
      toast.success('Admin logged in successfully');
      
      // Hard redirect to ensure clean state and reliable dashboard access
      window.location.href = '/admin/dashboard';

    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <h2>Agrimart Admin</h2>
          <p>Sign in to your dashboard</p>
        </div>
        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="input-group">
            <label htmlFor="email">Admin Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@agrimart.com"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={isLoading} className="admin-login-btn">
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

