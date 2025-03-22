import React from "react";

export default function ProductFiltersforViewer({
  categories,
  subCategories,
  brands,
  stockLocations,
  selectedCategories,
  selectedSubCategories,
  selectedBrands,
  selectedStockLocations,
  toggleCategory,
  toggleSubCategory,
  toggleBrand,
  toggleStockLocation,
}) {
  return (
    <div className="flex items-center gap-4 mb-6 z-40">
      {/* Category Filter */}
      <FilterDropdown
        title="Categories"
        items={categories}
        selectedItems={selectedCategories}
        toggleItem={toggleCategory}
      />

      {/* Subcategory Filter */}
      <FilterDropdown
        title="Subcategories"
        items={subCategories}
        selectedItems={selectedSubCategories}
        toggleItem={toggleSubCategory}
      />

      {/* Brand Filter */}
      <FilterDropdown
        title="Brands"
        items={brands}
        selectedItems={selectedBrands}
        toggleItem={toggleBrand}
      />

      {/* Stock Location Filter */}
      <FilterDropdown
        title="Stock"
        items={stockLocations}
        selectedItems={selectedStockLocations}
        toggleItem={toggleStockLocation}
      />
    </div>
  );
}

function FilterDropdown({ title, items, selectedItems, toggleItem }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="bg-gray-700 px-3 py-2 rounded">
        {title} ({selectedItems.length})
      </button>
      {open && (
        <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-20 p-2">
          {items.map((item) => (
            <label key={item} className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-700 p-1 rounded">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4"
                checked={selectedItems.includes(item)}
                onChange={() => toggleItem(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
