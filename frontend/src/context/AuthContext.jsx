import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [admin, setAdmin] = useState(null);
    const [isDeliveryAuthenticated, setIsDeliveryAuthenticated] = useState(false);
    const [deliveryAgent, setDeliveryAgent] = useState(null);
    const [loading, setLoading] = useState(true);

    // Concurrent check for all three sessions on mount
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

            const deliveryPromise = axios.get("/api/delivery/check-auth", { withCredentials: true })
                .then(res => {
                    setIsDeliveryAuthenticated(true);
                    setDeliveryAgent(res.data.user);
                })
                .catch(() => {
                    setIsDeliveryAuthenticated(false);
                    setDeliveryAgent(null);
                });

            await Promise.allSettled([userPromise, adminPromise, deliveryPromise]);
            setLoading(false);
        };

        checkAuthStatus();
    }, []);

    const loginContext = (userData) => {
        if (userData.role === 'admin') {
            setIsAdminAuthenticated(true);
            setAdmin(userData);
        } else if (userData.role === 'delivery_partner') {
            setIsDeliveryAuthenticated(true);
            setDeliveryAgent(userData);
        } else {
            setIsAuthenticated(true);
            setUser(userData);
        }
    };

    const logoutContext = async (role = 'user') => {
        try {
            if (role === 'admin') {
                await axios.post("/api/admin/logout", {}, { withCredentials: true }).catch(e => console.warn("Admin logout API failed", e));
                setIsAdminAuthenticated(false);
                setAdmin(null);
            } else if (role === 'delivery') {
                await axios.post("/api/delivery/logout", {}, { withCredentials: true }).catch(e => console.warn("Delivery logout API failed", e));
                setIsDeliveryAuthenticated(false);
                setDeliveryAgent(null);
            } else {
                await axios.post("/api/auth/logout", {}, { withCredentials: true }).catch(e => console.warn("User logout API failed", e));
                setIsAuthenticated(false);
                setUser(null);
                window.location.href = "/";
            }
        } catch (err) {
            console.error("Logout process error", err);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, user, 
            isAdminAuthenticated, admin,
            isDeliveryAuthenticated, deliveryAgent,
            loading, loginContext, logoutContext 
        }}>
            {children}
        </AuthContext.Provider>
    );
};


