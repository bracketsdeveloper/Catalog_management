import React from "react";

function SearchBar({ searchTerm, setSearchTerm }) {
  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search tasks or opportunities..."
      className="border border-purple-300 rounded p-2 text-sm w-full md:w-1/3"
    />
  );
}

export default SearchBar;