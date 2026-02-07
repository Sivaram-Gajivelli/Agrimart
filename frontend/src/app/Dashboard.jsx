import React, { useEffect, useState } from "react";
import "../assets/styles/Dashboard.css";

const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = "/auth";
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/user/profile", {
          headers: {
            Authorization: token
          }
        });

        const data = await res.json();
        setUser(data);

      } catch (err) {
        console.error(err);
        window.location.href = "/auth";
      }
    };

    fetchUser();
  }, []);


  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleEditProfile = () => {
    alert("Edit Profile page coming next 🚀");
  };

  const handleChangePassword = () => {
    alert("Change Password page coming next 🔐");
  };

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
