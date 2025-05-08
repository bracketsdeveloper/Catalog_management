// client/src/pages/ManageBrandingCharges.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import BrandingChargeModal from "../components/branding/BrandingChargeModal.jsx";
import { TrashIcon } from "@heroicons/react/24/solid";

export default function ManageBrandingCharges() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedCharge, setSelectedCharge] = useState(null);

  useEffect(() => {
    fetchCharges();
  }, []);

  async function fetchCharges() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/branding-charges`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCharges(res.data);
      setError(null);
    } catch {
      setError("Failed to fetch branding charges");
    } finally {
      setLoading(false);
    }
  }

  const openAdd = () => {
    setModalMode("add");
    setSelectedCharge(null);
    setModalOpen(true);
  };
  const openEdit = (ch) => {
    setModalMode("edit");
    setSelectedCharge(ch);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this charge?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${BACKEND_URL}/api/admin/branding-charges/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCharges();
    } catch {
      alert("Failed to delete");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Branding Charges</h1>
        <button
          onClick={openAdd}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Branding Charge
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-3">Branding Name</th>
                <th className="p-3">Cost</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((ch) => (
                <tr
                  key={ch._id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3">{ch.brandingName}</td>
                  <td className="p-3">{ch.cost.toLocaleString()}</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => openEdit(ch)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ch._id)}
                      className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      <TrashIcon className="inline-block h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <BrandingChargeModal
          mode={modalMode}
          charge={selectedCharge}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchCharges();
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}
    </div>
  );
}
