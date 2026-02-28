import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/LivePrices.css";

const LivePrices = () => {
  const [prices] = useState([
    {
      id: 1,
      name: "Tomato",
      price: 24,
      unit: "kg",
      location: "Guntur, AP",
      updated: "10 mins ago",
      trend: "down",
    },
    {
      id: 2,
      name: "Onion",
      price: 32,
      unit: "kg",
      location: "Nashik, MH",
      updated: "15 mins ago",
      trend: "up",
    },
    {
      id: 3,
      name: "Potato",
      price: 28,
      unit: "kg",
      location: "Agra, UP",
      updated: "5 mins ago",
      trend: "up",
    },
    {
      id: 4,
      name: "Rice",
      price: 55,
      unit: "kg",
      location: "West Godavari, AP",
      updated: "20 mins ago",
      trend: "stable",
    },
    {
      id: 5,
      name: "Wheat",
      price: 38,
      unit: "kg",
      location: "Indore, MP",
      updated: "12 mins ago",
      trend: "down",
    },
  ]);

  return (
    <section className="live-prices">
      <div className="live-prices-header">
        <div className="header-left">
          <h2>Today’s Market Prices</h2>
          <span className="badge">Live</span>
        </div>

        <Link to="/prices" className="view-all-btn">
          View all prices →
        </Link>
      </div>

      <div className="price-cards">
        {prices.map((item) => (
          <div className="price-card" key={item.id}>
            <h3>{item.name}</h3>

            <p className="price">
              ₹{item.price} / {item.unit}
            </p>

            <p className="location">{item.location}</p>

            <div className="card-footer">
              <span className="updated">{item.updated}</span>

              <span
                className={`trend ${item.trend === "up"
                  ? "up"
                  : item.trend === "down"
                    ? "down"
                    : "stable"
                  }`}
              >
                {item.trend === "up" && "▲"}
                {item.trend === "down" && "▼"}
                {item.trend === "stable" && "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LivePrices;
