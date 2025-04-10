import React, { useState, useEffect, useRef } from "react";
import FilterItem from "./FilterItem"; // Import FilterItem component

export default function DropdownFilter({
  label,
  isOpen,
  setIsOpen,
  children,
  allProducts = [],  // Defaulting to an empty array
  allSubcategories = [],  // Defaulting to an empty array
}) {
  const dropdownRef = useRef();
  const [selectedCategory, setSelectedCategory] = useState(null); // Track selected category
  const [filteredProducts, setFilteredProducts] = useState(allProducts); // Filtered products based on category
  const [visibleSubcategories, setVisibleSubcategories] = useState([]); // Subcategories that have filtered products

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsOpen]);

  // Update filtered products based on selected category
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    // Filter products based on selected category
    const filtered = allProducts.filter((product) => product.category === category);
    setFilteredProducts(filtered);

    // Determine which subcategories have filtered products
    const subcategoriesWithProducts = allSubcategories.filter((subcategory) => {
      return filtered.some((product) => product.subcategory === subcategory);
    });

    setVisibleSubcategories(subcategoriesWithProducts);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-gray-200 rounded"
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-2 w-100 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
          {children}

          {/* Show category options */}
          <div className="p-4">
            {allProducts && allProducts.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold">Select Category</h4>
                {allProducts.map((product) => (
                  <FilterItem
                    key={product.category}
                    checked={selectedCategory === product.category}
                    onChange={() => handleCategoryChange(product.category)}
                    count={filteredProducts.filter((p) => p.category === product.category).length}
                  >
                    {product.category}
                  </FilterItem>
                ))}
              </div>
            )}
          </div>

          {/* Show subcategory options based on filtered products */}
          {visibleSubcategories.length > 0 && (
            <div className="p-4">
              <h4 className="text-lg font-semibold">Available Subcategories</h4>
              {visibleSubcategories.map((subcategory) => (
                <FilterItem
                  key={subcategory}
                  checked={filteredProducts.some((product) => product.subcategory === subcategory)}
                  onChange={() => {}}
                  count={filteredProducts.filter((product) => product.subcategory === subcategory).length}
                >
                  {subcategory}
                </FilterItem>
              ))}
            </div>
          )}

          {/* Show filtered products */}
          <div className="p-4">
            <h4 className="text-lg font-semibold">Available Products</h4>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div key={product.id} className="px-2 py-1">
                  {product.name}
                </div>
              ))
            ) : (
              <div>No products available in this category.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
