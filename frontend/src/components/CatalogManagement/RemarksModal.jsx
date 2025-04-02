import React, { useState } from "react";

export default function RemarksModal({ item, type, onClose, onSave, userEmail }) {
  const [remarksText, setRemarksText] = useState("");
  const [remarksList, setRemarksList] = useState(item.remarks || []);

  const handleSubmit = async () => {
    const newRemark = {
      sender: userEmail,
      message: remarksText,
      timestamp: new Date(),
    };
    const updatedRemarks = [...remarksList, newRemark];
    setRemarksList(updatedRemarks);
    setRemarksText("");
    await onSave(updatedRemarks, type, item._id);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded w-96">
        <h2 className="text-lg font-bold mb-2 text-purple-700">Remarks</h2>
        <div className="max-h-60 overflow-y-auto border p-2 mb-2">
          {remarksList.length > 0 ? (
            remarksList.map((r, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-bold">{r.sender}: </span>
                <span>{r.message}</span>
                <br />
                <small className="text-gray-500">
                  {new Date(r.timestamp).toLocaleString()}
                </small>
              </div>
            ))
          ) : (
            <p>No remarks yet.</p>
          )}
        </div>
        <textarea
          className="w-full border p-2 rounded mb-2"
          rows="3"
          placeholder="Type your remark..."
          value={remarksText}
          onChange={(e) => setRemarksText(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Save Remark
          </button>
        </div>
      </div>
    </div>
  );
}
