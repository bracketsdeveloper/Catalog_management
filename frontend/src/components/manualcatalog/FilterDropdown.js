// src/components/manualcatalog/FilterDropdown.jsx
import React, { useState, useEffect } from "react";

export default function FilterDropdown({
  label,
  open,
  setOpen,
  options,
  selected,
  toggle,
  counts,
  dependsOn = {},
  allSelections = {},
  parentChildMap = {}
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState([]);

  useEffect(() => {
    const filtered = options.filter((opt) => {
      // 1. Match search term
      const matchesSearch = opt.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Has at least 1 product
      const hasProducts = (counts[norm(opt)] || 0) > 0;
      
      // 3. Respects parent filter dependencies
      let respectsDependencies = true;
      
      if (dependsOn[label]) {
        respectsDependencies = dependsOn[label].every((parentFilter) => {
          const parentOptions = allSelections[parentFilter] || [];
          
          // If no parents selected, show all (but still respect product counts)
          if (parentOptions.length === 0) return true;
          
          // Check if this option is valid for any of the selected parents
          return parentOptions.some((parent) => {
            return parentChildMap[parentFilter]?.[opt]?.includes(parent);
          });
        });
      }

      return matchesSearch && hasProducts && respectsDependencies;
    });

    setFilteredOptions(filtered);
  }, [searchTerm, counts, options, dependsOn, allSelections, label, parentChildMap]);

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
          <div className="p-1 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
