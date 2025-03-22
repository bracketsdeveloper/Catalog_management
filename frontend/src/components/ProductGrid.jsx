import React from "react";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  products,
  carouselIndexMap,
  handlePrevImage,
  handleNextImage,
  openSingleProductModal,
  handleDeleteProduct,
  loading,
  selectedProductIds = [],
  toggleSelectProduct,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-100 p-4 rounded shadow animate-pulse">
            <div className="bg-gray-200 h-40 w-full rounded mb-4"></div>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          carouselIndex={carouselIndexMap[product._id] || 0}
          handlePrevImage={handlePrevImage}
          handleNextImage={handleNextImage}
          openSingleProductModal={openSingleProductModal}
          handleDeleteProduct={handleDeleteProduct}
          isSelected={selectedProductIds.includes(product._id)}
          toggleSelectProduct={toggleSelectProduct}
        />
      ))}
    </div>
  );
}
