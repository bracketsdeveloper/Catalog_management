import React from "react";

export default function ToggleButtons({ viewMode, setViewMode }) {
  return (
    <div className="flex space-x-1">
      <button
        onClick={() => setViewMode("list")}
        className={`border border-gray-300 rounded px-2 py-1 text-sm ${
          viewMode === "list" ? "bg-purple-600 text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M4 5h12M4 10h12M4 15h12" />
        </svg>
      </button>
      <button
        onClick={() => setViewMode("kanban")}
        className={`border border-gray-300 rounded px-2 py-1 text-sm ${
          viewMode === "kanban" ? "bg-purple-600 text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeWidth={2} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
        </svg>
      </button>
    </div>
  );
}
