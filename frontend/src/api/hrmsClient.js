// src/api/hrmsClient.js
import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export const HRMS = {
  /* ========================== Employees ========================== */
  listEmployees: (params = {}) =>
    axios.get(`${BASE}/api/hrms/employees`, {
      params,
      headers: authHeaders(),
    }),

  upsertEmployee: (payload) =>
    axios.post(`${BASE}/api/hrms/employees`, payload, {
      headers: authHeaders(),
    }),

  getEmployee: (employeeId) =>
    axios.get(`${BASE}/api/hrms/employees/${employeeId}`, {
      headers: authHeaders(),
    }),

  /* ========================== Attendance ========================= */
  getAttendance: (employeeId, params = {}) =>
    axios.get(`${BASE}/api/hrms/attendance/${employeeId}`, {
      params,
      headers: authHeaders(),
    }),

  exportAttendance: (employeeId) =>
    axios.get(`${BASE}/api/hrms/attendance/${employeeId}/export`, {
      headers: authHeaders(),
      responseType: "blob",
    }),

  // NEW: Bulk mark attendance (date + array of { employeeId, status })
  markAttendanceBulk: (payload) =>
    axios.post(`${BASE}/api/hrms/attendance/bulk`, payload, {
      headers: authHeaders(),
    }),

  /* ============================ Leaves =========================== */
  listLeaves: (employeeId) =>
    axios.get(`${BASE}/api/hrms/leaves/${employeeId}`, {
      headers: authHeaders(),
    }),

  createLeave: (payload) =>
    axios.post(`${BASE}/api/hrms/leaves`, payload, {
      headers: authHeaders(),
    }),

  decideLeave: (id, status) =>
    axios.patch(
      `${BASE}/api/hrms/leaves/${id}/decision`,
      { status },
      { headers: authHeaders() }
    ),

  /* ============================== WFH ============================ */
  listWfh: (params = {}) =>
    axios.get(`${BASE}/api/hrms/wfh`, {
      params,
      headers: authHeaders(),
    }),

  upsertWfh: (payload) =>
    axios.post(`${BASE}/api/hrms/wfh`, payload, {
      headers: authHeaders(),
    }),

  /* ============================= Salary ========================== */
  calcSalary: (params = {}) =>
    axios.get(`${BASE}/api/hrms/salary/calc`, {
      params,
      headers: authHeaders(),
    }),

  finalizeSalary: (payload) =>
    axios.post(`${BASE}/api/hrms/salary/finalize`, payload, {
      headers: authHeaders(),
    }),
};
