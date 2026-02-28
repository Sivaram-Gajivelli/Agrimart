import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../assets/styles/Dashboard.css";

const Dashboard = () => {
  const { isAuthenticated, user, loading, logoutContext } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogout = () => {
    logoutContext();
  };

  const handleEditProfile = () => {
    alert("Edit Profile page coming next 🚀");
  };

  const handleChangePassword = () => {
    alert("Change Password page coming next 🔐");
  };

  if (loading) return <div>Loading Profile...</div>;
  if (!user) return null;

  return (
    <div className="dashboard-wrapper">
      <div className="profile-card">

        <div className="profile-header">
          <div className="profile-avatar">
            {user.role.charAt(0).toUpperCase()}
          </div>
          <h2>{user.role.charAt(0).toUpperCase() + user.role.slice(1)} Profile</h2>
        </div>

        <div className="profile-info">
          <div className="info-row">
            <span>Username</span>
            <span>{user.name || "Not available"}</span>
          </div>

          <div className="info-row">
            <span>Email</span>
            <span>{user.email || "Not available"}</span>
          </div>

          <div className="info-row">
            <span>Role</span>
            <span>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>
        </div>


        <div className="profile-actions">
          <button className="edit-btn" onClick={handleEditProfile}>
            Edit Profile
          </button>

          <button className="password-btn" onClick={handleChangePassword}>
            Change Password
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
