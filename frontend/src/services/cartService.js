import axios from 'axios';

const API_URL = '/api/cart';

export const getCart = async () => {
    return await axios.get(API_URL, { withCredentials: true });
};

export const addToCart = async (productId, quantity = 1) => {
    return await axios.post(API_URL, { productId, quantity }, { withCredentials: true });
};

export const updateCartItem = async (productId, quantity) => {
    return await axios.put(`${API_URL}/${productId}`, { quantity }, { withCredentials: true });
};

export const removeFromCart = async (productId) => {
    return await axios.delete(`${API_URL}/${productId}`, { withCredentials: true });
};

