import axios from "axios";

const API = "/api/products";

export const getMarketplaceProducts = () => {
  return axios.get(`${API}/marketplace`, { withCredentials: true });
};

export const getProductById = (id) => {
  return axios.get(`${API}/${id}`, { withCredentials: true });
};

export const addProductReview = (id, reviewData) => {
  return axios.post(`${API}/${id}/reviews`, reviewData, { withCredentials: true });
};

