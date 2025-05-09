"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import SegmentModal from "../components/segments/SegmentModal.jsx";

export default function ManageSegments() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSegment, setEditSegment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSegments();
  }, []);

  async function fetchSegments() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ensure response is an array and normalize data
      const data = Array.isArray(res.data)
        ? res.data.map((seg) => ({
            ...seg,
            priceQueries: Array.isArray(seg.priceQueries) ? seg.priceQueries : [],
            quantityQueries: Array.isArray(seg.quantityQueries)
              ? seg.quantityQueries
              : [],
          }))
        : [];
      setSegments(data);
    } catch (e) {
      console.error("Error fetching segments:", e);
      setError("Failed to fetch segments. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const openAdd = () => {
    setEditSegment(null);
    setModalOpen(true);
  };

  const openEdit = (seg) => {
    setEditSegment(seg);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this segment?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/segments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSegments();
    } catch (e) {
      console.error("Error deleting segment:", e);
      alert("Delete failed");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Segments</h1>
        <button
          onClick={openAdd}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          + Add Segment
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-2 mb-4">{error}</div>
      )}

      {loading ? (
        <div>Loading…</div>
      ) : segments.length === 0 ? (
        <div>No segments found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Price Ranges</th>
                <th className="p-2 border">Quantity Ranges</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="p-2 border">{s.segmentName}</td>
                  <td className="p-2 border">
                    {s.priceQueries.length > 0 ? (
                      s.priceQueries.map((q, i) => (
                        <div key={i} className="text-sm">
                          ₹{q.from}–₹{q.to} @ {q.margin}%
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">None</div>
                    )}
                  </td>
                  <td className="p-2 border">
                    {s.quantityQueries.length > 0 ? (
                      s.quantityQueries.map((q, i) => (
                        <div key={i} className="text-sm">
                          {q.fromQty}–{q.toQty} units = n{q.operation > 0 ? "+" : ""}
                          {q.operation} 
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">None</div>
                    )}
                  </td>
                  <td className="p-2 border space-x-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <SegmentModal
          segment={editSegment}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchSegments();
          }}
        />
      )}
    </div>
  );
}