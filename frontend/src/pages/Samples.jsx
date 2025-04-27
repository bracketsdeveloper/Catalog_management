// pages/Samples.jsx
"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import SampleTable from "../components/samples/SampleTable.js";
import AddSampleModal from "../components/samples/AddSampleModal.js";

export default function Samples() {
  const [samples, setSamples] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editSample, setEditSample] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  const fetchSamples = async () => {
    try {
      let url = `${BACKEND_URL}/api/admin/samples`;
      if (search.trim()) {
        url += `?search=${encodeURIComponent(search.trim())}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSamples(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchSamples(); }, [search]);

  const openCreate = () => {
    setEditSample(null);
    setModalOpen(true);
  };
  const openEdit = (sample) => {
    setEditSample(sample);
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search samples…"
          className="border p-2 rounded w-1/3"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={openCreate}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Sample
        </button>
      </div>

      <SampleTable samples={samples} onEdit={openEdit} />

      {modalOpen && (
        <AddSampleModal
          initialData={editSample}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchSamples();
          }}
        />
      )}
    </div>
  );
}
