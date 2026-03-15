import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isAuthenticated, user } = useAuth();

    const fetchCart = async () => {
        if (!isAuthenticated || user?.role !== 'customer') return;
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3000/api/cart', { withCredentials: true });
            setCart(res.data);
        } catch (err) {
            console.error('Error fetching cart:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, [isAuthenticated, user]);

    const addToCartGlobal = async (productId, quantity = 1) => {
        if (!isAuthenticated || user?.role !== 'customer') {
            toast.error('Please login as a customer to add items to cart.');
            return;
        }

        try {
            const res = await axios.post('http://localhost:3000/api/cart', { productId, quantity }, { withCredentials: true });
            setCart(res.data);
            setIsSidebarOpen(true); // Open sidebar on add
            toast.success('Added to cart!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add item to cart.');
        }
    };

    const updateQuantity = async (productId, quantity) => {
        try {
            const res = await axios.put(`http://localhost:3000/api/cart/${productId}`, { quantity }, { withCredentials: true });
            setCart(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update quantity.');
        }
    };

    const removeFromCart = async (productId) => {
        try {
            const res = await axios.delete(`http://localhost:3000/api/cart/${productId}`, { withCredentials: true });
            setCart(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove item.');
        }
    };

    return (
        <CartContext.Provider value={{ 
            cart, 
            loading, 
            isSidebarOpen, 
            setIsSidebarOpen, 
            addToCartGlobal, 
            updateQuantity, 
            removeFromCart,
            refreshCart: fetchCart 
        }}>
            {children}
        </CartContext.Provider>
    );
};
