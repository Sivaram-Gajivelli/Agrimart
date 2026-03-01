import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/styles/Navbar.css";

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, logoutContext } = useAuth();
  const navigate = useNavigate();

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

          {/* ROLE-SPECIFIC LINKS */}
          {(!isAuthenticated || !user) && (
            <>
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
              <li><Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link></li>
              <li><Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link></li>
              <li><Link to="/prices" onClick={() => setMenuOpen(false)}>Live Prices</Link></li>
            </>
          )}

          {isAuthenticated && user?.role === "customer" && (
            <>
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
              <li><Link to="/products?category=Vegetables" onClick={() => setMenuOpen(false)}>Vegetables</Link></li>
              <li><Link to="/products?category=Fruits" onClick={() => setMenuOpen(false)}>Fruits</Link></li>
              <li><Link to="/products?category=Grains" onClick={() => setMenuOpen(false)}>Grains & Pulses</Link></li>
              <li><Link to="/cart" onClick={() => setMenuOpen(false)}>Cart</Link></li>
              <li><Link to="/orders" onClick={() => setMenuOpen(false)}>Orders</Link></li>
              <li className="nav-search-item">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="nav-search-input"
                />
              </li>
            </>
          )}

          {isAuthenticated && user?.role === "farmer" && (
            <>
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
              <li><Link to="/my-listings" onClick={() => setMenuOpen(false)}>My Listings</Link></li>
              <li><Link to="/add-crop" onClick={() => setMenuOpen(false)}>Add Crop</Link></li>
              <li><Link to="/prices" onClick={() => setMenuOpen(false)}>Live Prices</Link></li>
            </>
          )}

          {isAuthenticated && user?.role === "retailer" && (
            <>
              <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
              <li><Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link></li>
              <li><Link to="/bulk-orders" onClick={() => setMenuOpen(false)}>Bulk Orders</Link></li>
              <li><Link to="/prices" onClick={() => setMenuOpen(false)}>Live Prices</Link></li>
            </>
          )}

          {/* AUTH SECTION */}
          {!isAuthenticated ? (
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
                <button
                  className="nav-profile-btn"
                  onClick={() => {
                    navigate("/dashboard");
                    setMenuOpen(false);
                  }}
                  title="Dashboard"
                >
                  <UserIcon />
                </button>
              </li>
              <li>
                <button
                  className="nav-logout-btn"
                  onClick={() => {
                    logoutContext();
                    setMenuOpen(false);
                  }}
                  title="Logout"
                >
                  <LogoutIcon /> <span>Logout</span>
                </button>
              </li>
            </>
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
