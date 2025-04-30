// client/src/components/expenses/FilterPanel.jsx
import React from "react";

export default function FilterPanel({ filters, setFilters }) {
  const onChange = (e) =>
    setFilters({ ...filters, [e.target.name]: e.target.value });

  return (
    <div className="border border-gray-300 bg-gray-50 p-4 mb-4 text-xs rounded">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block">Opportunity From</label>
          <input
            name="opptyFrom"
            value={filters.opptyFrom}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
        <div>
          <label className="block">Opportunity To</label>
          <input
            name="opptyTo"
            value={filters.opptyTo}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
        <div>
          <label className="block">JobSheet From</label>
          <input
            name="jsFrom"
            value={filters.jsFrom}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
        <div>
          <label className="block">JobSheet To</label>
          <input
            name="jsTo"
            value={filters.jsTo}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
        <div>
          <label className="block">Created From</label>
          <input
            type="date"
            name="createdFrom"
            value={filters.createdFrom}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
        <div>
          <label className="block">Created To</label>
          <input
            type="date"
            name="createdTo"
            value={filters.createdTo}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
        <div>
          <label className="block">Updated From</label>
          <input
            type="date"
            name="updatedFrom"
            value={filters.updatedFrom}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
        <div>
          <label className="block">Updated To</label>
          <input
            type="date"
            name="updatedTo"
            value={filters.updatedTo}
            onChange={onChange}
            className="border p-1 rounded w-full text-xs"
          />
        </div>
      </div>
    </div>
  );
}
