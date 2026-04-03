import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    // Concurrent check for both sessions on mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            const userPromise = axios.get("/api/auth/check-auth", { withCredentials: true })
                .then(res => {
                    setIsAuthenticated(true);
                    setUser(res.data.user);
                })
                .catch(() => {
                    setIsAuthenticated(false);
                    setUser(null);
                });

            const adminPromise = axios.get("/api/admin/check-auth", { withCredentials: true })
                .then(res => {
                    setIsAdminAuthenticated(true);
                    setAdmin(res.data.user);
                })
                .catch(() => {
                    setIsAdminAuthenticated(false);
                    setAdmin(null);
                });

            await Promise.allSettled([userPromise, adminPromise]);
            setLoading(false);
        };

        checkAuthStatus();
    }, []);

    const loginContext = (userData) => {
        if (userData.role === 'admin') {
            setIsAdminAuthenticated(true);
            setAdmin(userData);
        } else {
            setIsAuthenticated(true);
            setUser(userData);
        }
    };

    const logoutContext = async (role = 'user') => {
        try {
            if (role === 'admin') {
                await axios.post("/api/admin/logout", {}, { withCredentials: true });
                setIsAdminAuthenticated(false);
                setAdmin(null);
            } else {
                await axios.post("/api/auth/logout", {}, { withCredentials: true });
                setIsAuthenticated(false);
                setUser(null);
                window.location.href = "/";
            }
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, user, 
            isAdminAuthenticated, admin,
            loading, loginContext, logoutContext 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

