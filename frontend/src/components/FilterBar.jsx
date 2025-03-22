"use client";

import React from "react";
import { useDropzone } from "react-dropzone";

export default function FilterBar({
  searchTerm,
  setSearchTerm,
  advancedSearchActive,
  handleClearAdvancedSearch,
  advGetRootProps,
  advGetInputProps,
  categories,
  subCategories,
  brands,
  stockLocations,
  selectedCategories,
  toggleCategory,
  categoryOpen,
  setCategoryOpen,
  selectedSubCategories,
  toggleSubCategory,
  subCategoryOpen,
  setSubCategoryOpen,
  selectedBrands,
  toggleBrand,
  brandOpen,
  setBrandOpen,
  selectedStockLocations,
  toggleStockLocation,
  stockOpen,
  setStockOpen,
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6">
      <div className="flex gap-4 items-center w-full md:w-1/2">
        <input
          type="text"
          placeholder="Search by any field..."
          className="w-full px-4 py-2 rounded border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring focus:ring-purple-500"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (advancedSearchActive) handleClearAdvancedSearch();
          }}
        />
        <div
          {...advGetRootProps()}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100"
        >
          <input {...advGetInputProps()} />
          <span className="text-sm text-gray-800">Search by Image</span>
        </div>
        {advancedSearchActive && (
          <button
            onClick={handleClearAdvancedSearch}
            className="bg-pink-600 px-4 py-2 rounded hover:bg-pink-700 text-sm text-white"
          >
            Clear Image Search
          </button>
        )}
      </div>
      <div className="flex gap-4 mt-4 md:mt-0">
        <div className="relative inline-block">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Categories ({selectedCategories.length})
          </button>
          {categoryOpen && (
            <div className="absolute mt-2 w-40 md:w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {categories.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span className="text-gray-800">{cat}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="relative inline-block">
          <button
            onClick={() => setSubCategoryOpen(!subCategoryOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            SubCats ({selectedSubCategories.length})
          </button>
          {subCategoryOpen && (
            <div className="absolute mt-2 w-40 md:w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {subCategories.map((sub) => (
                <label
                  key={sub}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedSubCategories.includes(sub)}
                    onChange={() => toggleSubCategory(sub)}
                  />
                  <span className="text-gray-800">{sub}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="relative inline-block">
          <button
            onClick={() => setBrandOpen(!brandOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Brands ({selectedBrands.length})
          </button>
          {brandOpen && (
            <div className="absolute mt-2 w-40 md:w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {brands.map((br) => (
                <label
                  key={br}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedBrands.includes(br)}
                    onChange={() => toggleBrand(br)}
                  />
                  <span className="text-gray-800">{br}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="relative inline-block">
          <button
            onClick={() => setStockOpen(!stockOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Stock ({selectedStockLocations.length})
          </button>
          {stockOpen && (
            <div className="absolute mt-2 w-40 md:w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {stockLocations.map((loc) => (
                <label
                  key={loc}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedStockLocations.includes(loc)}
                    onChange={() => toggleStockLocation(loc)}
                  />
                  <span className="text-gray-800">{loc}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
