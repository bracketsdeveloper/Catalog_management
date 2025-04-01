// components/manualcatalog/ProductGrid.jsx
import React from "react";
import ProductCard from "./ProductCard"; // You can further break out ProductCard if desired

export default function ProductGrid({
  products,
  loading,
  onVariationSelect,
  setSelectedProducts,
  selectedProducts,
}) {
  if (loading) return <div>Loading products...</div>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((prod) => (
          <ProductCard
            key={prod._id}
            product={prod}
            onAddSelected={(item) =>
              setSelectedProducts([...selectedProducts, item])
            }
            openVariationSelector={onVariationSelect}
          />
        ))}
      </div>
      {/* Pagination controls can go here if needed */}
    </div>
  );
}
