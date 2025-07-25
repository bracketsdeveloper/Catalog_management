import React, { useEffect, useState, useMemo } from "react";
import { debounce } from "lodash";

export default function SearchBar({ searchTerm, setSearchTerm }) {
  const [inputValue, setInputValue] = useState(searchTerm);

  // Debounce the setSearchTerm function to limit API calls
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        // Sanitize input: trim and remove excessive whitespace
        const sanitizedValue = value.trim().replace(/\s+/g, " ");
        setSearchTerm(sanitizedValue);
      }, 300),
    [setSearchTerm]
  );

  // Sync input value with searchTerm and trigger debounced search
  useEffect(() => {
    setInputValue(searchTerm);
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel(); // Cleanup debounce on unmount
  }, [searchTerm, debouncedSearch]);

  // Handle input change
  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  // Clear search input
  const handleClear = () => {
    setInputValue("");
    setSearchTerm("");
  };

  return (
    <div className="relative w-64">
      <input
        type="text"
        placeholder="Search opportunities..."
        value={inputValue}
        onChange={handleChange}
        className="border border-gray-300 rounded-full py-1.5 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        aria-label="Search opportunities"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeWidth={2}
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z"
          />
        </svg>
      </span>
    </div>
  );
}