// FilterItem.jsx
import React from "react";

export default function FilterItem({ checked, onChange, children, count }) {
  return (
    <label className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer">
      <div className="flex items-center">
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-purple-500"
          checked={checked}
          onChange={onChange}
        />
        <span className="truncate ml-2">{children}</span>
      </div>
      <span className="text-gray-500 text-sm ml-2">({count})</span>
    </label>
  );
}
