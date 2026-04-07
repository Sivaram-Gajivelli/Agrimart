import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import "./assets/styles/App.css";
import MainLayout from "./MainLayout";
import Home from "./app/Home";
import About from "./app/About";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import RoleSelect from "./auth/RoleSelect";
import ForgotPasswordVerify from "./auth/ForgotPasswordVerify";
import ForgotPasswordReset from "./auth/ForgotPasswordReset";
import Dashboard from "./app/Dashboard";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


import Products from "./app/Products";
import Services from "./app/Services";
import Contact from "./app/Contact";
import Prices from "./app/Prices";
import SellProduce from "./app/SellProduce";
import MyProducts from "./app/MyProducts";
import OrdersReceived from "./app/OrdersReceived";
import FarmerStock from "./app/FarmerStock";
import PricePrediction from "./app/PricePrediction";
import ProductDetails from "./app/ProductDetails";
import Cart from "./app/Cart";
import Checkout from "./app/Checkout";
import CartSidebar from "./components/CartSidebar";
import CustomerOrders from "./app/CustomerOrders";
import ShippingPolicy from "./app/ShippingPolicy";
import Profile from "./app/Profile";

/**
 * Admin component imports for the administration dashboard and related management views.
 */
import AdminLogin from "./admin/AdminLogin";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminProducts from "./admin/AdminProducts";
import AdminOrders from "./admin/AdminOrders";
import AdminHubs from "./admin/AdminHubs";
import AdminDeliveries from "./admin/AdminDeliveries";

import AdminSettings from "./admin/AdminSettings";
import AdminPayments from "./admin/AdminPayments";
import AdminComplaints from "./admin/AdminComplaints";
import AdminReports from "./admin/AdminReports";

/**
 * Delivery Agent portal imports
 */
import DeliveryLogin from "./delivery/DeliveryLogin";
import DeliveryLayout from "./delivery/DeliveryLayout";
import DeliveryDashboard from "./delivery/DeliveryDashboard";
import AssignedOrders from "./delivery/AssignedOrders";
import DeliveryHistory from "./delivery/DeliveryHistory";
import DeliveryProfile from "./delivery/DeliveryProfile";

function App() {
  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />

      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/prices" element={<Prices />} />
              <Route path="/sell-produce" element={<SellProduce />} />
              <Route path="/my-products" element={<MyProducts />} />
              <Route path="/orders-received" element={<OrdersReceived />} />
              <Route path="/revenue" element={<OrdersReceived />} />
              <Route path="/farmer-stock" element={<FarmerStock />} />
              <Route path="/price-prediction" element={<PricePrediction />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<CustomerOrders />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/profile" element={<Profile />} />
            </Route>


            <Route path="/auth" element={<RoleSelect />} />
            <Route path="/login/:role" element={<Login />} />
            <Route path="/signup/:role" element={<Signup />} />
            <Route path="/forgot-password/verify" element={<ForgotPasswordVerify />} />
            <Route path="/forgot-password/reset" element={<ForgotPasswordReset />} />

            {/* Admin Authentication and Dashboard Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="products" element={<AdminProducts />} />
               <Route path="orders" element={<AdminOrders />} />
              <Route path="hubs" element={<AdminHubs />} />
              <Route path="deliveries" element={<AdminDeliveries />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="reports" element={<AdminReports />} />

              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Delivery Agent Authentication and Dashboard Routes */}
            <Route path="/delivery/login" element={<DeliveryLogin />} />
            <Route path="/delivery" element={<DeliveryLayout />}>
              <Route index element={<Navigate to="/delivery/dashboard" replace />} />
              <Route path="dashboard" element={<DeliveryDashboard />} />
              <Route path="assigned" element={<AssignedOrders />} />
              <Route path="history" element={<DeliveryHistory />} />
              <Route path="profile" element={<DeliveryProfile />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </>
  );
}

export default App;

