import React, { useEffect, useMemo, useState } from "react";
import { debounce } from "lodash";

export default function InvoiceSearchBar({ value, onChange }) {
  const [v, setV] = useState(value || "");

  const debounced = useMemo(() => debounce(onChange, 300), [onChange]);

  useEffect(() => {
    setV(value || "");
  }, [value]);

  const handle = (e) => {
    const val = e.target.value;
    setV(val);
    debounced(val.trim().replace(/\s+/g, " "));
  };

  const clear = () => {
    setV("");
    onChange("");
  };

  return (
    <div className="relative w-72">
      <input
        type="text"
        value={v}
        onChange={handle}
        placeholder="Search invoices..."
        className="border border-gray-300 rounded-full py-1.5 px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
      />
      {v && (
        <button
          onClick={clear}
          className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
    </div>
  );
}
