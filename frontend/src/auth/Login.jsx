import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { loginUser } from "../services/authService";
import "../assets/styles/Auth.css";
import { toast } from "react-toastify";

// Background images
import customerBg from "../assets/images/customer_login.png";
import farmerBg from "../assets/images/slide1.jpg";
import retailerBg from "../assets/images/retailer_login.png";

// SVG Icons extracted outside the component to prevent unstable nested component errors
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function Login() {
  const { role } = useParams();
  const safeRole = role || "customer"; // fallback
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

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
      // The backend now securely sets an HTTP-Only cookie automatically.
      await loginUser({ ...form, role: safeRole });
      window.location.href = `/`;
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Invalid credentials.");
    }
  };

  const handleForgotPasswordClick = async () => {
    if (!form.email.trim()) {
      return toast.error("Please enter your registered email or mobile number in the login field first.");
    }

    try {
      const res = await fetch("http://localhost:3000/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contact: form.email, role: safeRole })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        if (data.otp && !form.email.includes("@")) {
          console.log("📱 Mobile OTP received from backend:", data.otp);
        } else if (data.otp && form.email.includes("@")) {
          console.log("📧 Email OTP received from backend:", data.otp);
        }

        // Navigate to the Verify OTP page and pass along the state
        navigate("/forgot-password/verify", {
          state: { contact: form.email, role: safeRole }
        });

      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Failed to send reset OTP. Try again.");
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
              value={form.email}
              onChange={handleChange}
              required
            />

            <div className="password-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <span
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <span
                onClick={handleForgotPasswordClick}
                style={{ cursor: "pointer", color: "#4CAF50", fontSize: "0.9rem", fontWeight: "var(--font-medium)" }}
              >
                Forgot Password?
              </span>
            </div>

            <button type="submit">Login</button>
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
