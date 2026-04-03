import axios from "axios";

const API = "/api/auth";

export const registerUser = (data) => {
  return axios.post(`${API}/register`, data, { withCredentials: true });
};

export const loginUser = (data) => {
  return axios.post(`${API}/login`, data, { withCredentials: true });
};

