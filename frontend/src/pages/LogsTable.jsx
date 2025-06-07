import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function LogsTable() {
  const [logs, setLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    action: "",
    field: "",
    performedBy: "",
    startDate: "",
    endDate: "",
  });

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${BACKEND}/api/admin/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUsers(res.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Fetch logs when filters or page changes
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = {
          page: currentPage,
          limit: 10,
          ...filters,
        };
        const res = await axios.get(`${BACKEND}/api/admin/logs`, {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages);
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    fetchLogs();
  }, [currentPage, filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  // Format values for display
  const formatValue = (value) => {
    if (!value) return "N/A";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2).slice(0, 50) + "...";
    }
    return String(value);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Activity Logs</h2>

      {/* Filters */}
      <div className="grid grid-cols-5 gap-4 mb-4 text-xs">
        <div>
          <label className="block font-medium">Action</label>
          <select
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            className="w-full border p-1 rounded"
          >
            <option value="">All</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">Field</label>
          <input
            type="text"
            name="field"
            value={filters.field}
            onChange={handleFilterChange}
            className="w-full border p-1 rounded"
            placeholder="e.g., catalog"
          />
        </div>
        <div>
          <label className="block font-medium">Performed By</label>
          <select
            name="performedBy"
            value={filters.performedBy}
            onChange={handleFilterChange}
            className="w-full border p-1 rounded"
          >
            <option value="">All</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full border p-1 rounded"
          />
        </div>
        <div>
          <label className="block font-medium">End Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full border p-1 rounded"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Action</th>
              <th className="border p-2">Field</th>
              <th className="border p-2">Old Value</th>
              <th className="border p-2">New Value</th>
              <th className="border p-2">Performed By</th>
              <th className="border p-2">Performed At</th>
              <th className="border p-2">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="7" className="border p-2 text-center text-gray-500">
                  No logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td className="border p-2">{log.action}</td>
                  <td className="border p-2">{log.field || "N/A"}</td>
                  <td className="border p-2">{formatValue(log.oldValue)}</td>
                  <td className="border p-2">{formatValue(log.newValue)}</td>
                  <td className="border p-2">
                    {typeof log.performedBy === "object"
                      ? log.performedBy?.name || log.performedBy?.email || "User Not Found"
                      : `ID: ${log.performedBy}`}
                  </td>
                  <td className="border p-2">
                    {new Date(log.performedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="border p-2">{log.ipAddress || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-4 text-xs">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}