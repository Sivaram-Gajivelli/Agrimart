import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/styles/LivePrices.css";

const LivePrices = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/market/prices?limit=4");
        if (!response.ok) throw new Error("Failed to fetch market prices");
        const data = await response.json();

        if (data.records && data.records.length > 0) {
          const formattedPrices = data.records.map((record, index) => ({
            id: index + 1,
            name: record.commodity,
            price: record.modal_price ? Math.round(Number(record.modal_price) / 100) : "N/A", // Convert per quintal to per kg (approx)
            unit: "kg",
            location: `${record.market}, ${record.state}`,
            updated: record.arrival_date || "Today",
            trend: "stable", // The API doesn't provide historical data in a single request, so default to stable
          }));
          setPrices(formattedPrices);
        }
      } catch (error) {
        console.error("Error loading live prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

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
        {loading ? (
          <p style={{ textAlign: "center", width: "100%", padding: "20px", color: "var(--text-light)" }}>Loading live market data...</p>
        ) : (
          prices.map((item) => (
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
        )))}
      </div>
    </section>
  );
};

export default LivePrices;
