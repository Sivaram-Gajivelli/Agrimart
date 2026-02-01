import { useNavigate } from "react-router-dom";
import "../assets/styles/Auth.css";

export default function RoleSelect() {
  const navigate = useNavigate();

  const roles = [
    {
      role: "customer",
      icon: "👤",
      title: "Regular Customer",
      tagline: "Fresh from farms, delivered to your doorstep.",
      desc: "Browse verified farmers, compare live prices, and order fresh produce directly."
    },
    {
      role: "farmer",
      icon: "🧑‍🌾",
      title: "Farmer",
      tagline: "Sell smarter. Earn better. Grow digitally.",
      desc: "List your crops, set your prices, and connect directly with buyers and retailers."
    },
    {
      role: "retailer",
      icon: "🛒",
      title: "Retailer",
      tagline: "Stock faster. Sell wider. Scale your business.",
      desc: "Source directly from farmers, manage bulk orders, and expand your supply chain."
    }
  ];

  return (
    <div className="role-page">
      {roles.map((r) => (
        <div key={r.role} className="role-section">
          <div className="role-icon">{r.icon}</div>

          <h2>{r.title}</h2>
          <div className="role-tagline">{r.tagline}</div>
          <div className="role-desc">{r.desc}</div>

          <button
            className="role-login"
            onClick={() => navigate(`/login/${r.role}`)}
          >
            Login
          </button>

          <button
            className="role-signup"
            onClick={() => navigate(`/signup/${r.role}`)}
          >
            Sign Up
          </button>
        </div>
      ))}
    </div>
  );
}
