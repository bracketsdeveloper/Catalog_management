// src/components/FilterDropdown.jsx
import React, { useState } from "react";

export default function FilterDropdown({ label, open, setOpen, options, selected, toggle, counts }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter options based on search term
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
      >
        {label} ({selected.length})
      </button>
      {open && (
        <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20 max-h-60 overflow-y-auto">
          {/* Search bar */}
          <div className="p-1 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Filtered options */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <label
                key={opt}
                className="flex items-center space-x-2 text-sm hover:bg-gray-100 p-1 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-500"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                <span className="truncate">
                  {opt} ({counts[norm(opt)] || 0})
                </span>
              </label>
            ))
          ) : (
            <div className="px-2 py-1 text-sm text-gray-500">No options found</div>
          )}
        </div>
      )}
    </div>
  );
}

function norm(s) {
  return s ? s.toString().trim().toLowerCase() : "";
}
