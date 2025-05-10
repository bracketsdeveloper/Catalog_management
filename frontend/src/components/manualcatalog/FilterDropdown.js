// src/components/FilterDropdown.jsx
import React from "react";

export default function FilterDropdown({ label, open, setOpen, options, selected, toggle, counts }) {
  return (
    <div className="relative">
      <button onClick={()=>setOpen(!open)}
        className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100">
        {label} ({selected.length})
      </button>
      {open && (
        <div className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20 max-h-40 overflow-y-auto">
          {options.map(opt=>(
            <label key={opt} className="flex items-center space-x-2 text-sm hover:bg-gray-100 p-1 rounded cursor-pointer">
              <input type="checkbox" className="form-checkbox h-4 w-4 text-purple-500"
                checked={selected.includes(opt)} onChange={()=>toggle(opt)} />
              <span className="truncate">
                {opt} ({counts[norm(opt)]||0})
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function norm(s){ return s? s.toString().trim().toLowerCase() : ""; }
