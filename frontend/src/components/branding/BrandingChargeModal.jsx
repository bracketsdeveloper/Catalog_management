// client/src/components/branding/BrandingChargeModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function BrandingChargeModal({
  mode,
  charge,
  onClose,
  onSuccess,
  BACKEND_URL,
}) {
  const isEdit = mode === "edit";
  const [brandingName, setBrandingName] = useState("");
  const [cost, setCost] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && charge) {
      setBrandingName(charge.brandingName);
      setCost(charge.cost.toString());
    }
  }, [isEdit, charge]);

  const handleSubmit = async () => {
    setErr("");
    if (!brandingName.trim() || !cost.trim()) {
      setErr("Both fields are required");
      return;
    }
    const nCost = Number(cost);
    if (isNaN(nCost) || nCost < 0) {
      setErr("Cost must be a non-negative number");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEdit) {
        await axios.put(
          `${BACKEND_URL}/api/admin/branding-charges/${charge._id}`,
          { brandingName: brandingName.trim(), cost: nCost },
          config
        );
      } else {
        await axios.post(
          `${BACKEND_URL}/api/admin/branding-charges`,
          { brandingName: brandingName.trim(), cost: nCost },
          config
        );
      }
      onSuccess();
    } catch (e) {
      setErr(
        e.response?.data?.message ||
          (e.response?.status === 400
            ? "Validation error"
            : "Could not save")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? "Edit Branding Charge" : "Add Branding Charge"}
        </h2>
        {err && <div className="bg-red-100 text-red-700 p-2 mb-3">{err}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Branding Name *
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={brandingName}
              onChange={(e) => setBrandingName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cost (₹) *</label>
            <input
              type="number"
              min="0"
              className="w-full p-2 border rounded"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 text-white rounded ${
              saving ? "bg-blue-400" : "bg-blue-600"
            }`}
            disabled={saving}
          >
            {saving
              ? isEdit
                ? "Updating…"
                : "Saving…"
              : isEdit
              ? "Update"
              : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
