"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

export default function UserManagement() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [updatedRole, setUpdatedRole] = useState("");
  const [updatedSuperAdmin, setUpdatedSuperAdmin] = useState(false);
  const [updatedHandles, setUpdatedHandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  // Available handles options
  const handleOptions = ["CRM", "PURCHASE", "PRODUCTION", "SALES"];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BACKEND_URL}/api/user/users`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setUsers(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching users:", err.response || err.message);
        setError(
          err.response?.data?.message || "Failed to load users. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleUpdateUser = async (userId) => {
    try {
      // Update role
      await axios.put(
        `${BACKEND_URL}/api/user/users/${userId}/role`,
        { role: updatedRole },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Update SuperAdmin status if user is SuperAdmin
      if (isSuperAdmin) {
        await axios.put(
          `${BACKEND_URL}/api/user/users/${userId}/superadmin`,
          { isSuperAdmin: updatedSuperAdmin },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      }

      // Update handles
      await axios.put(
        `${BACKEND_URL}/api/user/users/${userId}/handles`,
        { handles: updatedHandles },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                role: updatedRole,
                isSuperAdmin: isSuperAdmin ? updatedSuperAdmin : u.isSuperAdmin,
                handles: updatedHandles,
              }
            : u
        )
      );
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err.response || err.message);
      alert("Failed to update user. Please try again.");
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user._id);
    setUpdatedRole(user.role);
    setUpdatedSuperAdmin(user.isSuperAdmin);
    setUpdatedHandles(Array.isArray(user.handles) ? user.handles : []);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setUpdatedRole("");
    setUpdatedSuperAdmin(false);
    setUpdatedHandles([]);
  };

  const filteredUsers =
    roleFilter === "ALL"
      ? users
      : users.filter((user) => user.role === roleFilter);

  const handleExportExcel = () => {
    if (!filteredUsers.length) {
      alert("No users to export!");
      return;
    }
    const dataForExcel = filteredUsers.map((u) => ({
      Name: u.name,
      Phone: u.phone || "N/A",
      DateOfBirth: u.dateOfBirth
        ? new Date(u.dateOfBirth).toLocaleDateString("en-GB")
        : "N/A",
      Address: u.address || "",
      Email: u.email,
      Role: u.role === "GENERAL" ? "DEACTIVE" : u.role,
      Handles: Array.isArray(u.handles) ? u.handles.join(", ") : "N/A",
      SuperAdmin: u.isSuperAdmin ? "Yes" : "No",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    XLSX.utils.book_append_sheet(wb, ws, "FilteredUsers");
    XLSX.writeFile(wb, "filtered_users.xlsx");
  };

  if (loading) {
    return <div className="text-gray-900">Loading users...</div>;
  }

  if (error) {
    return <div className="text-pink-600">{error}</div>;
  }

  return (
    <div className="p-6 bg-white text-gray-900 rounded-md shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-[#Ff8045]">User Management</h1>
      <div className="flex items-center mb-4 gap-2">
        <label htmlFor="roleFilter" className="text-sm font-medium">
          Filter by Role:
        </label>
        <select
          id="roleFilter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
        >
          <option value="ALL">ALL</option>
          <option value="GENERAL">DEACTIVE</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button
          onClick={handleExportExcel}
          className="ml-auto bg-[#44b977] text-white px-4 py-1 rounded-lg hover:bg-blue-700 text-sm"
        >
          Export to Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-purple-200 rounded-lg">
          <thead>
            <tr className="bg-purple-100 text-purple-900">
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Email</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Handles</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Account Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">SuperAdmin</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id} className="border-b border-purple-200">
                <td className="px-6 py-4 text-sm">{user.name}</td>
                <td className="px-6 py-4 text-sm">{user.phone || "N/A"}</td>
                <td className="px-6 py-4 text-sm">{user.email}</td>
                <td className="px-6 py-4 text-sm">
                  {Array.isArray(user.handles) ? user.handles.join(", ") : "N/A"}
                </td>
                <td className="px-6 py-4 text-sm">
                  {user.role === "GENERAL" ? "DEACTIVE" : user.role}
                </td>
                <td className="px-6 py-4 text-sm">{user.isSuperAdmin ? "Yes" : "No"}</td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => openEditModal(user)}
                    className="bg-[#66C3D0] text-white px-3 py-1 rounded-md hover:bg-[#44b977]/70"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Edit User</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={updatedRole}
                onChange={(e) => setUpdatedRole(e.target.value)}
                className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
              >
                <option value="GENERAL">DEACTIVATE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            {isSuperAdmin && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">SuperAdmin</label>
                <select
                  value={updatedSuperAdmin}
                  onChange={(e) => setUpdatedSuperAdmin(e.target.value === "true")}
                  className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
                >
                  <option value={false}>No</option>
                  <option value={true}>Yes</option>
                </select>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Handles</label>
              <select
                value={updatedHandles[0] || ""}
                onChange={(e) => setUpdatedHandles([e.target.value])}
                className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
              >
                <option value="" disabled>Select handle</option>
                {handleOptions.map((handle) => (
                  <option key={handle} value={handle}>
                    {handle}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeEditModal}
                className="bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser)}
                className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}