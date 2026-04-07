import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartSidebar from "./components/CartSidebar";
import Chatbot from "./components/Chatbot";
import { useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

const MainLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isCustomer = user?.role === "customer";
  const isCartPage = location.pathname === "/cart";
  const isCheckoutPage = location.pathname === "/checkout";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <main style={{ flex: 1, minWidth: 0 }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        {isCustomer && !isCartPage && !isCheckoutPage && location.pathname !== '/orders' && <CartSidebar />}
      </div>
      <Chatbot />
      <Footer />
    </div>
  );
};

export default MainLayout;

