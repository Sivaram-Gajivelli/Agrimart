import React, { useEffect, useState } from "react";
import "../assets/styles/HeroSection.css";
import slide1 from "../assets/images/slide1.jpg";
import slide2 from "../assets/images/slide2.jpg";

/* Default slides for HOME */
const defaultSlides = [
  {
    title: "Direct from Farms. Fair for Everyone.",
    desc: "AGRIMART connects farmers directly with customers and retailers for transparent and fair trade.",
    button: "Explore Products",
    image: slide1,
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
    image: slide1,
  },
  {
    title: "Bulk Buying Made Simple for Retailers",
    desc: "Retailers get reliable supply directly from farmers with transparent pricing.",
    button: "Register as Retailer",
    image: slide2,
  },
];

const HeroSection = ({
  type = "slider",     // "slider" | "static"
  title,
  desc,
  buttonText,
  image,
  slides = defaultSlides,
}) => {
  const [current, setCurrent] = useState(0);

  /* Auto-slide ONLY for slider mode */
  useEffect(() => {
    if (type !== "slider") return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [type, slides.length]);

  /* STATIC HERO (About page) */
  if (type === "static") {
    return (
      <section
        className="hero hero-static"
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>{title}</h1>
            <p>{desc}</p>
            {buttonText && <button>{buttonText}</button>}
          </div>
        </div>
      </section>
    );
  }

  /* SLIDER HERO (Home page) */
  return (
    <section className="hero">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`hero-slide ${index === current ? "active" : ""}`}
          style={{ backgroundImage: `url(${slide.image})` }}
        >
          <div className="hero-overlay">
            <div className="hero-content">
              <h1>{slide.title}</h1>
              <p>{slide.desc}</p>
              <button>{slide.button}</button>
            </div>
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
