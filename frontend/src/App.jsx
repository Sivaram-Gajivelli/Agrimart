import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/prices" element={<Prices />} />
          </Route>


          <Route path="/auth" element={<RoleSelect />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/signup/:role" element={<Signup />} />
          <Route path="/forgot-password/verify" element={<ForgotPasswordVerify />} />
          <Route path="/forgot-password/reset" element={<ForgotPasswordReset />} />
        </Routes>
      </AuthProvider>
    </>
  );
}

export default App;
