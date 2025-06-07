import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export default function CreateCompanyModal({ onClose, onCompanyCreated }) {
  const [companyName, setCompanyName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [GSTIN, setGSTIN] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkDuplicate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/companies?companyName=${encodeURIComponent(companyName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.length > 0) {
        setError("Company name already exists.");
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error checking duplicate:", e);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !pincode) {
      setError("Company name and pincode are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (await checkDuplicate()) return;
      const token = localStorage.getItem("token");
      const payload = { companyName, brandName, GSTIN, companyAddress, pincode };
      console.log("Sending payload:", payload);
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/companies`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCompanyCreated(res.data.company);
    } catch (error) {
      console.error("Error creating company:", error.response?.data, error);
      setError(
        error.response?.data?.message || "Error creating company. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-4 rounded shadow-md w-96">
        <h2 className="text-lg font-semibold mb-4">Create Company</h2>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="block text-sm font-medium">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
              required
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">GSTIN</label>
            <input
              type="text"
              value={GSTIN}
              onChange={(e) => setGSTIN(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">Company Address</label>
            <input
              type="text"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}