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

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    navigate("/auth");
  };

  return (
    <>
      <nav className="navbar">
        <h2 className="logo">Agrimart</h2>

        {/* Hamburger (mobile only via CSS) */}
        {!menuOpen && (
          <div
            className="hamburger"
            onClick={() => setMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {/* Nav Links */}
        <ul className={`nav-links ${menuOpen ? "active" : ""}`}>
          
          {/* Drawer Header — render ONLY when open */}
          {menuOpen && (
            <div className="drawer-header">
              <span
                className="close-btn"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </span>
            </div>
          )}

          <li>
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          </li>
          <li>
            <Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link>
          </li>
          <li>
            <Link to="/buy" onClick={() => setMenuOpen(false)}>Buy/Sell</Link>
          </li>
          <li>
            <Link to="/services" onClick={() => setMenuOpen(false)}>Services</Link>
          </li>
          <li>
            <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</Link>
          </li>

          {/* AUTH BUTTON */}
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
            <>
              <li>
                <Link
                  to="/dashboard"
                  className="nav-auth-btn"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <button
                  className="nav-logout-btn"
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Backdrop — ONLY when drawer open */}
      {menuOpen && (
        <div
          className="nav-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
