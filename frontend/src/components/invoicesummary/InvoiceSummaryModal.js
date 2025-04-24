// components/invoicessummary/InvoicesSummaryModal.js
import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function InvoicesSummaryModal({ row, onClose, onSaved }) {
  const token = localStorage.getItem("token");
  const [form, setForm] = useState({
    invoiceDate: row.invoiceDate ? new Date(row.invoiceDate).toISOString().split("T")[0] : "",
    invoiceAmount: row.invoiceAmount || "",
    invoiceMailed: row.invoiceMailed || "No",
    invoiceUploadedOnPortal: row.invoiceUploadedOnPortal || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.put(
        `${BACKEND_URL}/api/admin/invoices-summary/${row._id}`,
        {
          invoiceDate: form.invoiceDate,
          invoiceAmount: form.invoiceAmount,
          invoiceMailed: form.invoiceMailed,
          invoiceUploadedOnPortal: form.invoiceUploadedOnPortal,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLoading(false);
      onSaved();
      onClose();
    } catch (err) {
      setLoading(false);
      setError("Error saving changes");
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Invoices Summary</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={form.invoiceDate}
                onChange={handleChange}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Invoice Amount
              </label>
              <input
                type="number"
                name="invoiceAmount"
                value={form.invoiceAmount}
                onChange={handleChange}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Invoice Mailed
              </label>
              <select
                name="invoiceMailed"
                value={form.invoiceMailed}
                onChange={handleChange}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Invoice Uploaded on Portal
              </label>
              <input
                type="text"
                name="invoiceUploadedOnPortal"
                value={form.invoiceUploadedOnPortal}
                onChange={handleChange}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}