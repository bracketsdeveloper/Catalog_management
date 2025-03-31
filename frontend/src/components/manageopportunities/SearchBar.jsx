import React from "react";

export default function SearchBar({ searchTerm, setSearchTerm }) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border border-gray-300 rounded-full py-1.5 px-4 pr-8 text-sm focus:outline-none"
      />
      <span className="absolute right-2 top-1.5 text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeWidth={2} d="M8 16l4.586-4.586M8 8h.01M12 16l4.586-4.586M12 8h.01" />
        </svg>
      </span>
    </div>
  );
}
