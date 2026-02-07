import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/styles/Navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  return (
    <>
      <nav className="navbar">
        <h2 className="logo">Agrimart</h2>

        {/* Hamburger */}
        {!menuOpen && (
          <div className="hamburger" onClick={() => setMenuOpen(true)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
          
          {menuOpen && (
            <div className="drawer-header">
              <span className="close-btn" onClick={() => setMenuOpen(false)}>
                ✕
              </span>
            </div>
          )}

          <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
          <li><Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link></li>
          <li><Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link></li>
          <li><Link to="/services" onClick={() => setMenuOpen(false)}>Services</Link></li>
          <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link></li>

          {/* AUTH SECTION */}
          {!isLoggedIn ? (
            <li>
              <Link
                to="/auth"
                className="nav-auth-btn"
                onClick={() => setMenuOpen(false)}
              >
                Login / Signup
              </Link>
            </li>
          ) : (
            <li>
              <button
                className="nav-profile-btn"
                onClick={() => {
                  navigate("/dashboard");
                  setMenuOpen(false);
                }}
                title="Profile"
              >
                👤
              </button>
            </li>
          )}
        </ul>
      </nav>

      {menuOpen && (
        <div className="nav-backdrop" onClick={() => setMenuOpen(false)} />
      )}
    </>
  );
};

export default Navbar;
