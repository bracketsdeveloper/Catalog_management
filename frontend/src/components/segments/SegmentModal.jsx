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
  const [quantityQueries, setQuantityQueries] = useState([
    { fromQty: "", toQty: "", operation: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (segment) {
      setSegmentName(segment.segmentName);
      setPriceQueries(
        segment.priceQueries.length > 0
          ? segment.priceQueries.map((q) => ({
              from: q.from,
              to: q.to,
              margin: q.margin,
            }))
          : [{ from: "", to: "", margin: "" }]
      );
      setQuantityQueries(
        segment.quantityQueries.length > 0
          ? segment.quantityQueries.map((q) => ({
              fromQty: q.fromQty,
              toQty: q.toQty,
              operation: q.operation,
            }))
          : [{ fromQty: "", toQty: "", operation: "" }]
      );
    }
  }, [segment]);

  const addPriceQuery = () => {
    // Only allow adding a new row if all existing rows are complete
    const hasIncompletePrice = priceQueries.some(
      (q) => !q.from || !q.to || !q.margin
    );
    if (hasIncompletePrice) {
      setError("Please complete all existing price query fields before adding a new row");
      return;
    }
    setPriceQueries((prev) => [...prev, { from: "", to: "", margin: "" }]);
    setError("");
  };

  const updatePriceQuery = (idx, field, val) => {
    const arr = [...priceQueries];
    arr[idx][field] = val;
    setPriceQueries(arr);
  };

  const removePriceQuery = (idx) => {
    if (priceQueries.length === 1) return;
    setPriceQueries((prev) => prev.filter((_, i) => i !== idx));
  };

  const addQuantityQuery = () => {
    // Only allow adding a new row if all existing rows are complete
    const hasIncompleteQuantity = quantityQueries.some(
      (q) => !q.fromQty || !q.toQty || q.operation === ""
    );
    if (hasIncompleteQuantity) {
      setError("Please complete all existing quantity query fields before adding a new row");
      return;
    }
    setQuantityQueries((prev) => [
      ...prev,
      { fromQty: "", toQty: "", operation: "" },
    ]);
    setError("");
  };

  const updateQuantityQuery = (idx, field, val) => {
    const arr = [...quantityQueries];
    arr[idx][field] = val;
    setQuantityQueries(arr);
  };

  const removeQuantityQuery = (idx) => {
    if (quantityQueries.length === 1) return;
    setQuantityQueries((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!segmentName.trim()) {
      setError("Segment name is required");
      return;
    }

    // Filter out incomplete price queries
    const validPriceQueries = priceQueries.filter(
      (q) => q.from && q.to && q.margin
    );
    if (validPriceQueries.length === 0) {
      setError("At least one complete price query is required");
      return;
    }

    // Validate price queries
    for (const [i, q] of validPriceQueries.entries()) {
      if (isNaN(q.from) || isNaN(q.to) || isNaN(q.margin)) {
        setError(`Price query row ${i + 1}: Range and margin must be valid numbers`);
        return;
      }
      if (Number(q.from) < 0) {
        setError(`Price query row ${i + 1}: 'From' cannot be negative`);
        return;
      }
      if (Number(q.to) < Number(q.from)) {
        setError(`Price query row ${i + 1}: 'To' must be greater than or equal to 'From'`);
        return;
      }
      if (Number(q.margin) < 0) {
        setError(`Price query row ${i + 1}: Margin cannot be negative`);
        return;
      }
    }

    // Filter out incomplete quantity queries (allow empty quantity queries)
    const validQuantityQueries = quantityQueries.filter(
      (q) => q.fromQty && q.toQty && q.operation !== ""
    );

    // Validate quantity queries (if any)
    for (const [i, q] of validQuantityQueries.entries()) {
      if (isNaN(q.fromQty) || isNaN(q.toQty) || isNaN(q.operation)) {
        setError(`Quantity query row ${i + 1}: Range and operation must be valid numbers`);
        return;
      }
      if (Number(q.fromQty) < 0) {
        setError(`Quantity query row ${i + 1}: 'From' cannot be negative`);
        return;
      }
      if (Number(q.toQty) < Number(q.fromQty)) {
        setError(`Quantity query row ${i + 1}: 'To' must be greater than or equal to 'From'`);
        return;
      }
      if (Number(q.operation) < -10 || Number(q.operation) > 10) {
        setError(`Quantity query row ${i + 1}: Operation must be between -10 and +10`);
        return;
      }
    }

    setError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        segmentName: segmentName.trim(),
        priceQueries: validPriceQueries.map((q) => ({
          from: Number(q.from),
          to: Number(q.to),
          margin: Number(q.margin),
        })),
        quantityQueries: validQuantityQueries.map((q) => ({
          fromQty: Number(q.fromQty),
          toQty: Number(q.toQty),
          operation: Number(q.operation),
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
        await axios.post(`${BACKEND_URL}/api/admin/segments`, payload, config);
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
        <h2 className="text-xl font-bold mb-4 text-purple-700">
          {isEdit ? "Edit Segment" : "Add Segment"}
        </h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4">{error}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-purple-700">
              Segment Name *
            </label>
            <input
              type="text"
              className="w-full p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-medium text-purple-700">Price Queries</label>
              <button
                onClick={addPriceQuery}
                className="text-blue-600 hover:underline text-sm"
              >
                + Add Query
              </button>
            </div>
            <div className="space-y-2">
              {priceQueries.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="From INR"
                    className="w-1/3 p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                    value={q.from}
                    onChange={(e) => updatePriceQuery(i, "from", e.target.value)}
                    min="0"
                    step="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="To INR"
                    className="w-1/3 p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                    value={q.to}
                    onChange={(e) => updatePriceQuery(i, "to", e.target.value)}
                    min="0"
                    step="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Margin %"
                    className="w-1/4 p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                    value={q.margin}
                    onChange={(e) => updatePriceQuery(i, "margin", e.target.value)}
                    min="0"
                    step="0.1"
                    required
                  />
                  <button
                    onClick={() => removePriceQuery(i)}
                    className="text-red-600 hover:text-red-800"
                    disabled={priceQueries.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-medium text-purple-700">
                Quantity Queries
              </label>
              <button
                onClick={addQuantityQuery}
                className="text-blue-600 hover:underline text-sm"
              >
                + Add Query
              </button>
            </div>
            <div className="space-y-2">
              {quantityQueries.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="From Qty"
                    className="w-1/3 p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                    value={q.fromQty}
                    onChange={(e) =>
                      updateQuantityQuery(i, "fromQty", e.target.value)
                    }
                    min="0"
                    step="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="To Qty"
                    className="w-1/3 p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                    value={q.toQty}
                    onChange={(e) =>
                      updateQuantityQuery(i, "toQty", e.target.value)
                    }
                    min="0"
                    step="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Operation %"
                    className="w-1/4 p-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                    value={q.operation}
                    onChange={(e) =>
                      updateQuantityQuery(i, "operation", e.target.value)
                    }
                    min="-10"
                    max="10"
                    step="0.1"
                    required
                  />
                  <button
                    onClick={() => removeQuantityQuery(i)}
                    className="text-red-600 hover:text-red-800"
                    disabled={quantityQueries.length === 1}
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
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className={`px-4 py-2 text-white rounded ${
                saving
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={saving}
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}