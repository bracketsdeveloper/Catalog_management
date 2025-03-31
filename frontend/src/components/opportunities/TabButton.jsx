// ../components/opportunities/TabButton.jsx
import React from "react";

export default function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded font-semibold
        ${active ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-800"}
        hover:opacity-90 text-sm
      `}
    >
      {label}
    </button>
  );
}
