// src/components/productionjobsheet/FollowUpModal.js
import React, { useState } from "react";

const FollowUpModal = ({ onClose, onSave }) => {
  const [followUpDate, setFollowUpDate] = useState("");
  const [note, setNote] = useState("");

  const handleSave = () => {
    if (followUpDate && note) {
      const newFollowUp = {
        followUpDate,
        note,
        updatedBy: "currentUser@example.com"
      };
      onSave(newFollowUp);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-4 rounded w-1/3 shadow-lg">
        <h3 className="text-lg text-purple-700 font-bold mb-2">Add Follow Up</h3>
        <div className="mb-2">
          <label className="block text-purple-600 font-semibold">Follow Up Date</label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full border border-blue-300 p-1 rounded"
          />
        </div>
        <div className="mb-2">
          <label className="block text-purple-600 font-semibold">Follow Up Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-blue-300 p-1 rounded"
          />
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded bg-gray-300 text-gray-800">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 border rounded bg-blue-500 text-white">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpModal;
