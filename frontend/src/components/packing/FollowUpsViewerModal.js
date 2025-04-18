"use client";

import React from "react";

export default function FollowUpsViewerModal({ row, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          ×
        </button>
        <h2 className="text-lg font-bold mb-4 text-purple-700">
          Follow‑ups for {row.jobSheetNumber} – {row.product}
        </h2>

        {row.followUp && row.followUp.length ? (
          <ul className="list-disc ml-5 text-xs space-y-1 max-h-72 overflow-auto pr-2">
            {row.followUp
              .sort(
                (a, b) =>
                  new Date(b.followUpDate) - new Date(a.followUpDate)
              )
              .map((fu, idx) => (
                <li key={idx}>
                  <span className="font-semibold">
                    {formatDate(fu.followUpDate)}:
                  </span>{" "}
                  {fu.note}
                  <br />
                  <span className="text-gray-500">
                    — {fu.createdBy} • {formatDateTime(fu.createdAt)}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">No follow‑ups recorded.</p>
        )}
      </div>
    </div>
  );
}

function formatDate(val) {
  const d = new Date(val);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}
function formatDateTime(val) {
  const d = new Date(val);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString();
}
