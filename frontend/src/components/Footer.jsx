import React from "react";
import "../assets/styles/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        
        <div>
          <h3>AGRIMART</h3>
          <p>Connecting Farmers Directly to Consumers</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul>
            <li>Home</li>
            <li>Products</li>
            <li>About</li>
            <li>Contact</li>
          </ul>
        </div>

        <div>
          <h4>User Roles</h4>
          <ul>
            <li>Farmers</li>
            <li>Customers</li>
            <li>Retailers</li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} AGRIMART. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
