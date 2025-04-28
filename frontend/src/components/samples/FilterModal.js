"use client";
import React, { useState } from "react";

export default function FilterModal({ samples, initialFilters, onApply, onClose }) {
  // derive unique values
  const categories = Array.from(new Set(samples.map((s) => s.category).filter(Boolean)));
  const subCats    = Array.from(new Set(samples.map((s) => s.subCategory).filter(Boolean)));
  const brands     = Array.from(new Set(samples.map((s) => s.brandName).filter(Boolean)));
  const returnables= Array.from(new Set(samples.map((s) => s.returnable).filter(Boolean)));

  const [filters, setFilters] = useState({
    categories:  initialFilters.categories  || [],
    subCategories: initialFilters.subCategories || [],
    brands:      initialFilters.brands      || [],
    returnable:  initialFilters.returnable  || [],
  });

  const toggle = (key, val) => {
    setFilters((f) => {
      const arr = f[key];
      return {
        ...f,
        [key]: arr.includes(val)
          ? arr.filter((x) => x !== val)
          : [...arr, val],
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Filters</h3>

        <section className="mb-4">
          <h4 className="font-semibold">Category</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {categories.map((c) => (
              <label key={c} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(c)}
                  onChange={() => toggle("categories", c)}
                />
                <span className="text-sm">{c}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h4 className="font-semibold">Sub Category</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {subCats.map((c) => (
              <label key={c} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={filters.subCategories.includes(c)}
                  onChange={() => toggle("subCategories", c)}
                />
                <span className="text-sm">{c}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h4 className="font-semibold">Brand</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {brands.map((b) => (
              <label key={b} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(b)}
                  onChange={() => toggle("brands", b)}
                />
                <span className="text-sm">{b}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h4 className="font-semibold">Returnable</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            {returnables.map((r) => (
              <label key={r} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={filters.returnable.includes(r)}
                  onChange={() => toggle("returnable", r)}
                />
                <span className="text-sm">{r}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(filters);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
