import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../assets/styles/Auth.css";

// Background images matching Login.jsx
import customerBg from "../assets/images/customer_login.png";
import farmerBg from "../assets/images/slide1.jpg";
import retailerBg from "../assets/images/retailer_login.png";

export default function ForgotPasswordVerify() {
    const location = useLocation();
    const navigate = useNavigate();

    const [otp, setOtp] = useState("");
    const [resendCooldown, setResendCooldown] = useState(30);

    // Extract params passed from Login.jsx
    const contact = location.state?.contact;
    const role = location.state?.role;
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
        // Prevent direct access without state
        if (!contact || !role) {
            toast.error("Invalid session. Returning to login.");
            navigate("/auth");
        }
    }, [contact, role, navigate]);

    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            return toast.error("Please enter the OTP");
        }

        try {
            const res = await fetch("http://localhost:3000/api/auth/forgot-password/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contact, otp })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("OTP Verified! Please enter your new password.");
                navigate("/forgot-password/reset", { state: { contact, role, isVerified: true } });
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("Error verifying OTP. Try again.");
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;

        try {
            const res = await fetch("http://localhost:3000/api/auth/forgot-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contact, role })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);

                // Log to browser console too
                if (data.otp && contact.includes("@") === false) {
                    console.log("📱 Mobile OTP resent from backend:", data.otp);
                } else if (data.otp && contact.includes("@")) {
                    console.log("📧 Email OTP resent from backend:", data.otp);
                }

                setResendCooldown(30);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error("Failed to resend OTP. Try again.");
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
                    <h2>Verify OTP</h2>
                    <p style={{ marginBottom: "1.5rem" }}>
                        An OTP has been sent to <strong>{contact}</strong>. Please enter it below.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <input
                            name="otp"
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            style={{ marginBottom: "1rem" }}
                        />
                        <button type="submit" style={{ marginBottom: "1rem" }}>Verify OTP</button>
                    </form>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginTop: "1rem" }}>
                        <span
                            onClick={() => navigate(`/login/${safeRole}`)}
                            style={{ cursor: "pointer", color: "#666" }}
                        >
                            Back to Login
                        </span>
                        <span
                            onClick={handleResendOtp}
                            style={{
                                cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                                color: resendCooldown > 0 ? "#aaa" : "#4CAF50",
                                fontWeight: "var(--font-medium)"
                            }}
                        >
                            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
