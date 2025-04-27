// client/src/pages/SamplesOut.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import SampleOutModal from "../components/samples/SampleOutModal";
import SampleOutTable from "../components/samples/SampleOutTable";

export default function SamplesOut() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState("sent"); // "sent" or "received"
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token       = localStorage.getItem("token");

  const fetchAll = async () => {
    try {
      let url = `${BACKEND_URL}/api/admin/sample-outs`;
      if (search.trim()) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data);
    } catch (err) {
      console.error("Failed to fetch sample-outs:", err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [search]);

  const openCreate = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const openEdit = (so) => {
    setEditData(so);
    setModalOpen(true);
  };

  const filteredList = list.filter((row) =>
    viewFilter === "sent" ? row.receivedBack === false : row.receivedBack === true
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 space-x-4">
        <input
          type="text"
          placeholder="Search…"
          className="border p-2 rounded w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="space-x-2">
          <button
            onClick={() => setViewFilter("sent")}
            className={`px-4 py-2 rounded ${
              viewFilter === "sent"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setViewFilter("received")}
            className={`px-4 py-2 rounded ${
              viewFilter === "received"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Received
          </button>
        </div>

        <button
          onClick={openCreate}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Sample Out
        </button>
      </div>

      <SampleOutTable data={filteredList} onEdit={openEdit} />

      {modalOpen && (
        <SampleOutModal
          initialData={editData}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
