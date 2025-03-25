import React from "react";

export default function FilterBar({
  searchTerm,
  setSearchTerm,
  advancedSearchActive,
  handleClearAdvancedSearch,
  advGetRootProps,
  advGetInputProps,
  // Full filter option lists with defaults
  categories = [],
  subCategories = [],
  brands = [],
  selectedPriceRanges = [],
  selectedVariationHinges = [],
  // State for selected filters and dropdown toggles with defaults
  selectedCategories = [],
  setSelectedCategories = () => {},
  categoryOpen = false,
  setCategoryOpen = () => {},
  selectedSubCategories = [],
  setSelectedSubCategories = () => {},
  subCategoryOpen = false,
  setSubCategoryOpen = () => {},
  selectedBrands = [],
  setSelectedBrands = () => {},
  brandOpen = false,
  setBrandOpen = () => {},
  setSelectedPriceRanges = () => {},
  priceRangeOpen = false,
  setPriceRangeOpen = () => {},
  setSelectedVariationHinges = () => {},
  variationHingeOpen = false,
  setVariationHingeOpen = () => {},
}) {
  // Helper toggle function for a filter value
  const toggleFilter = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6">
      {/* Optional: additional search controls can be placed here */}
      <div className="flex gap-4 items-center w-full md:w-1/2"></div>
      <div className="flex gap-4 mt-4 md:mt-0">
        {/* Categories Dropdown */}
        <div className="relative inline-block">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Categories ({selectedCategories.length})
          </button>
          {categoryOpen && (
            <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {categories.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                  />
                  <span className="text-gray-800">{cat}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* SubCategories Dropdown */}
        <div className="relative inline-block">
          <button
            onClick={() => setSubCategoryOpen(!subCategoryOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            SubCats ({selectedSubCategories.length})
          </button>
          {subCategoryOpen && (
            <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {subCategories.map((sub) => (
                <label
                  key={sub}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedSubCategories.includes(sub)}
                    onChange={() => toggleFilter(sub, selectedSubCategories, setSelectedSubCategories)}
                  />
                  <span className="text-gray-800">{sub}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* Brands Dropdown */}
        <div className="relative inline-block">
          <button
            onClick={() => setBrandOpen(!brandOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Brands ({selectedBrands.length})
          </button>
          {brandOpen && (
            <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {brands.map((br) => (
                <label
                  key={br}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedBrands.includes(br)}
                    onChange={() => toggleFilter(br, selectedBrands, setSelectedBrands)}
                  />
                  <span className="text-gray-800">{br}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* Price Ranges Dropdown */}
        <div className="relative inline-block">
          <button
            onClick={() => setPriceRangeOpen(!priceRangeOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Price Range ({selectedPriceRanges.length})
          </button>
          {priceRangeOpen && (
            <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {selectedPriceRanges.map((pr) => (
                <label
                  key={pr}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedPriceRanges.includes(pr)}
                    onChange={() => toggleFilter(pr, selectedPriceRanges, setSelectedPriceRanges)}
                  />
                  <span className="text-gray-800">{pr}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {/* Variation Hinges Dropdown */}
        <div className="relative inline-block">
          <button
            onClick={() => setVariationHingeOpen(!variationHingeOpen)}
            className="bg-white px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            Variation Hinge ({selectedVariationHinges.length})
          </button>
          {variationHingeOpen && (
            <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-white border border-gray-300 p-2 z-20">
              {selectedVariationHinges.map((vh) => (
                <label
                  key={vh}
                  className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-purple-600"
                    checked={selectedVariationHinges.includes(vh)}
                    onChange={() => toggleFilter(vh, selectedVariationHinges, setSelectedVariationHinges)}
                  />
                  <span className="text-gray-800">{vh}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
