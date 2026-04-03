import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import PhoneticTerm from "./PhoneticTerm";
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

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'or', name: 'Odia' },
  { code: 'as', name: 'Assamese' },
];


const LanguageSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('');

    const handleSelect = (code) => {
        const combo = document.querySelector('.goog-te-combo');
        if (combo) {
            if (code === 'en') {
                // To switch back to English, we clear the cookie and reload for a "Hard Reset"
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
                window.location.reload();
            } else {
                combo.value = code;
                combo.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        setIsOpen(false);
        setFilter('');
    };

    const filteredLangs = INDIAN_LANGUAGES.filter(l => l.name.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div style={{ position: 'relative' }}>
            {/* The hidden anchor for native google translate widget */}
            <div id="google_translate_element" style={{ display: 'none' }}></div>
            
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                title="Translate Languages"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                <GlobeIcon />
            </button>

            {isOpen && (
                <div 
                    className="notranslate" 
                    translate="no"
                    style={{
                        position: 'absolute', top: '100%', right: '0', 
                        background: '#fff', border: '1px solid #ddd', 
                        borderRadius: '8px', padding: '10px',
                        width: '200px', zIndex: 9999,
                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                        marginTop: '10px'
                    }}
                >
                    <input 
                        type="text" 
                        placeholder="Search language..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '6px 10px', marginBottom: '10px',
                            borderRadius: '4px', border: '1px solid #ccc',
                            fontSize: '0.85rem'
                        }}
                        autoFocus
                    />
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredLangs.length === 0 ? (
                             <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>No language found</div>
                        ) : (
                             filteredLangs.map(l => (
                                <div key={l.code} 
                                     onMouseDown={(e) => {
                                        e.preventDefault(); // Prevents focus loss before handler
                                        handleSelect(l.code);
                                     }}
                                     style={{ padding: '6px 8px', fontSize: '0.9rem', color: '#333', cursor: 'pointer', borderRadius: '4px' }}
                                     onMouseOver={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
                                     onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {l.name}
                                </div>
                             ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const SearchModal = ({ isOpen, onClose, triggerSearch }) => {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [placeholderText, setPlaceholderText] = useState("What are you looking for?");
    const placeholderRef = useRef(null);

    // Effect to hunt for the translated placeholder text from a hidden element
    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(() => {
                if (placeholderRef.current) {
                    const translatedText = placeholderRef.current.innerText;
                    if (translatedText && translatedText !== "What are you looking for?") {
                        setPlaceholderText(translatedText);
                    }
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    useEffect(() => {
      if (query.length > 1) {
        const fetchSuggestions = async () => {
          try {
            // Use current UI language from HTML lang attribute
            const currentLang = document.documentElement.lang || 'en';
            const response = await axios.get(`/api/products/search?q=${query}&lang=${currentLang}`);
            setSuggestions(response.data.slice(0, 5));
          } catch (error) {
            console.error("Error fetching suggestions:", error);
          }
        };
        fetchSuggestions();
      } else {
        setSuggestions([]);
      }
    }, [query]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            triggerSearch(query);
        }
    };

    if (!isOpen) return null;

    return (
      <div className="search-modal-backdrop" onClick={onClose}>
        {/* Hidden helper for Google Translate to translate the placeholder */}
        <span ref={placeholderRef} style={{ display: 'none' }} id="search-placeholder-helper">What are you looking for?</span>
        
        <div className="search-card" onClick={(e) => e.stopPropagation()}>
          <div className="search-field-wrapper">
            <SearchIcon />
            <input
              type="text"
              placeholder={placeholderText}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="search-field-input notranslate"
              translate="no"
            />
            <button className="search-close-btn" onClick={onClose}>&times;</button>
          </div>
          {suggestions.length > 0 && (
            <div className="search-suggestions-card">
              {suggestions.map((product) => (
                <div
                  key={product._id}
                  className="search-suggestion-item"
                  onClick={() => triggerSearch(product.productName)}
                >
                  <div className="suggestion-content">
                    <span className="prod-name">{product.displayName || product.productName}</span>
                    <span className="prod-cat">{product.displayCategory || product.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
};

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isAuthenticated, user, logoutContext } = useAuth();
  const navigate = useNavigate();

  const triggerSearch = (q) => {
    if (q?.trim()) {
      navigate(`/products?search=${encodeURIComponent(q.trim())}`);
      setMenuOpen(false);
      setIsSearchOpen(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <h2 className="logo notranslate" translate="no">Agrimart</h2>

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
              <li><button className="search-trigger-btn" onClick={() => setIsSearchOpen(true)} title="Search"><SearchIcon /></button></li>
              <li><Link to="/" onClick={() => setMenuOpen(false)}><PhoneticTerm english="Home" te="హోమ్" hi="होम" ta="ஹோம்" kn="ಹೋಮ್" ml="ഹോം" mr="होम" gu="હોમ" pa="ਹੋਮ" bn="হোম" or="ହୋମ୍" as="হোম" /></Link></li>
              <li><Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link></li>
              <li><Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link></li>
              <li><Link to="/prices" onClick={() => setMenuOpen(false)}>Live Prices</Link></li>
              <li><Link to="/price-prediction" onClick={() => setMenuOpen(false)}>Price Prediction</Link></li>
            </>
          )}

          {isAuthenticated && user?.role === "customer" && (
            <>
              <li><button className="search-trigger-btn" onClick={() => setIsSearchOpen(true)} title="Search"><SearchIcon /></button></li>
              <li><Link to="/" onClick={() => setMenuOpen(false)}><PhoneticTerm english="Home" te="హోమ్" hi="होम" ta="ஹோம்" kn="ಹೋಮ್" ml="ഹോം" mr="होम" gu="હોમ" pa="ਹੋਮ" bn="হোম" or="ହୋମ୍" as="হোম" /></Link></li>
              <li><Link to="/products?category=Vegetables" onClick={() => setMenuOpen(false)}>Fresh vegetables</Link></li>
              <li><Link to="/products?category=Fruits" onClick={() => setMenuOpen(false)}>Fresh fruits</Link></li>
              <li><Link to="/products?category=Grains %26 Pulses" onClick={() => setMenuOpen(false)}>Fresh Grains & Pulses</Link></li>
              <li><Link to="/cart" onClick={() => setMenuOpen(false)}><PhoneticTerm english="Cart" te="కార్ట్" hi="कार्ट" ta="கார்ட்" kn="ಕಾರ್ಟ್" ml="കാർട്ട്" mr="कार्ट" gu="કાર્ટ" pa="ਕਾਰਟ" bn="কার্ট" or="କାର୍ଟ" as="কাৰ্ট" /></Link></li>
              <li><Link to="/orders" onClick={() => setMenuOpen(false)}>Orders</Link></li>
            </>
          )}

          {isAuthenticated && user?.role === "farmer" && (
            <>
              <li><button className="search-trigger-btn" onClick={() => setIsSearchOpen(true)} title="Search"><SearchIcon /></button></li>
              <li><Link to="/" onClick={() => setMenuOpen(false)}><PhoneticTerm english="Home" te="హోమ్" hi="होम" ta="ஹோம்" kn="ಹೋಮ್" ml="ഹോം" mr="होम" gu="હોમ" pa="ਹੋਮ" bn="হোম" or="ହୋମ୍" as="হোম" /></Link></li>
              <li><Link to="/sell-produce" onClick={() => setMenuOpen(false)}>Sell Produce</Link></li>
              <li><Link to="/my-products" onClick={() => setMenuOpen(false)}>My Products</Link></li>
              <li><Link to="/orders-received" onClick={() => setMenuOpen(false)}>Orders Received</Link></li>
              <li><Link to="/prices" onClick={() => setMenuOpen(false)}>Live Prices</Link></li>
              <li><Link to="/price-prediction" onClick={() => setMenuOpen(false)}>Price Prediction</Link></li>
            </>
          )}

          {isAuthenticated && user?.role === "retailer" && (
            <>
              <li><button className="search-trigger-btn" onClick={() => setIsSearchOpen(true)} title="Search"><SearchIcon /></button></li>
              <li><Link to="/" onClick={() => setMenuOpen(false)}><PhoneticTerm english="Home" te="హోమ్" hi="होम" ta="ஹோம்" kn="ಹೋಮ್" ml="ഹോം" mr="होम" gu="હોમ" pa="ਹੋਮ" bn="হোম" or="ହୋମ୍" as="হোম" /></Link></li>
              <li><Link to="/products" onClick={() => setMenuOpen(false)}>Products</Link></li>
              <li><Link to="/bulk-orders" onClick={() => setMenuOpen(false)}>Bulk Orders</Link></li>
              <li><Link to="/prices" onClick={() => setMenuOpen(false)}>Live Prices</Link></li>
              <li><Link to="/price-prediction" onClick={() => setMenuOpen(false)}>Price Prediction</Link></li>
            </>
          )}

          {/* TRANSLATE WIDGET */}
          <li className="nav-item translate-widget-container">
            <LanguageSelector />
          </li>

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

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        triggerSearch={triggerSearch}
      />
    </>
  );
};

export default Navbar;

