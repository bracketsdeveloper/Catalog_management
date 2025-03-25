import React from "react";

export default function FilterBarForViewer({
  searchTerm,
  setSearchTerm,
  visibleAttributes = [],
  advGetRootProps,
  advGetInputProps,
  categories = [],
  subCategories = [],
  brands = [],
  stockLocations = [],
  selectedCategories = [],
  toggleCategory,
  categoryOpen,
  setCategoryOpen,
  selectedSubCategories = [],
  toggleSubCategory,
  subCategoryOpen,
  setSubCategoryOpen,
  selectedBrands = [],
  toggleBrand,
  brandOpen,
  setBrandOpen,
  selectedStockLocations = [],
  toggleStockLocation,
  stockOpen,
  setStockOpen,
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6">
      <div className="flex gap-4 items-center w-full md:w-1/2">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-3 py-2 rounded bg-white border border-purple-300 focus:outline-none focus:ring focus:ring-purple-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex gap-4 mt-4 md:mt-0">
        {visibleAttributes.includes("category") && categories.length > 0 && (
          <div className="relative inline-block">
            <button
              onClick={() => setCategoryOpen(!categoryOpen)}
              className="bg-white px-3 py-2 rounded border border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Categories ({selectedCategories.length})
            </button>
            {categoryOpen && (
              <div className="origin-top-left absolute mt-2 w-40 rounded-md shadow-lg bg-white border border-purple-300 p-2 z-20">
                {categories.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-purple-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-pink-500"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    <span className="text-purple-700">{cat}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {visibleAttributes.includes("subCategory") && subCategories.length > 0 && (
          <div className="relative inline-block">
            <button
              onClick={() => setSubCategoryOpen(!subCategoryOpen)}
              className="bg-white px-3 py-2 rounded border border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              SubCats ({selectedSubCategories.length})
            </button>
            {subCategoryOpen && (
              <div className="origin-top-left absolute mt-2 w-40 rounded-md shadow-lg bg-white border border-purple-300 p-2 z-20">
                {subCategories.map((sub) => (
                  <label
                    key={sub}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-purple-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-pink-500"
                      checked={selectedSubCategories.includes(sub)}
                      onChange={() => toggleSubCategory(sub)}
                    />
                    <span className="text-purple-700">{sub}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {visibleAttributes.includes("brandName") && brands.length > 0 && (
          <div className="relative inline-block">
            <button
              onClick={() => setBrandOpen(!brandOpen)}
              className="bg-white px-3 py-2 rounded border border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Brands ({selectedBrands.length})
            </button>
            {brandOpen && (
              <div className="origin-top-left absolute mt-2 w-40 rounded-md shadow-lg bg-white border border-purple-300 p-2 z-20">
                {brands.map((br) => (
                  <label
                    key={br}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-purple-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-pink-500"
                      checked={selectedBrands.includes(br)}
                      onChange={() => toggleBrand(br)}
                    />
                    <span className="text-purple-700">{br}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {/* If you have additional filters (e.g., stock, variationHinge, etc.), add them similarly */}
      </div>
    </div>
  );
}
