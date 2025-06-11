import React from "react";

function ToggleViewButtons({ viewMode, setViewMode }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setViewMode("calendar")}
        className={`px-4 py-2 rounded text-sm ${viewMode === "calendar" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
      >
        Calendar View
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={`px-4 py-2 rounded text-sm ${viewMode === "list" ? "bg-purple-600 text-white" : "bg-gray-200"}`}
      >
        List View
      </button>
      
    </div>
  );
}

export default ToggleViewButtons;