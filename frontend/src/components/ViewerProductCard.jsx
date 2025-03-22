import React from "react";

export default function ViewerProductCard({ product, visibleAttributes }) {
  const images = product.images || [];
  const hasImage = images.length > 0;
  return (
    <div className="bg-gray-800 rounded shadow p-4">
      {hasImage ? (
        <img
          src={images[0]}
          alt={product.name}
          className="h-40 w-full object-cover mb-4 rounded"
        />
      ) : (
        <div className="h-40 w-full bg-gray-700 flex items-center justify-center mb-4 rounded">
          <span className="text-sm text-gray-400">No image</span>
        </div>
      )}
      <h2 className="text-lg font-bold mb-1">{product.name}</h2>
      {visibleAttributes.includes("category") && product.category && (
        <p className="text-sm text-gray-400">Category: {product.category}</p>
      )}
      {visibleAttributes.includes("subCategory") && product.subCategory && (
        <p className="text-sm text-gray-400">Sub: {product.subCategory}</p>
      )}
      {visibleAttributes.includes("price") && (
        <p className="text-sm text-gray-300">Price: ₹{product.price}</p>
      )}
      {visibleAttributes.includes("productDetails") && product.productDetails && (
        <p className="text-xs text-gray-400 italic">{product.productDetails}</p>
      )}
      {/* You may add more conditional rendering for other attributes as needed */}
    </div>
  );
}
