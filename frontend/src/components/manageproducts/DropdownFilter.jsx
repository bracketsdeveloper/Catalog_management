// DropdownFilter.jsx
import React, { useEffect, useRef } from "react";
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
          {options.length > 0 ? (
            options.map((option) => (
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
            <div className="px-4 py-2 text-gray-500">No options available</div>
          )}
        </div>
      )}
    </div>
  );
}