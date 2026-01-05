import React, { useEffect, useState } from "react";
import "../assets/styles/HeroSection.css"
import slide1 from "../assets/images/slide1.jpg"
import slide2 from "../assets/images/slide2.jpg"

const slides = [
  {
    title: "Direct from Farms. Fair for Everyone.",
    desc: "AGRIMART connects farmers directly with customers and retailers for transparent and fair trade.",
    button: "Explore Products",
    image: slide2,
  },

  {
    title: "Fresh Produce, Straight from the Source",
    desc: "Buy farm-fresh products directly from verified farmers near you.",
    button: "Shop Fresh",
    image: slide2,
  },
  {
    title: "Sell Direct. Earn Better. Grow Stronger.",
    desc: "Farmers can sell products directly, set prices, and eliminate middlemen.",
    button: "Join as Farmer",
    image: slide2,
  },
  {
    title: "Bulk Buying Made Simple for Retailers",
    desc: "Retailers get reliable supply directly from farmers with transparent pricing.",
    button: "Register as Retailer",
    image: slide2,
  },
];

const HeroSection = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`hero-slide ${index === current ? "active" : ""}`}
          style={{ backgroundImage: `url(${slide.image})` }}
        >
          <div className="hero-overlay">
            <h1>{slide.title}</h1>
            <p>{slide.desc}</p>
            <button>{slide.button}</button>
          </div>
        </div>
      ))}

      <div className="hero-dots">
        {slides.map((_, index) => (
          <span
            key={index}
            className={index === current ? "dot active" : "dot"}
            onClick={() => setCurrent(index)}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
