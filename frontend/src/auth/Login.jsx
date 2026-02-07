import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { loginUser } from "../services/authService";
import "../assets/styles/Auth.css";

// Background images
import customerBg from "../assets/images/customer_login.png";
import farmerBg from "../assets/images/slide1.jpg";
import retailerBg from "../assets/images/retailer_login.png";

export default function Login() {
  const { role } = useParams();
  const safeRole = role || "customer"; // fallback

  const [form, setForm] = useState({ email: "", password: "" });

  // Role taglines
  const roleTaglines = {
    customer: "Fresh from farms, delivered to your doorstep.",
    farmer: "Sell smarter. Earn better. Grow digitally.",
    retailer: "Stock faster. Sell wider. Scale your business."
  };

  // Role backgrounds
  const roleBackgrounds = {
    customer: customerBg,
    farmer: farmerBg,
    retailer: retailerBg
  };

  const bgImage = roleBackgrounds[safeRole] || customerBg;
  const tagline =
    roleTaglines[safeRole] ||
    "Connecting farmers, retailers, and consumers in one digital marketplace.";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser({ ...form, role: safeRole });
      localStorage.setItem("token", res.data.token);
      window.location.href = `/`;
    } catch {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="auth-wrapper">
      <div
        className="auth-left"
        style={{
          backgroundImage: `url(${bgImage})`
        }}
      >
        <h1>
          Welcome to <span>AGRIMART</span>
        </h1>

        <p>{tagline}</p>
      </div>

      <div className="auth-right">
        <div className="auth-form">
          <h2>
            {safeRole.charAt(0).toUpperCase() + safeRole.slice(1)} Login
          </h2>
          <p>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit}>
            <input
              name="email"
              placeholder="Email or Mobile"
              onChange={handleChange}
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />

            <button>Login</button>
          </form>

          <p>
            Don’t have an account?{" "}
            <Link to={`/signup/${safeRole}`}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
