"use client"; // Remove if using plain Create React App

import React, { useEffect, useState } from "react";
import axios from "axios";

export default function SubAdminManager() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For the create sub-admin modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // For creating new sub-admin
  const [newAdminData, setNewAdminData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    permissions: [],
  });

  // For editing permissions
  const [editingPermissionsId, setEditingPermissionsId] = useState(null);
  const [tempPermissions, setTempPermissions] = useState([]);

  // Sample pages or features that can be toggled
  const allPermissions = [
    "manage-users",
    "manage-products",
    "sub-admins",
    "review-catalog",
    "manage-catalog",
    "viewers-manager",
    "manage-jobsheets",
    "manage-companies",
    "opportunities",
    "edit-production",
    "open-purchase",
    "closed-purchases",
    "manage-purchaseinvoice",
    "manage-productionjobsheet",
    "closed-productionjobsheet",
    "production-invoice",
  ];

  useEffect(() => {
    fetchSubAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/sub-admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubAdmins(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching sub-admins:", err);
      setError("Failed to load sub-admins");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Creating new sub-admin
  // -----------------------------
  const handleCreateSubAdmin = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BACKEND_URL}/api/admin/sub-admins`,
        newAdminData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewAdminData({
        name: "",
        email: "",
        phone: "",
        password: "",
        permissions: [],
      });
      setCreateModalOpen(false); // close modal
      fetchSubAdmins();
    } catch (err) {
      console.error("Error creating sub-admin:", err);
      setError("Failed to create sub-admin");
    }
  };

  // Toggle a permission in the newAdminData
  const toggleNewAdminPermission = (perm) => {
    setNewAdminData((prev) => {
      const hasPerm = prev.permissions.includes(perm);
      if (hasPerm) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p !== perm),
        };
      } else {
        return {
          ...prev,
          permissions: [...prev.permissions, perm],
        };
      }
    });
  };

  // -----------------------------
  // Editing an existing sub-admin's permissions
  // -----------------------------
  const handleEditPermissions = (admin) => {
    setEditingPermissionsId(admin._id);
    setTempPermissions(admin.permissions || []);
  };

  // Toggle a permission in the sub-admin we are editing
  const toggleTempPermission = (perm) => {
    setTempPermissions((prev) => {
      const hasPerm = prev.includes(perm);
      if (hasPerm) {
        return prev.filter((p) => p !== perm);
      } else {
        return [...prev, perm];
      }
    });
  };

  // Save updated permissions
  const handleSavePermissions = async (adminId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/sub-admins/${adminId}`,
        { permissions: tempPermissions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingPermissionsId(null);
      fetchSubAdmins(); // refresh
    } catch (err) {
      console.error("Error updating permissions:", err);
      setError("Failed to update permissions");
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPermissionsId(null);
    setTempPermissions([]);
  };

  // -----------------------------
  // Delete sub-admin
  // -----------------------------
  const handleDeleteSubAdmin = async (adminId) => {
    if (!window.confirm("Are you sure you want to delete this sub-admin?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/sub-admins/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSubAdmins();
    } catch (err) {
      console.error("Error deleting sub-admin:", err);
      setError("Failed to delete sub-admin");
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  if (loading) return <p className="p-6 text-gray-900">Loading sub-admins...</p>;
  if (error) return <p className="p-6 text-pink-600">{error}</p>;

  return (
    <div className="p-6 bg-white text-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-purple-700">Sub-Admin Manager</h1>
        <button
          className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700"
          onClick={() => setCreateModalOpen(true)}
        >
          Create Sub-Admin
        </button>
      </div>

      {/* Create Sub-Admin Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
          <div className="bg-white p-6 rounded w-full max-w-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-2 right-2 bg-pink-600 text-white p-1 rounded"
            >
              X
            </button>
            <h2 className="text-lg font-semibold mb-3 text-purple-700">
              Create New Sub-Admin
            </h2>
            <form onSubmit={handleCreateSubAdmin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={newAdminData.name}
                  onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                  className="bg-gray-100 border border-purple-300 text-gray-900 rounded px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  className="bg-gray-100 border border-purple-300 text-gray-900 rounded px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  required
                  value={newAdminData.phone}
                  onChange={(e) => setNewAdminData({ ...newAdminData, phone: e.target.value })}
                  className="bg-gray-100 border border-purple-300 text-gray-900 rounded px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                  className="bg-gray-100 border border-purple-300 text-gray-900 rounded px-3 py-2 w-full"
                />
              </div>

              {/* Permission Toggles */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-3 rounded border border-purple-200">
                  {allPermissions.map((perm) => (
                    <div
                      key={perm}
                      onClick={() => toggleNewAdminPermission(perm)}
                      className={`cursor-pointer p-2 rounded text-sm text-center transition-colors border border-transparent ${
                        newAdminData.permissions.includes(perm)
                          ? "bg-pink-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {perm}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700 text-white font-semibold"
              >
                Create Sub-Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* List Existing Sub-Admins */}
      <div className="bg-white p-4 rounded border border-purple-200">
        <h2 className="text-lg font-semibold mb-3 text-purple-700">
          Existing Sub-Admins
        </h2>
        {subAdmins.length === 0 ? (
          <p className="text-gray-500">No sub-admins found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded border border-purple-100">
              <thead className="bg-purple-50 text-purple-900">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-sm">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-sm">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-sm">
                    Permissions
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {subAdmins.map((admin) => (
                  <tr key={admin._id} className="border-b border-purple-100">
                    <td className="px-4 py-2 text-sm">{admin.name}</td>
                    <td className="px-4 py-2 text-sm">{admin.email}</td>
                    <td className="px-4 py-2 text-sm">
                      {editingPermissionsId === admin._id ? (
                        <div className="grid grid-cols-2 gap-2">
                          {allPermissions.map((perm) => (
                            <div
                              key={perm}
                              onClick={() => toggleTempPermission(perm)}
                              className={`cursor-pointer p-1 rounded text-sm text-center transition-colors border border-transparent ${
                                tempPermissions.includes(perm)
                                  ? "bg-pink-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {perm}
                            </div>
                          ))}
                        </div>
                      ) : (
                        admin.permissions?.join(", ") || "None"
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {editingPermissionsId === admin._id ? (
                        <>
                          <button
                            onClick={() => handleSavePermissions(admin._id)}
                            className="bg-pink-600 px-3 py-1 rounded text-white hover:bg-pink-700 mr-2"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gray-400 px-3 py-1 rounded text-white hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditPermissions(admin)}
                            className="bg-purple-600 px-3 py-1 rounded text-white hover:bg-purple-700 mr-2"
                          >
                            Edit Permissions
                          </button>
                          {/* <button
                            onClick={() => handleDeleteSubAdmin(admin._id)}
                            className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700"
                          >
                            Delete
                          </button> */}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
