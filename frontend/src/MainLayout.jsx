import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartSidebar from "./components/CartSidebar";
import { useAuth } from "./context/AuthContext";

const MainLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isCustomer = user?.role === "customer";
  const isCartPage = location.pathname === "/cart";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <main style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </main>
        {isCustomer && !isCartPage && <CartSidebar />}
      </div>
      <Footer />
    </div>
  );
};

export default MainLayout;
