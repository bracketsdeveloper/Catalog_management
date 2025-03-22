import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const allAttributes = [
  "price",
  "category",
  "subCategory",
  "brandName",
  "stockInHand",
  "stockCurrentlyWith",
  "name",
  "productDetails",
];

export default function ViewersManager() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const [viewers, setViewers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingViewerId, setEditingViewerId] = useState(null);
  const [newViewerData, setNewViewerData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    accessibleProducts: [],
    visibleAttributes: allAttributes,
    singleSession: true,
    maxLogins: 1, // New field: maximum allowed logins for the viewer
  });

  useEffect(() => {
    fetchViewers();
    fetchProducts();
    // Restore the complete form data if it was saved before navigating away
    // and merge in any selected products saved separately.
    const storedData = localStorage.getItem("newViewerData");
    const storedProducts = localStorage.getItem("selectedViewerProductIds");
    let restoredData = {};

    if (storedData) {
      restoredData = JSON.parse(storedData);
      localStorage.removeItem("newViewerData");
    }
    if (storedProducts) {
      // If the full form data wasn't saved, start with default structure.
      restoredData.accessibleProducts = JSON.parse(storedProducts);
      localStorage.removeItem("selectedViewerProductIds");
    }
    if (Object.keys(restoredData).length) {
      setNewViewerData(restoredData);
    }
  }, []);

  const fetchViewers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/viewers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setViewers(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching viewers:", err);
      setError("Failed to load viewers");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleCreateViewer = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${BACKEND_URL}/api/admin/viewers`, newViewerData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewViewerData({
        name: "",
        email: "",
        phone: "",
        password: "",
        accessibleProducts: [],
        visibleAttributes: allAttributes,
        singleSession: true,
        maxLogins: 1,
      });
      fetchViewers();
    } catch (err) {
      console.error("Error creating viewer:", err);
      setError("Failed to create viewer");
    }
  };

  const handleEditViewer = (viewer) => {
    setEditingViewerId(viewer._id);
    setNewViewerData({
      name: viewer.name || "",
      email: viewer.email || "",
      phone: viewer.phone || "",
      password: "",
      accessibleProducts: viewer.accessibleProducts || [],
      visibleAttributes: viewer.visibleAttributes || allAttributes,
      singleSession: viewer.singleSession,
      maxLogins: viewer.maxLogins || 1, // populate maxLogins (default to 1)
    });
  };

  const handleUpdateViewer = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/viewers/${editingViewerId}`,
        newViewerData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEditingViewerId(null);
      setNewViewerData({
        name: "",
        email: "",
        phone: "",
        password: "",
        accessibleProducts: [],
        visibleAttributes: allAttributes,
        singleSession: true,
        maxLogins: 1,
      });
      fetchViewers();
    } catch (err) {
      console.error("Error updating viewer:", err);
      setError("Failed to update viewer");
    }
  };

  const handleDeleteViewer = async (viewerId) => {
    if (!window.confirm("Are you sure you want to delete this viewer?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/viewers/${viewerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchViewers();
    } catch (err) {
      console.error("Error deleting viewer:", err);
      setError("Failed to delete viewer");
    }
  };

  // Reactivate sets singleSession to false so that viewer can log in again.
  const handleReactivateViewer = async (viewerId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${BACKEND_URL}/api/admin/viewers/${viewerId}/reactivate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchViewers();
    } catch (err) {
      console.error("Error reactivating viewer:", err);
      setError("Failed to reactivate viewer");
    }
  };

  const toggleVisibleAttribute = (attr) => {
    setNewViewerData((prev) => {
      const exists = prev.visibleAttributes.includes(attr);
      return {
        ...prev,
        visibleAttributes: exists
          ? prev.visibleAttributes.filter((a) => a !== attr)
          : [...prev.visibleAttributes, attr],
      };
    });
  };

  const handleSelectProducts = () => {
    // Save the complete form data so it's restored upon returning from product selection
    localStorage.setItem("newViewerData", JSON.stringify(newViewerData));
    navigate("/admin-dashboard/select-products");
  };

  // Copy credentials function:
  const copyCredentials = (viewer) => {
    const loginUrl = `${process.env.REACT_APP_FRONTEND_URL}/login`;
    const credentialsText = `Login URL: ${loginUrl}
Username: ${viewer.email}
Password: ${viewer.plainPassword || "N/A"}`;
    navigator.clipboard.writeText(credentialsText);
    alert("Credentials copied to clipboard!");
  };

  return (
    <div className="p-4 md:p-6 bg-white text-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-purple-700">Viewers Manager</h1>
      {error && <p className="text-pink-600 mb-4">{error}</p>}
      {/* Viewer Form Popup */}
      <div className="bg-white p-4 rounded shadow mb-8 border border-purple-200">
        <h2 className="text-lg font-semibold mb-3">
          {editingViewerId ? "Edit Viewer" : "Create New Viewer"}
        </h2>
        <form
          onSubmit={editingViewerId ? handleUpdateViewer : handleCreateViewer}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                type="text"
                required
                value={newViewerData.name}
                onChange={(e) =>
                  setNewViewerData({ ...newViewerData, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                required
                value={newViewerData.email}
                onChange={(e) =>
                  setNewViewerData({ ...newViewerData, email: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                type="text"
                required
                value={newViewerData.phone}
                onChange={(e) =>
                  setNewViewerData({ ...newViewerData, phone: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                required={!editingViewerId}
                value={newViewerData.password}
                onChange={(e) =>
                  setNewViewerData({ ...newViewerData, password: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Max Logins</label>
              <input
                type="number"
                min="1"
                required
                value={newViewerData.maxLogins}
                onChange={(e) =>
                  setNewViewerData({ ...newViewerData, maxLogins: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-white border border-purple-300 rounded text-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Accessible Products</label>
            <button
              type="button"
              onClick={handleSelectProducts}
              className="bg-blue-600 px-3 py-1 rounded text-white text-sm mb-2 hover:bg-blue-700"
            >
              Select Products
            </button>
            <div className="flex flex-wrap gap-2">
              {newViewerData.accessibleProducts && newViewerData.accessibleProducts.length > 0 ? (
                newViewerData.accessibleProducts.map((prodId) => {
                  const prod = products.find((p) => p._id === prodId);
                  return prod ? (
                    <span key={prodId} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">
                      {prod.name}
                    </span>
                  ) : null;
                })
              ) : (
                <span className="text-sm text-gray-500">None Selected</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Visible Product Attributes</label>
            <div className="flex flex-wrap gap-2">
              {allAttributes.map((attr) => (
                <label key={attr} className="flex items-center space-x-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4"
                    checked={newViewerData.visibleAttributes.includes(attr)}
                    onChange={() => toggleVisibleAttribute(attr)}
                  />
                  <span>{attr}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-600">
              Viewer can log in on one session on one device. If they log out, they will not be able to log in again.
            </p>
          </div>
          <button
            type="submit"
            className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700 text-white font-semibold"
          >
            {editingViewerId ? "Update Viewer" : "Create Viewer"}
          </button>
        </form>
      </div>
      {/* Existing Viewers Table */}
      <div className="bg-white p-4 rounded shadow border border-purple-200">
        <h2 className="text-lg font-semibold mb-3">Existing Viewers</h2>
        {loading ? (
          <p className="text-gray-500">Loading viewers...</p>
        ) : viewers.length === 0 ? (
          <p className="text-gray-500">No viewers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded">
              <thead>
                <tr className="bg-purple-100 text-purple-900">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Accessible Products</th>
                  <th className="px-4 py-2 text-left">Visible Attributes</th>
                  <th className="px-4 py-2 text-left">Session Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {viewers.map((viewer) => (
                  <tr key={viewer._id} className="border-b border-gray-200">
                    <td className="px-4 py-2">{viewer.name}</td>
                    <td className="px-4 py-2">{viewer.email}</td>
                    <td className="px-4 py-2">
                      {viewer.accessibleProducts && viewer.accessibleProducts.length > 0 ? (
                        <span className="text-sm">
                          {viewer.accessibleProducts.length} products selected
                        </span>
                      ) : (
                        "None"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {viewer.visibleAttributes && viewer.visibleAttributes.length > 0
                        ? viewer.visibleAttributes.join(", ")
                        : "None"}
                    </td>
                    <td className="px-4 py-2">
                      {viewer.singleSession ? (
                        <span className="text-pink-600">Used</span>
                      ) : (
                        <span className="text-blue-600">Available</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleEditViewer(viewer)}
                        className="bg-purple-600 px-3 py-1 rounded text-white hover:bg-purple-700 mr-2 text-sm"
                      >
                        Edit
                      </button>
                      {viewer.singleSession && (
                        <button
                          onClick={() => handleReactivateViewer(viewer._id)}
                          className="bg-blue-600 px-3 py-1 rounded text-white hover:bg-blue-700 mr-2 text-sm"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteViewer(viewer._id)}
                        className="bg-pink-600 px-3 py-1 rounded text-white hover:bg-pink-700 mr-2 text-sm"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => copyCredentials(viewer)}
                        className="bg-purple-500 px-3 py-1 rounded text-white hover:bg-purple-600 text-sm"
                      >
                        Copy Credentials
                      </button>
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
