"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

/* Canonical alphabetical roles */
const ROLE_OPTIONS_ASC = [
  "ACCOUNTS",
  "ADMIN",
  "CRM",
  "DESIGN",
  "HR",
  "PROCESS",
  "PRODUCTION",
  "PURCHASE",
  "SALES",
];

export default function UserManagement() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  // Editing states
  const [updatedName, setUpdatedName] = useState("");
  const [updatedAccountStatus, setUpdatedAccountStatus] = useState("GENERAL");
  const [updatedRoles, setUpdatedRoles] = useState([]);
  const [updatedSuperAdmin, setUpdatedSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters + sorting
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [nameSort, setNameSort] = useState("asc");
  const [roleSortDir, setRoleSortDir] = useState("asc");
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  // for per row actions dropdown
  const [openMenuFor, setOpenMenuFor] = useState(null);

  /* compute role options based on sort dir */
  const roleOptions = useMemo(() => {
    const arr = [...ROLE_OPTIONS_ASC];
    if (roleSortDir === "desc") arr.reverse();
    return arr;
  }, [roleSortDir]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${BACKEND_URL}/api/user/users?sortName=${nameSort}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        setUsers(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [BACKEND_URL, nameSort]);

  const filteredUsers = useMemo(() => {
    if (statusFilter === "ALL") return users;
    return users.filter((u) => u.role === statusFilter);
  }, [users, statusFilter]);

  function openEditModal(user) {
    setEditingUser(user._id);
    setUpdatedName(user.name || "");
    setUpdatedAccountStatus(user.role || "GENERAL");
    setUpdatedSuperAdmin(!!user.isSuperAdmin);
    setUpdatedRoles(Array.isArray(user.roles) ? user.roles : []);
    setOpenMenuFor(null);
  }

  function closeEditModal() {
    setEditingUser(null);
    setUpdatedName("");
    setUpdatedAccountStatus("GENERAL");
    setUpdatedSuperAdmin(false);
    setUpdatedRoles([]);
  }

  async function handleUpdateUser(userId) {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

      // Update user name first (new endpoint needed)
      if (updatedName.trim()) {
        await axios.put(
          `${BACKEND_URL}/api/admin/users/${userId}/name`,
          { name: updatedName.trim() },
          { headers }
        );
      }

      // Update legacy account status
      await axios.put(
        `${BACKEND_URL}/api/user/users/${userId}/role`,
        { role: updatedAccountStatus },
        { headers }
      );

      // Update SuperAdmin if caller is superadmin
      if (isSuperAdmin) {
        await axios.put(
          `${BACKEND_URL}/api/user/users/${userId}/superadmin`,
          { isSuperAdmin: updatedSuperAdmin },
          { headers }
        );
      }

      // Update multi roles
      await axios.put(
        `${BACKEND_URL}/api/user/users/${userId}/roles`,
        { roles: updatedRoles },
        { headers }
      );

      // reflect locally
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                name: updatedName.trim() || u.name,
                role: updatedAccountStatus,
                isSuperAdmin: isSuperAdmin ? updatedSuperAdmin : u.isSuperAdmin,
                roles: [...updatedRoles].sort((a, b) => a.localeCompare(b)),
              }
            : u
        )
      );

      closeEditModal();
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to update user. Please try again."
      );
    }
  }

  async function handleDeleteUser(userId) {
    if (!isSuperAdmin) {
      alert("Only SuperAdmins can delete users.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this user? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      await axios.delete(`${BACKEND_URL}/api/user/users/${userId}`, { headers });

      setUsers((prev) => prev.filter((u) => u._id !== userId));

      if (editingUser === userId) {
        closeEditModal();
      }
      setOpenMenuFor(null);
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to delete user. Please try again."
      );
    }
  }

  function toggleRole(role) {
    setUpdatedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function handleExportExcel() {
    const data = filteredUsers.map((u) => ({
      Name: u.name,
      Phone: u.phone || "N/A",
      Email: u.email,
      AccountStatus: u.role || "GENERAL",
      Roles: Array.isArray(u.roles) ? u.roles.join(", ") : "",
      SuperAdmin: u.isSuperAdmin ? "Yes" : "No",
      Permissions: Array.isArray(u.permissions) ? u.permissions.join(", ") : "",
      DateOfBirth: u.dateOfBirth
        ? new Date(u.dateOfBirth).toLocaleDateString("en-GB")
        : "",
      Address: u.address || "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "users_export.xlsx");
  }

  function toggleMenu(userId) {
    setOpenMenuFor((prev) => (prev === userId ? null : userId));
  }

  if (loading) return <div className="text-gray-900 p-6">Loading users...</div>;
  if (error) return <div className="text-pink-600 p-6">{error}</div>;

  return (
    <div className="p-6 bg-white text-gray-900 rounded-md shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
        <h1 className="text-2xl font-bold text-[#Ff8045]">User Management</h1>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter by Account Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
          >
            <option value="ALL">ALL</option>
            <option value="GENERAL">DEACTIVE</option>
            <option value="ADMIN">ADMIN</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sort Names</label>
          <select
            value={nameSort}
            onChange={(e) => setNameSort(e.target.value)}
            className="bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
          >
            <option value="asc">A–Z</option>
            <option value="desc">Z–A</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sort Role List</label>
          <select
            value={roleSortDir}
            onChange={(e) => setRoleSortDir(e.target.value)}
            className="bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-1"
          >
            <option value="asc">A–Z</option>
            <option value="desc">Z–A</option>
          </select>
        </div>

        <button
          onClick={handleExportExcel}
          className="ml-auto bg-[#44b977] text-white px-4 py-1 rounded-lg hover:bg-[#44b977]/90 text-sm"
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
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Roles</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                Account Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                SuperAdmin
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id} className="border-b border-purple-200">
                <td className="px-6 py-4 text-sm">{user.name}</td>
                <td className="px-6 py-4 text-sm">{user.phone || "N/A"}</td>
                <td className="px-6 py-4 text-sm">{user.email}</td>
                <td className="px-6 py-4 text-sm">
                  {Array.isArray(user.roles) && user.roles.length
                    ? [...user.roles].sort((a, b) => a.localeCompare(b)).join(", ")
                    : "—"}
                </td>
                <td className="px-6 py-4 text-sm">{user.role || "GENERAL"}</td>
                <td className="px-6 py-4 text-sm">
                  {user.isSuperAdmin ? "Yes" : "No"}
                </td>
                <td className="px-6 py-4 text-sm relative">
                  <button
                    onClick={() => toggleMenu(user._id)}
                    className="px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100"
                    title="Actions"
                  >
                    ⋮
                  </button>

                  {openMenuFor === user._id && (
                    <div className="absolute right-4 mt-1 w-28 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                      <button
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </button>
                      {isSuperAdmin && (
                        <button
                          className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Edit User</h2>

            {/* Name field */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                type="text"
                value={updatedName}
                onChange={(e) => setUpdatedName(e.target.value)}
                className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-3 py-2"
                placeholder="Enter user name"
              />
            </div>

            {/* Account Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Account Status (legacy)
              </label>
              <select
                value={updatedAccountStatus}
                onChange={(e) => setUpdatedAccountStatus(e.target.value)}
                className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-2"
              >
                <option value="GENERAL">DEACTIVATE</option>
                <option value="ADMIN">ADMIN</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            {/* SuperAdmin */}
            {isSuperAdmin && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">SuperAdmin</label>
                <select
                  value={String(updatedSuperAdmin)}
                  onChange={(e) => setUpdatedSuperAdmin(e.target.value === "true")}
                  className="w-full bg-white border border-purple-300 text-gray-900 rounded-lg px-2 py-2"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            )}

            {/* Roles (multi) */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Roles</label>
                <div className="text-xs">
                  Sort:
                  <button
                    onClick={() => setRoleSortDir("asc")}
                    className={`ml-2 px-2 py-0.5 rounded ${
                      roleSortDir === "asc" ? "bg-purple-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    A–Z
                  </button>
                  <button
                    onClick={() => setRoleSortDir("desc")}
                    className={`ml-2 px-2 py-0.5 rounded ${
                      roleSortDir === "desc" ? "bg-purple-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    Z–A
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {roleOptions.map((r) => {
                  const checked = updatedRoles.includes(r);
                  return (
                    <label
                      key={r}
                      className={`flex items-center gap-2 border rounded px-2 py-2 text-sm cursor-pointer ${
                        checked ? "bg-pink-600 text-white border-pink-600" : "bg-gray-50"
                      }`}
                      onClick={() => toggleRole(r)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(r)}
                        className="accent-pink-600"
                      />
                      {r}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
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