import React from "react";

export default function ProductCardforViewer({
  product,
  visibleAttributes = [],
  carouselIndex,
  handlePrevImage,
  handleNextImage,
}) {
  const images = product.images || [];
  const hasImage = images.length > 0;
  // Use productCost as price (fallback to MRP if needed)
  const price = product.productCost || product.MRP || 0;

  return (
    <div className="bg-white rounded shadow-lg p-4 border border-purple-200">
      {hasImage ? (
        <div className="relative h-40 mb-4">
          <img
            src={images[carouselIndex] || images[0]}
            alt={product.name}
            className="h-40 w-full object-cover rounded"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => handlePrevImage(product._id)}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-purple-700/70 text-white px-2 py-1 text-sm rounded"
              >
                &lt;
              </button>
              <button
                onClick={() => handleNextImage(product._id)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-700/70 text-white px-2 py-1 text-sm rounded"
              >
                &gt;
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="h-40 w-full bg-gray-100 flex items-center justify-center mb-4 rounded">
          <span className="text-sm text-gray-500">No image</span>
        </div>
      )}

      {visibleAttributes.includes("name") && product.name && (
        <h2 className="text-xl font-bold mb-1 text-purple-900">{product.name}</h2>
      )}
      {visibleAttributes.includes("category") && product.category && (
        <p className="text-sm text-purple-700">
          Category: {product.category}
          {product.subCategory && visibleAttributes.includes("subCategory")
            ? ` / ${product.subCategory}`
            : ""}
        </p>
      )}
      {visibleAttributes.includes("brandName") && product.brandName && (
        <p className="text-sm text-purple-700">Brand: {product.brandName}</p>
      )}
      {visibleAttributes.includes("productCost") && (
        <p className="text-sm font-semibold text-purple-800">
          Price: ₹{price}
        </p>
      )}
      {visibleAttributes.includes("variationHinge") && product.variationHinge && (
        <p className="text-sm text-purple-700">Variation: {product.variationHinge}</p>
      )}
      {visibleAttributes.includes("material") && product.material && (
        <p className="text-sm text-gray-600">Material: {product.material}</p>
      )}
      {visibleAttributes.includes("productDetails") && product.productDetails && (
        <p className="text-xs text-gray-600 italic line-clamp-3">{product.productDetails}</p>
      )}
    </div>
  );
}
