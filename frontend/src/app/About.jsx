import React from "react";
import HeroSection from "../components/Herosection";
import "../assets/styles/About.css";
import aboutBanner from "../assets/images/slide1.jpg";

const About = () => {
  return (
    <>
      {/* Static Hero for About */}
      <HeroSection
        type="static"
        title="About AGRIMART"
        desc="A transparent digital marketplace empowering farmers and delivering freshness to consumers."
        buttonText="Explore Platform"
        image={aboutBanner}
      />

      {/* Who We Are */}
      <section className="about-section">
        <h2>Who We Are</h2>
        <p>
          AGRIMART is a farmer-centric digital marketplace designed to eliminate
          middlemen and enable direct, transparent trade between farmers,
          consumers, and retailers. Our platform ensures fair pricing, better
          farmer income, and access to fresh agricultural produce.
        </p>
      </section>

      {/* Vision & Mission */}
      <section className="about-grid">
        <div className="about-card">
          <h3>Our Vision</h3>
          <p>
            To build a sustainable agricultural ecosystem where farmers thrive
            economically and consumers gain trust through transparency.
          </p>
        </div>

        <div className="about-card">
          <h3>Our Mission</h3>
          <p>
            To digitally empower farmers, simplify agro-trade, and promote fair
            and ethical commerce across the agricultural supply chain.
          </p>
        </div>
      </section>

      {/* Why AGRIMART */}
      <section className="why-agrimart">
        <h2>Why AGRIMART?</h2>

        <div className="features">
          <div className="feature-box">
            <h4>🌱 Direct Farmer Access</h4>
            <p>Connect directly with verified farmers without intermediaries.</p>
          </div>

          <div className="feature-box">
            <h4>📊 Live Market Transparency</h4>
            <p>Access real-time pricing aligned with market trends.</p>
          </div>

          <div className="feature-box">
            <h4>📍 Location-Based Trade</h4>
            <p>Source products from nearby farms for freshness and efficiency.</p>
          </div>

          <div className="feature-box">
            <h4>🎙 Voice-Based Assistance</h4>
            <p>Inclusive AI voice chatbot for easier platform access.</p>
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section className="user-roles">
        <h2>Who Can Use AGRIMART?</h2>

        <div className="roles-grid">
          <div className="role-card">
            <h3>👨‍🌾 Farmers</h3>
            <p>Sell directly, set prices, manage inventory, and earn more.</p>
          </div>

          <div className="role-card">
            <h3>🧑 Consumers</h3>
            <p>Buy fresh produce confidently with full price transparency.</p>
          </div>

          <div className="role-card">
            <h3>🏪 Retailers</h3>
            <p>Procure agricultural goods in bulk directly from producers.</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
