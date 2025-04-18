"use client";

import React, { useState } from "react";

export default function FollowUpModal({ onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const handleSave = () => {
    if (!note.trim()) {
      alert("Enter note");
      return;
    }
    onSave({
      followUpDate: new Date(date),
      note,
      createdBy: localStorage.getItem("email") || "Me",
      createdAt: new Date(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-5 rounded w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ×
        </button>
        <h3 className="text-lg font-bold mb-4 text-purple-700">Add Follow‑up</h3>
        <label className="block text-sm font-medium mb-1">Date</label>
        <input
          type="date"
          className="border rounded p-2 w-full mb-4"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label className="block text-sm font-medium mb-1">Note</label>
        <textarea
          className="border rounded p-2 w-full mb-4"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded hover:bg-gray-100 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
