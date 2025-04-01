import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export default function CreateCompanyModal({ onClose, onCompanyCreated }) {
  const [companyName, setCompanyName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [GSTIN, setGSTIN] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName) {
      alert("Company name is required.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/companies`,
        { companyName, brandName, GSTIN, companyEmail, companyAddress },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCompanyCreated(res.data.company);
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Error creating company.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-4 rounded shadow-md w-96">
        <h2 className="text-lg font-semibold mb-4">Create Company</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label className="block text-sm font-medium">Company Name *</label>
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
            <label className="block text-sm font-medium">Company Email</label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
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
