import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { registerUser } from "../services/authService";
import "../assets/styles/Auth.css";

// Background images
import customerBg from "../assets/images/customer_login.png";
import farmerBg from "../assets/images/slide1.jpg";
import retailerBg from "../assets/images/retailer_login.png";

export default function Signup() {
  const { role } = useParams();
  const safeRole = role || "customer";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: safeRole
  });

  const [passwordError, setPasswordError] = useState("");

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
    const updatedForm = { ...form, [e.target.name]: e.target.value };
    setForm(updatedForm);

    // Live password match check
    if (
      updatedForm.confirmPassword &&
      updatedForm.password !== updatedForm.confirmPassword
    ) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwordError) return;

    try {
      await registerUser({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: safeRole
      });

      alert("Account created successfully!");
      window.location.href = `/login/${safeRole}`;
    } catch {
      alert("Signup failed");
    }
  };

  const isDisabled =
    !form.name ||
    !form.email ||
    !form.phone ||
    !form.password ||
    !form.confirmPassword ||
    passwordError;

  return (
    <div className="auth-wrapper">
      <div
        className="auth-left"
        style={{
          backgroundImage: `url(${bgImage})`
        }}
      >
        <h1>
          Join <span>AGRIMART</span>
        </h1>

        <p>{tagline}</p>
      </div>

      <div className="auth-right">
        <div className="auth-form">
          <h2>
            {safeRole.charAt(0).toUpperCase() + safeRole.slice(1)} Signup
          </h2>
          <p>Fill in your details to get started</p>

          <form onSubmit={handleSubmit}>
            <input
              name="name"
              placeholder="Full Name"
              onChange={handleChange}
              required
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              onChange={handleChange}
              required
            />

            <input
              name="phone"
              placeholder="Mobile Number"
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

            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              onChange={handleChange}
              required
            />

            {/* Live validation message */}
            {passwordError && (
              <p style={{ color: "red", fontSize: "14px" }}>
                {passwordError}
              </p>
            )}

            <button disabled={isDisabled}>
              Create Account
            </button>
          </form>

          <p>
            Already have an account?{" "}
            <Link to={`/login/${safeRole}`}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
