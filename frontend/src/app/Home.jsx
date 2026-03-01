import React from 'react';
import { useAuth } from '../context/AuthContext';
import HeroSection from '../components/HeroSection';
import LivePrices from '../components/LivePrices';
import ProductsSection from '../components/ProductsSection';

// Role Home Components
import CustomerHome from './CustomerHome';
import FarmerHome from './FarmerHome';
import RetailerHome from './RetailerHome';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    switch (user.role) {
      case 'customer':
        return <CustomerHome />;
      case 'farmer':
        return <FarmerHome />;
      case 'retailer':
        return <RetailerHome />;
      default:
        break;
    }
  }

  // Default Landing Page for unauthenticated users
  return (
    <>
      <HeroSection />
      <LivePrices />
      <ProductsSection />
    </>
  );
};

export default Home