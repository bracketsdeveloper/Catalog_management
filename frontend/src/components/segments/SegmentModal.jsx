// client/src/components/segments/SegmentModal.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function SegmentModal({ segment, onClose, onSaved }) {
  const isEdit = Boolean(segment);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [segmentName, setSegmentName] = useState("");
  const [priceQueries, setPriceQueries] = useState([
    { from: "", to: "", margin: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (segment) {
      setSegmentName(segment.segmentName);
      setPriceQueries(
        segment.priceQueries.map((q) => ({
          from: q.from,
          to: q.to,
          margin: q.margin,
        }))
      );
    }
  }, [segment]);

  const addQuery = () =>
    setPriceQueries((prev) => [...prev, { from: "", to: "", margin: "" }]);

  const updateQuery = (idx, field, val) => {
    const arr = [...priceQueries];
    arr[idx][field] = val;
    setPriceQueries(arr);
  };

  const removeQuery = (idx) => {
    if (priceQueries.length === 1) return;
    setPriceQueries((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!segmentName.trim()) {
      setError("Name required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        segmentName: segmentName.trim(),
        priceQueries: priceQueries.map((q) => ({
          from: Number(q.from),
          to: Number(q.to),
          margin: Number(q.margin),
        })),
      };
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isEdit) {
        await axios.put(
          `${BACKEND_URL}/api/admin/segments/${segment._id}`,
          payload,
          config
        );
      } else {
        await axios.post(
          `${BACKEND_URL}/api/admin/segments`,
          payload,
          config
        );
      }
      onSaved();
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? "Edit Segment" : "Add Segment"}
        </h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4">{error}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Segment Name *</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-medium">Price Queries</label>
              <button
                onClick={addQuery}
                className="text-blue-600 hover:underline text-sm"
              >
                + Add Query
              </button>
            </div>
            <div className="space-y-2">
              {priceQueries.map((q, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 space-x-2"
                >
                  <input
                    type="number"
                    placeholder="From INR"
                    className="w-1/3 p-2 border rounded"
                    value={q.from}
                    onChange={(e) => updateQuery(i, "from", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="To INR"
                    className="w-1/3 p-2 border rounded"
                    value={q.to}
                    onChange={(e) => updateQuery(i, "to", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Margin %"
                    className="w-1/4 p-2 border rounded"
                    value={q.margin}
                    onChange={(e) =>
                      updateQuery(i, "margin", e.target.value)
                    }
                  />
                  <button
                    onClick={() => removeQuery(i)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className={`px-4 py-2 text-white rounded ${
                saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
