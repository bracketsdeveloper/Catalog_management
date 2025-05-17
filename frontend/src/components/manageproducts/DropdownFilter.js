// DropdownFilter.jsx
import React, { useEffect, useRef, useState } from "react";
import FilterItem from "./FilterItem";

export default function DropdownFilter({
  label,
  isOpen,
  setIsOpen,
  options = [],
  selectedOptions = [],
  toggleOption,
  filterCounts = {}
}) {
  const dropdownRef = useRef();
  const [searchTerm, setSearchTerm] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsOpen]);

  // Filter options based on search term and count > 0
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()) && (filterCounts[option] || 0) > 0
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-200 rounded"
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
          {/* Search bar */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Filtered options */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <FilterItem
                key={option}
                checked={selectedOptions.includes(option)}
                onChange={() => toggleOption(option)}
                count={filterCounts[option] || 0}
              >
                {option}
              </FilterItem>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">No options found</div>
          )}
        </div>
      )}
    </div>
  );
}