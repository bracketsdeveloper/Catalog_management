import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

export const HRMS = {
  listEmployees(params = {}) {
    const token = localStorage.getItem("token");
    return axios.get(`${BASE}/api/hrms/employees`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  },
  upsertEmployee(payload) {
    const token = localStorage.getItem("token");
    return axios.post(`${BASE}/api/hrms/employees`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  updateEmployee(employeeId, payload) {
    const token = localStorage.getItem("token");
    return axios.put(`${BASE}/api/hrms/employees/${employeeId}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  deleteEmployee(employeeId) {
    const token = localStorage.getItem("token");
    return axios.delete(`${BASE}/api/hrms/employees/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  searchUsers(q) {
    const token = localStorage.getItem("token");
    return axios.get(`${BASE}/api/hrms/users/search`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { q },
    });
  },
};
