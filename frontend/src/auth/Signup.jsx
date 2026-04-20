import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { registerUser } from "../services/authService";
import "../assets/styles/Auth.css";
import { toast } from "react-toastify";
// location wasn't needed anymore

// Background images
import customerBg from "../assets/images/customer_login.png";
import farmerBg from "../assets/images/slide1.jpg";

/**
 * SVG Icons for password visibility toggling, extracted outside the component 
 * to ensure stability and performance.
 */
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

export default function Signup() {
  const { role } = useParams();
  const safeRole = role || "customer";

  /**
   * State management for email and mobile verification status, 
   * including OTP delivery and cooldown timers.
   */
  const [emailVerified, setEmailVerified] = useState(false);

  const [otp, setOtp] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: safeRole
  });

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Removed useEffect for isVerifiedSuccess toast



  const [passwordError, setPasswordError] = useState("");

  /**
   * UI mapping for role-specific taglines and backgrounds.
   */
  const roleTaglines = {
    customer: "Fresh from farms, delivered to your doorstep.",
    farmer: "Sell smarter. Earn better. Grow digitally."
  };

  // Role backgrounds
  const roleBackgrounds = {
    customer: customerBg,
    farmer: farmerBg
  };

  const bgImage = roleBackgrounds[safeRole] || customerBg;
  const tagline =
    roleTaglines[safeRole] ||
    "Connecting farmers and consumers in one digital marketplace.";

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Phone number filtering: allow only digits and max 10 characters
    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    const updatedForm = { ...form, [name]: value };
    setForm(updatedForm);

    // Reset verification states if email or phone changes
    if (name === "email") {
      setEmailOtpSent(false);
      setEmailVerified(false);
    }
    if (name === "phone") {
      setOtpSent(false);
      setMobileVerified(false);
    }

    /**
     * Real-time password strength and matching validation.
     */
    if (name === "password" || name === "confirmPassword") {
      const p = updatedForm.password;

      if (p.length > 0) {
        if (p.length < 8) setPasswordError("Password must be at least 8 characters");
        else if (!/[A-Z]/.test(p)) setPasswordError("Password must contain an uppercase letter");
        else if (!/[a-z]/.test(p)) setPasswordError("Password must contain a lowercase letter");
        else if (!/[0-9]/.test(p)) setPasswordError("Password must contain a number");
        else if (!/[\W_]/.test(p)) setPasswordError("Password must contain a special character");
        else if (updatedForm.confirmPassword && p !== updatedForm.confirmPassword) {
          setPasswordError("Passwords do not match");
        } else {
          setPasswordError("");
        }
      } else {
        setPasswordError("");
      }
    }
  };

  const handleEmailVerify = async () => {
    try {
      if (!form.email.trim()) {
        toast.error("Enter email first");
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      const res = await fetch("/api/auth/send-email-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, name: form.name || "User", role: safeRole })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Verification mail sent to ${form.email}`);
        setEmailOtpSent(true);
      } else {
        toast.error(data.message || "Failed to send verification");
      }
    } catch {
      toast.error("Error sending verification");
    }
  };


  const sendOtp = async () => {
    try {
      if (!form.phone.trim()) {
        toast.error("Enter mobile number first");
        return;
      }

      // Phone format validation (10 digits)
      if (!/^\d{10}$/.test(form.phone)) {
        toast.error("Please enter a valid 10-digit mobile number");
        return;
      }

      const res = await fetch("/api/auth/send-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: form.phone, name: form.name || "User", role: safeRole })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setOtpSent(true);
        setResendCooldown(30);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Error sending OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await fetch("/api/auth/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: form.phone, otp })
      });

      const data = await res.json();

      if (res.ok) {
        setMobileVerified(true);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Verification failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwordError) return;

    try {
      const res = await registerUser({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: safeRole
      });

      toast.success(res.message);

      // Redirect to the role-specific login page after successful registration
      setTimeout(() => {
        window.location.href = `/login/${safeRole}`;
      }, 1500);

    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    }
  };


  const isDisabled =
    !form.name.trim() ||
    !form.password.trim() ||
    !form.confirmPassword.trim() ||
    passwordError ||
    (!form.email.trim() && !form.phone.trim()) ||

    // Require verification if email is provided
    (form.email.trim() && !emailVerified) ||

    // Require verification if phone is provided
    (form.phone.trim() && !mobileVerified);

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

            <p className="helper-text">
              Provide at least one contact method (Email or Mobile)
            </p>

            <div className="input-with-btn">
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
              />

              {!emailVerified && (
                <button
                  type="button"
                  className="side-btn"
                  onClick={handleEmailVerify}
                >
                  Send OTP
                </button>
              )}
            </div>

            {/* Email OTP Verification UI */}
            {emailOtpSent && !emailVerified && (
              <div className="input-with-btn" style={{ marginTop: '10px' }}>
                <input
                  placeholder="Enter Email OTP"
                  onChange={(e) => {
                    // Update temporary OTP value for verification
                    window.tempEmailOtp = e.target.value;
                  }}
                />
                <button
                  type="button"
                  className="side-btn"
                  onClick={async () => {
                    const otp = window.tempEmailOtp;
                    try {
                      const res = await fetch("/api/auth/verify-email-otp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ email: form.email, otp })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setEmailVerified(true);
                        toast.success("Email verified!");
                      } else {
                        toast.error(data.message);
                      }
                    } catch {
                      toast.error("Verification failed");
                    }
                  }}
                >
                  Verify Email
                </button>
              </div>
            )}

            <div className="input-with-btn">
              <input
                name="phone"
                placeholder="10-digit Mobile Number"
                value={form.phone}
                onChange={handleChange}
              />

              {!mobileVerified && (
                <button
                  type="button"
                  className="side-btn"
                  onClick={sendOtp}
                >
                  Send OTP
                </button>
              )}
            </div>

            {otpSent && !mobileVerified && (
              <>
                <div className="input-with-btn">
                  <input
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />

                  <button
                    type="button"
                    className="side-btn"
                    onClick={verifyOtp}
                  >
                    Verify
                  </button>
                </div>

                <span
                  className="resend-link"
                  onClick={resendCooldown === 0 ? sendOtp : null}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend OTP"}
                </span>
              </>
            )}

            <div className="password-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
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

            <div className="password-wrapper">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                onChange={handleChange}
                required
              />
              <span
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </span>
            </div>

            {/* Live validation message */}
            {passwordError && (
              <p style={{ color: "red", fontSize: "14px" }}>
                {passwordError}
              </p>
            )}

            <button type="submit" disabled={isDisabled}>
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

