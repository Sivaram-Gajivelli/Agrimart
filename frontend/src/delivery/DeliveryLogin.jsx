import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import '../assets/styles/Delivery.css';

const DeliveryLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginContext, isDeliveryAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDeliveryAuthenticated) {
      navigate('/delivery/dashboard');
    }
  }, [isDeliveryAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await axios.post('/api/delivery/login', {
        email,
        password
      }, { withCredentials: true });

      loginContext(res.data.user);
      toast.success('Delivery Agent logged in successfully');
      navigate('/delivery/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="delivery-login-container">
      <div className="delivery-login-box">
        <div className="delivery-login-header">
          <h2>Agrimart Logistics</h2>
          <p>Delivery Agent Portal</p>
        </div>
        <form onSubmit={handleLogin} className="delivery-login-form">
          <div className="input-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="agent@agrimart.com"
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
          <button type="submit" disabled={isLoading} className="delivery-login-btn">
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeliveryLogin;
