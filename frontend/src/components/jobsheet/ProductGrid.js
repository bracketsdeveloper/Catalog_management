// ../components/jobsheet/ProductGrid.js
import React, { useState } from "react";
import ProductCard from "./ProductCard";

const FilterPanel = ({
  fullCategories,
  selectedCategories,
  setSelectedCategories,
  fullSubCategories,
  selectedSubCategories,
  setSelectedSubCategories,
  fullBrands,
  selectedBrands,
  setSelectedBrands,
  fullPriceRanges,
  selectedPriceRanges,
  setSelectedPriceRanges,
  fullVariationHinges,
  selectedVariationHinges,
  setSelectedVariationHinges,
}) => {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [variationHingeOpen, setVariationHingeOpen] = useState(false);

  const toggleFilter = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((x) => x !== value));
    } else {
      setList([...list, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {/* Category Filter */}
      <div className="relative">
        <button
          onClick={() => setCategoryOpen(!categoryOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Categories ({selectedCategories.length})
        </button>
        {categoryOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
            style={{ maxHeight: "150px", overflowY: "auto" }}
          >
            {fullCategories.map((cat) => (
              <label
                key={cat}
                className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-500"
                  checked={selectedCategories.includes(cat)}
                  onChange={() =>
                    toggleFilter(cat, selectedCategories, setSelectedCategories)
                  }
                />
                <span className="truncate">{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {/* SubCategory Filter */}
      <div className="relative">
        <button
          onClick={() => setSubCategoryOpen(!subCategoryOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          SubCats ({selectedSubCategories.length})
        </button>
        {subCategoryOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
            style={{ maxHeight: "150px", overflowY: "auto" }}
          >
            {fullSubCategories.map((subCat) => (
              <label
                key={subCat}
                className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-500"
                  checked={selectedSubCategories.includes(subCat)}
                  onChange={() =>
                    toggleFilter(subCat, selectedSubCategories, setSelectedSubCategories)
                  }
                />
                <span className="truncate">{subCat}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {/* Brand Filter */}
      <div className="relative">
        <button
          onClick={() => setBrandOpen(!brandOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Brands ({selectedBrands.length})
        </button>
        {brandOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
            style={{ maxHeight: "150px", overflowY: "auto" }}
          >
            {fullBrands.map((brand) => (
              <label
                key={brand}
                className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-500"
                  checked={selectedBrands.includes(brand)}
                  onChange={() =>
                    toggleFilter(brand, selectedBrands, setSelectedBrands)
                  }
                />
                <span className="truncate">{brand}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {/* Price Range Filter */}
      <div className="relative">
        <button
          onClick={() => setPriceRangeOpen(!priceRangeOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Price Range ({selectedPriceRanges.length})
        </button>
        {priceRangeOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
            style={{ maxHeight: "150px", overflowY: "auto" }}
          >
            {fullPriceRanges.map((range) => (
              <label
                key={range}
                className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-500"
                  checked={selectedPriceRanges.includes(range)}
                  onChange={() =>
                    toggleFilter(range, selectedPriceRanges, setSelectedPriceRanges)
                  }
                />
                <span className="truncate">{range}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {/* Variation Hinge Filter */}
      <div className="relative">
        <button
          onClick={() => setVariationHingeOpen(!variationHingeOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Variation Hinge ({selectedVariationHinges.length})
        </button>
        {variationHingeOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 p-2 rounded z-20"
            style={{ maxHeight: "150px", overflowY: "auto" }}
          >
            {fullVariationHinges.map((hinge) => (
              <label
                key={hinge}
                className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-500"
                  checked={selectedVariationHinges.includes(hinge)}
                  onChange={() =>
                    toggleFilter(hinge, selectedVariationHinges, setSelectedVariationHinges)
                  }
                />
                <span className="truncate">{hinge}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductGrid = ({
  products,
  loading,
  advancedSearchActive,
  advancedSearchResults,
  searchTerm,
  setSearchTerm, // Added setSearchTerm here
  handleImageSearchClick,
  imageInputRef,
  handleImageSearch,
  advancedSearchLoading,
  handleClearAdvancedSearch,
  finalProducts,
  handlePrevPage,
  handleNextPage,
  currentPage,
  totalPages,
  onAddSelected,
  onOpenVariationModal,
  // Filter props:
  fullCategories,
  selectedCategories,
  setSelectedCategories,
  fullSubCategories,
  selectedSubCategories,
  setSelectedSubCategories,
  fullBrands,
  selectedBrands,
  setSelectedBrands,
  fullPriceRanges,
  selectedPriceRanges,
  setSelectedPriceRanges,
  fullVariationHinges,
  selectedVariationHinges,
  setSelectedVariationHinges,
}) => {
  return (
    <div>
      {/* Search & Advanced Image Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search products..."
            className="flex-grow px-3 py-2 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={handleImageSearchClick}
            className="px-3 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90 flex items-center"
          >
            {advancedSearchLoading && (
              <div className="w-5 h-5 border-4 border-white border-t-transparent border-solid rounded-full animate-spin mr-1"></div>
            )}
            <span>Search by Image</span>
          </button>
          <input
            type="file"
            ref={imageInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleImageSearch}
          />
          {advancedSearchActive && (
            <button
              onClick={handleClearAdvancedSearch}
              className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear Image
            </button>
          )}
        </div>
      </div>
      {/* Filter Panel */}
      <FilterPanel
        fullCategories={fullCategories}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        fullSubCategories={fullSubCategories}
        selectedSubCategories={selectedSubCategories}
        setSelectedSubCategories={setSelectedSubCategories}
        fullBrands={fullBrands}
        selectedBrands={selectedBrands}
        setSelectedBrands={setSelectedBrands}
        fullPriceRanges={fullPriceRanges}
        selectedPriceRanges={selectedPriceRanges}
        setSelectedPriceRanges={setSelectedPriceRanges}
        fullVariationHinges={fullVariationHinges}
        selectedVariationHinges={selectedVariationHinges}
        setSelectedVariationHinges={setSelectedVariationHinges}
      />
      {/* Product Cards */}
      {loading ? (
        <div>Loading products...</div>
      ) : (
        <>
          {advancedSearchActive && advancedSearchResults.length === 0 && (
            <div className="text-gray-600 mb-2 text-sm">
              No products found from image search.
            </div>
          )}
          {!advancedSearchActive && searchTerm && (
            <div className="text-gray-600 mb-2 text-sm">
              Searching for "{searchTerm}"...
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {finalProducts.map((prod) => (
              <ProductCard
                key={prod._id}
                product={prod}
                onAddSelected={onAddSelected}
                openVariationModal={onOpenVariationModal}
              />
            ))}
          </div>
          <div className="flex justify-center items-center mt-6 space-x-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductGrid;
