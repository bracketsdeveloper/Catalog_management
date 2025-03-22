import React from "react";

export default function FilterBarForViewer({
  searchTerm,
  setSearchTerm,
  visibleAttributes = [],
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
          placeholder="Search..."
          className="w-full px-3 py-2 rounded bg-gray-700 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex gap-4 mt-4 md:mt-0">
        {visibleAttributes.includes("category") && categories.length > 0 && (
          <div className="relative inline-block">
            <button
              onClick={() => setCategoryOpen(!categoryOpen)}
              className="bg-gray-700 px-3 py-2 rounded"
            >
              Categories ({selectedCategories.length})
            </button>
            {categoryOpen && (
              <div className="origin-top-left absolute mt-2 w-32 md:w-48 rounded-md shadow-lg bg-gray-800 p-2 z-20">
                {categories.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    <span>{cat}</span>
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
              className="bg-gray-700 px-3 py-2 rounded"
            >
              SubCats ({selectedSubCategories.length})
            </button>
            {subCategoryOpen && (
              <div className="origin-top-left absolute mt-2 w-32 md:w-48 rounded-md shadow-lg bg-gray-800 p-2 z-20">
                {subCategories.map((sub) => (
                  <label
                    key={sub}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4"
                      checked={selectedSubCategories.includes(sub)}
                      onChange={() => toggleSubCategory(sub)}
                    />
                    <span>{sub}</span>
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
              className="bg-gray-700 px-3 py-2 rounded"
            >
              Brands ({selectedBrands.length})
            </button>
            {brandOpen && (
              <div className="origin-top-left absolute mt-2 w-32 md:w-48 rounded-md shadow-lg bg-gray-800 p-2 z-20">
                {brands.map((br) => (
                  <label
                    key={br}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4"
                      checked={selectedBrands.includes(br)}
                      onChange={() => toggleBrand(br)}
                    />
                    <span>{br}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {visibleAttributes.includes("stockCurrentlyWith") && stockLocations.length > 0 && (
          <div className="relative inline-block">
            <button
              onClick={() => setStockOpen(!stockOpen)}
              className="bg-gray-700 px-3 py-2 rounded"
            >
              Stock ({selectedStockLocations.length})
            </button>
            {stockOpen && (
              <div className="origin-top-left absolute mt-2 w-32 md:w-48 rounded-md shadow-lg bg-gray-800 p-2 z-20">
                {stockLocations.map((loc) => (
                  <label
                    key={loc}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4"
                      checked={selectedStockLocations.includes(loc)}
                      onChange={() => toggleStockLocation(loc)}
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
