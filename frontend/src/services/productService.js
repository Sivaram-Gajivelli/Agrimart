import axios from "axios";

const API = "/api/products";

export const getMarketplaceProducts = (params = {}) => {
  const { lat, lng } = params;
  const query = (lat && lng) ? `?lat=${lat}&lng=${lng}` : '';
  return axios.get(`${API}/marketplace${query}`, { withCredentials: true });
};

export const getProductById = (id) => {
  return axios.get(`${API}/${id}`, { withCredentials: true });
};

export const addProductReview = (id, reviewData) => {
  return axios.post(`${API}/${id}/reviews`, reviewData, { withCredentials: true });
};

