import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../assets/styles/Auth.css";

// Background images matching Login.jsx
import customerBg from "../assets/images/customer_login.png";
import farmerBg from "../assets/images/slide1.jpg";
import retailerBg from "../assets/images/retailer_login.png";

// Reusing Icons from Login.jsx
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

export default function ForgotPasswordReset() {
    const location = useLocation();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword1, setShowPassword1] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const [passwordError, setPasswordError] = useState("");

    // Extract params passed from ForgotPasswordVerify.jsx
    const contact = location.state?.contact;
    const role = location.state?.role;
    const isVerified = location.state?.isVerified;
    const safeRole = role || "customer";

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
    const tagline = roleTaglines[safeRole] || "Connecting farmers, retailers, and consumers in one digital marketplace.";

    useEffect(() => {
        // Prevent direct access without verification state
        if (!contact || !role || !isVerified) {
            toast.error("Unauthorized access. Please restart reset flow.");
            navigate("/auth");
        }
    }, [contact, role, isVerified, navigate]);

    // Live password strength check
    useEffect(() => {
        if (newPassword.length > 0) {
            if (newPassword.length < 8) setPasswordError("Password must be at least 8 characters");
            else if (!/[A-Z]/.test(newPassword)) setPasswordError("Password must contain an uppercase letter");
            else if (!/[a-z]/.test(newPassword)) setPasswordError("Password must contain a lowercase letter");
            else if (!/[0-9]/.test(newPassword)) setPasswordError("Password must contain a number");
            else if (!/[\W_]/.test(newPassword)) setPasswordError("Password must contain a special character");
            else if (confirmPassword && newPassword !== confirmPassword) {
                setPasswordError("Passwords do not match");
            } else {
                setPasswordError("");
            }
        } else {
            setPasswordError("");
        }
    }, [newPassword, confirmPassword]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwordError) return;

        if (!newPassword.trim() || !confirmPassword.trim()) {
            return toast.error("Please fill out both password fields");
        }

        try {
            const res = await fetch("http://localhost:3000/api/auth/forgot-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contact, newPassword, role })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                navigate(`/login/${role}`);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("Error resetting password. Try again.");
        }
    };

    return (
        <div className="auth-wrapper">
            <div
                className="auth-left"
                style={{ backgroundImage: `url(${bgImage})` }}
            >
                <h1>
                    Welcome to <span>AGRIMART</span>
                </h1>
                <p>{tagline}</p>
            </div>

            <div className="auth-right">
                <div className="auth-form">
                    <h2>Create New Password</h2>
                    <p style={{ marginBottom: "1.5rem" }}>
                        Your identity for <strong>{contact}</strong> has been verified. Enter your new secure password below.
                    </p>

                    <form onSubmit={handleSubmit}>

                        <div className="password-wrapper" style={{ marginBottom: "1rem" }}>
                            <input
                                name="newPassword"
                                type={showPassword1 ? "text" : "password"}
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                            <span
                                className="password-toggle"
                                onClick={() => setShowPassword1(!showPassword1)}
                            >
                                {showPassword1 ? <EyeOffIcon /> : <EyeIcon />}
                            </span>
                        </div>

                        <div className="password-wrapper" style={{ marginBottom: "1.5rem" }}>
                            <input
                                name="confirmPassword"
                                type={showPassword2 ? "text" : "password"}
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <span
                                className="password-toggle"
                                onClick={() => setShowPassword2(!showPassword2)}
                            >
                                {showPassword2 ? <EyeOffIcon /> : <EyeIcon />}
                            </span>
                        </div>

                        {/* Live validation message */}
                        {passwordError && (
                            <p style={{ color: "red", fontSize: "14px", marginBottom: "1rem" }}>
                                {passwordError}
                            </p>
                        )}

                        <button type="submit" style={{ marginBottom: "1rem" }} disabled={!!passwordError || !newPassword || !confirmPassword}>
                            Submit Reset
                        </button>

                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <p className="forgot-password" onClick={() => navigate(`/login/${safeRole}`)} style={{ cursor: "pointer", color: "#666", fontSize: "0.9rem", margin: 0 }}>
                                Back to Login
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
