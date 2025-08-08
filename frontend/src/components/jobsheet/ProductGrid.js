import React, { useState, useEffect, useRef } from "react";
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

  // Temporary states for selections
  const [tempSelectedCategories, setTempSelectedCategories] = useState([...selectedCategories]);
  const [tempSelectedSubCategories, setTempSelectedSubCategories] = useState([...selectedSubCategories]);
  const [tempSelectedBrands, setTempSelectedBrands] = useState([...selectedBrands]);
  const [tempSelectedPriceRanges, setTempSelectedPriceRanges] = useState([...selectedPriceRanges]);
  const [tempSelectedVariationHinges, setTempSelectedVariationHinges] = useState([...selectedVariationHinges]);

  // Search term states for each dropdown
  const [categorySearch, setCategorySearch] = useState("");
  const [subCategorySearch, setSubCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [priceRangeSearch, setPriceRangeSearch] = useState("");
  const [variationHingeSearch, setVariationHingeSearch] = useState("");

  // Refs for each dropdown
  const categoryRef = useRef();
  const subCategoryRef = useRef();
  const brandRef = useRef();
  const priceRangeRef = useRef();
  const variationHingeRef = useRef();

  // Filtered options based on search terms
  const filteredCategories = fullCategories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const filteredSubCategories = fullSubCategories.filter((subCat) =>
    subCat.name.toLowerCase().includes(subCategorySearch.toLowerCase())
  );
  const filteredBrands = fullBrands.filter((brand) =>
    brand.name.toLowerCase().includes(brandSearch.toLowerCase())
  );
  const filteredPriceRanges = fullPriceRanges.filter((range) =>
    range.name.toLowerCase().includes(priceRangeSearch.toLowerCase())
  );
  const filteredVariationHinges = fullVariationHinges.filter((hinge) =>
    hinge.name.toLowerCase().includes(variationHingeSearch.toLowerCase())
  );

  // Toggle temporary selections
  const toggleTempFilter = (value, list, setList) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  };

  // Apply temporary selections to parent state
  const applyFilters = (setList, tempList, setTempList, setOpen) => {
    setList(tempList);
    setOpen(false);
    // Reset search term when closing dropdown
    if (setOpen === setCategoryOpen) setCategorySearch("");
    if (setOpen === setSubCategoryOpen) setSubCategorySearch("");
    if (setOpen === setBrandOpen) setBrandSearch("");
    if (setOpen === setPriceRangeOpen) setPriceRangeSearch("");
    if (setOpen === setVariationHingeOpen) setVariationHingeSearch("");
  };

  // Remove a specific filter and reapply
  const removeFilter = (filterType, value) => {
    switch (filterType) {
      case "category":
        setSelectedCategories((prev) => prev.filter((x) => x !== value));
        break;
      case "subCategory":
        setSelectedSubCategories((prev) => prev.filter((x) => x !== value));
        break;
      case "brand":
        setSelectedBrands((prev) => prev.filter((x) => x !== value));
        break;
      case "priceRange":
        setSelectedPriceRanges((prev) => prev.filter((x) => x !== value));
        break;
      case "variationHinge":
        setSelectedVariationHinges((prev) => prev.filter((x) => x !== value));
        break;
      default:
        break;
    }
  };

  // Close dropdown on outside click and reset temp selections and search terms
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false);
        setTempSelectedCategories([...selectedCategories]);
        setCategorySearch("");
      }
      if (subCategoryRef.current && !subCategoryRef.current.contains(event.target)) {
        setSubCategoryOpen(false);
        setTempSelectedSubCategories([...selectedSubCategories]);
        setSubCategorySearch("");
      }
      if (brandRef.current && !brandRef.current.contains(event.target)) {
        setBrandOpen(false);
        setTempSelectedBrands([...selectedBrands]);
        setBrandSearch("");
      }
      if (priceRangeRef.current && !priceRangeRef.current.contains(event.target)) {
        setPriceRangeOpen(false);
        setTempSelectedPriceRanges([...selectedPriceRanges]);
        setPriceRangeSearch("");
      }
      if (variationHingeRef.current && !variationHingeRef.current.contains(event.target)) {
        setVariationHingeOpen(false);
        setTempSelectedVariationHinges([...selectedVariationHinges]);
        setVariationHingeSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    selectedCategories,
    selectedSubCategories,
    selectedBrands,
    selectedPriceRanges,
    selectedVariationHinges,
  ]);

  // Combine all selected filters for display as tags
  const allSelectedFilters = [
    ...selectedCategories.map((item) => ({ type: "category", value: item, label: `Category: ${item}` })),
    ...selectedSubCategories.map((item) => ({ type: "subCategory", value: item, label: `SubCategory: ${item}` })),
    ...selectedBrands.map((item) => ({ type: "brand", value: item, label: `Brand: ${item}` })),
    ...selectedPriceRanges.map((item) => ({ type: "priceRange", value: item, label: `Price: ${item}` })),
    ...selectedVariationHinges.map((item) => ({ type: "variationHinge", value: item, label: `Hinge: ${item}` })),
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {/* Category Filter */}
      <div className="relative" ref={categoryRef}>
        <button
          onClick={() => setCategoryOpen(!categoryOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Categories ({selectedCategories.length})
        </button>
        {categoryOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 rounded z-20 flex flex-col"
            style={{ maxHeight: "300px" }}
          >
            <div className="p-2">
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => (
                  <label
                    key={cat.name}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-purple-500"
                      checked={tempSelectedCategories.includes(cat.name)}
                      onChange={() =>
                        toggleTempFilter(cat.name, tempSelectedCategories, setTempSelectedCategories)
                      }
                    />
                    <span className="truncate">
                      {cat.name} ({cat.count})
                    </span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-gray-500 p-2">No categories found</div>
              )}
            </div>
            <div className="p-2 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() =>
                  applyFilters(
                    setSelectedCategories,
                    tempSelectedCategories,
                    setTempSelectedCategories,
                    setCategoryOpen
                  )
                }
                className="w-full px-4 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90"
              >
                Filter
              </button>
            </div>
          </div>
        )}
      </div>
      {/* SubCategory Filter */}
      <div className="relative" ref={subCategoryRef}>
        <button
          onClick={() => setSubCategoryOpen(!subCategoryOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          SubCats ({selectedSubCategories.length})
        </button>
        {subCategoryOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 rounded z-20 flex flex-col"
            style={{ maxHeight: "300px" }}
          >
            <div className="p-2">
              <input
                type="text"
                placeholder="Search subcategories..."
                value={subCategorySearch}
                onChange={(e) => setSubCategorySearch(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredSubCategories.length > 0 ? (
                filteredSubCategories.map((subCat) => (
                  <label
                    key={subCat.name}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-purple-500"
                      checked={tempSelectedSubCategories.includes(subCat.name)}
                      onChange={() =>
                        toggleTempFilter(
                          subCat.name,
                          tempSelectedSubCategories,
                          setTempSelectedSubCategories
                        )
                      }
                    />
                    <span className="truncate">
                      {subCat.name} ({subCat.count})
                    </span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-gray-500 p-2">No subcategories found</div>
              )}
            </div>
            <div className="p-2 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() =>
                  applyFilters(
                    setSelectedSubCategories,
                    tempSelectedSubCategories,
                    setTempSelectedSubCategories,
                    setSubCategoryOpen
                  )
                }
                className="w-full px-4 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90"
              >
                Filter
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Brand Filter */}
      <div className="relative" ref={brandRef}>
        <button
          onClick={() => setBrandOpen(!brandOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Brands ({selectedBrands.length})
        </button>
        {brandOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 rounded z-20 flex flex-col"
            style={{ maxHeight: "300px" }}
          >
            <div className="p-2">
              <input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredBrands.length > 0 ? (
                filteredBrands.map((brand) => (
                  <label
                    key={brand.name}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-purple-500"
                      checked={tempSelectedBrands.includes(brand.name)}
                      onChange={() =>
                        toggleTempFilter(brand.name, tempSelectedBrands, setTempSelectedBrands)
                      }
                    />
                    <span className="truncate">
                      {brand.name} ({brand.count})
                    </span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-gray-500 p-2">No brands found</div>
              )}
            </div>
            <div className="p-2 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() =>
                  applyFilters(setSelectedBrands, tempSelectedBrands, setTempSelectedBrands, setBrandOpen)
                }
                className="w-full px-4 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90"
              >
                Filter
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Price Range Filter */}
      <div className="relative" ref={priceRangeRef}>
        <button
          onClick={() => setPriceRangeOpen(!priceRangeOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Price Range ({selectedPriceRanges.length})
        </button>
        {priceRangeOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 rounded z-20 flex flex-col"
            style={{ maxHeight: "300px" }}
          >
            <div className="p-2">
              <input
                type="text"
                placeholder="Search price ranges..."
                value={priceRangeSearch}
                onChange={(e) => setPriceRangeSearch(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredPriceRanges.length > 0 ? (
                filteredPriceRanges.map((range) => (
                  <label
                    key={range.name}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-purple-500"
                      checked={tempSelectedPriceRanges.includes(range.name)}
                      onChange={() =>
                        toggleTempFilter(
                          range.name,
                          tempSelectedPriceRanges,
                          setTempSelectedPriceRanges
                        )
                      }
                    />
                    <span className="truncate">
                      {range.name} ({range.count})
                    </span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-gray-500 p-2">No price ranges found</div>
              )}
            </div>
            <div className="p-2 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() =>
                  applyFilters(
                    setSelectedPriceRanges,
                    tempSelectedPriceRanges,
                    setTempSelectedPriceRanges,
                    setPriceRangeOpen
                  )
                }
                className="w-full px-4 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90"
              >
                Filter
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Variation Hinge Filter */}
      <div className="relative" ref={variationHingeRef}>
        <button
          onClick={() => setVariationHingeOpen(!variationHingeOpen)}
          className="px-3 py-2 bg-white border border-purple-300 rounded hover:bg-gray-100"
        >
          Variation Hinge ({selectedVariationHinges.length})
        </button>
        {variationHingeOpen && (
          <div
            className="absolute mt-2 w-48 bg-white border border-purple-200 rounded z-20 flex flex-col"
            style={{ maxHeight: "300px" }}
          >
            <div className="p-2">
              <input
                type="text"
                placeholder="Search variation hinges..."
                value={variationHingeSearch}
                onChange={(e) => setVariationHingeSearch(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredVariationHinges.length > 0 ? (
                filteredVariationHinges.map((hinge) => (
                  <label
                    key={hinge.name}
                    className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-purple-500"
                      checked={tempSelectedVariationHinges.includes(hinge.name)}
                      onChange={() =>
                        toggleTempFilter(
                          hinge.name,
                          tempSelectedVariationHinges,
                          setTempSelectedVariationHinges
                        )
                      }
                    />
                    <span className="truncate">
                      {hinge.name} ({hinge.count})
                    </span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-gray-500 p-2">No variation hinges found</div>
              )}
            </div>
            <div className="p-2 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() =>
                  applyFilters(
                    setSelectedVariationHinges,
                    tempSelectedVariationHinges,
                    setTempSelectedVariationHinges,
                    setVariationHingeOpen
                  )
                }
                className="w-full px-4 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90"
              >
                Filter
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Selected Filters as Tags */}
      {allSelectedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {allSelectedFilters.map((filter) => (
            <div
              key={`${filter.type}-${filter.value}`}
              className="flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded"
            >
              <span>{filter.label}</span>
              <button
                onClick={() => removeFilter(filter.type, filter.value)}
                className="ml-2 text-purple-600 hover:text-purple-800"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductGrid = ({
  products,
  loading,
  advancedSearchActive,
  advancedSearchResults,
  searchTerm,
  setSearchTerm,
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
  // Filter props
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
  // Filter out duplicate products based on a unique key
  const uniqueProducts = finalProducts.reduce((acc, product) => {
    const key = `${product.name}_${product.size}`;
    if (!acc[key]) {
      acc[key] = product;
    }
    return acc;
  }, {});

  const displayProducts = Object.values(uniqueProducts);

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
            className="px-3 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90 flex items-center"
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
            {displayProducts.map((prod) => (
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