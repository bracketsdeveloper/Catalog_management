import React from "react";

export default function FilterItem({ checked, onChange, children }) {
  return (
    <label className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
      <input
        type="checkbox"
        className="form-checkbox h-4 w-4 text-purple-500"
        checked={checked}
        onChange={onChange}
      />
      <span className="truncate">{children}</span>
    </label>
  );
}
