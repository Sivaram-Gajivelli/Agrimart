import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check auth status on mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const res = await axios.get("http://localhost:3000/api/auth/check-auth", {
                    withCredentials: true
                });
                setIsAuthenticated(true);
                setUser(res.data.user);
            } catch (err) {
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    const loginContext = (userData) => {
        setIsAuthenticated(true);
        setUser(userData);
    };

    const logoutContext = async () => {
        try {
            await axios.post("http://localhost:3000/api/auth/logout", {}, { withCredentials: true });
            setIsAuthenticated(false);
            setUser(null);
            window.location.href = "/";
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, loading, loginContext, logoutContext }}>
            {children}
        </AuthContext.Provider>
    );
};
