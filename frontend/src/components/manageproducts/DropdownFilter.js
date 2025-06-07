import React, { useEffect, useRef, useState } from "react";
import FilterItem from "./FilterItem";

export default function DropdownFilter({
  label,
  isOpen,
  setIsOpen,
  options = [],
  selectedOptions = [],
  toggleOption,
  filterCounts = {},
}) {
  const dropdownRef = useRef();
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelectedOptions, setTempSelectedOptions] = useState([...selectedOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setTempSelectedOptions([...selectedOptions]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsOpen, selectedOptions]);

  // Filter options based on search term and count > 0
  const filteredOptions = options.filter(
    (option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterCounts[option] || 0) > 0
  );

  // Handle temporary selection changes
  const handleTempToggle = (option) => {
    setTempSelectedOptions((prev) =>
      prev.includes(option)
        ? prev.filter((v) => v !== option)
        : [...prev, option]
    );
  };

  // Apply temporary selections to parent state
  const applyFilters = () => {
    toggleOption(tempSelectedOptions);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-200 rounded"
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-300 rounded shadow-lg max-h-60 flex flex-col">
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
          {/* Filtered options (scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <FilterItem
                  key={option}
                  checked={tempSelectedOptions.includes(option)}
                  onChange={() => handleTempToggle(option)}
                  count={filterCounts[option] || 0}
                >
                  {option}
                </FilterItem>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500">No options found</div>
            )}
          </div>
          {/* Filter Button (fixed at bottom) */}
          <div className="p-2 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              onClick={applyFilters}
              className="w-full px-4 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90"
            >
              Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}