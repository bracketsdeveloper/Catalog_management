// src/api/meClient.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export const MeAPI = {
  getProfile() {
    return axios.get(`${API_BASE}/api/me/profile`, { headers: authHeaders() });
  },
  updateProfile(payload) {
    return axios.put(`${API_BASE}/api/me/profile`, payload, { headers: authHeaders() });
  },
};
