import React, { useState, useEffect, useRef, useCallback } from "react";

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
  parentChildMap = {},
}) {
  const dropdownRef = useRef();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [tempSelected, setTempSelected] = useState([...selected]);

  // Close dropdown when clicking outside and reset temp selections
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setTempSelected([...selected]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setOpen, selected]);

  // Memoize toggle to prevent unnecessary re-renders
  const stableToggle = useCallback(
    (newSelected) => {
      toggle(newSelected);
    },
    [toggle]
  );

  // Filter options based on search term, counts, and dependencies
  useEffect(() => {
    const filtered = options.filter((opt) => {
      const matchesSearch = opt.toLowerCase().includes(searchTerm.toLowerCase());
      const hasProducts = (counts[norm(opt)] || 0) > 0;
      let respectsDependencies = true;

      if (dependsOn[label.toLowerCase()]) {
        respectsDependencies = dependsOn[label.toLowerCase()].every((parentFilter) => {
          const parentOptions = allSelections[parentFilter] || [];
          if (parentOptions.length === 0) return true;
          return parentOptions.some((parent) =>
            (parentChildMap[parentFilter]?.[norm(opt)] || []).includes(norm(parent))
          );
        });
      }

      return matchesSearch && hasProducts && respectsDependencies;
    });

    // Only update state if filtered options have changed
    setFilteredOptions((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(filtered)) return prev;
      return filtered;
    });
  }, [searchTerm, counts, options, dependsOn, allSelections, label, parentChildMap]);

  // Handle temporary selection changes
  const handleTempToggle = (opt) => {
    setTempSelected((prev) =>
      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
    );
  };

  // Apply temporary selections to parent state
  const applyFilters = () => {
    stableToggle(tempSelected);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
      >
        {label} ({selected.length})
      </button>
      {open && (
        <div className="absolute mt-2 w-48 bg-white border border-purple-200 rounded z-20 max-h-60 flex flex-col">
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
          {/* Filtered options (scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center space-x-2 text-sm hover:bg-gray-100 p-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-500"
                    checked={tempSelected.includes(opt)}
                    onChange={() => handleTempToggle(opt)}
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

function norm(s) {
  return s ? s.toString().trim().toLowerCase() : "";
}