// src/components/ProductCard.jsx
import React, { useState, useEffect } from "react";

export default function ProductCard({
  product,
  onAddSelected,
  openVariationSelector,
  onViewDetails,
  isLoading = false, // New prop to control loading state
}) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    if (product?.images?.[0]) {
      const img = new Image();
      img.src = product.images[0];
      img.onload = () => setIsImageLoaded(true);
    }
  }, [product?.images]);

  const colorOptions = Array.isArray(product?.color)
    ? product.color
    : typeof product?.color === "string"
    ? product.color.split(",").map(c => c.trim()).filter(Boolean)
    : [];
  const sizeOptions = Array.isArray(product?.size)
    ? product.size
    : typeof product?.size === "string"
    ? product.size.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const hasVariations = colorOptions.length > 1 || sizeOptions.length > 1;

  const handleSingleSelect = () => {
    const cost = product?.productCost || 0;
    onAddSelected({
      productId: product?._id,
      productName: product?.productName || product?.name || "Unknown Product",
      productCost: cost,
      productprice: cost,
      productGST: product?.productGST || 0,
      color: colorOptions[0]?.trim() || "N/A",
      size: sizeOptions[0]?.trim() || "N/A",
      quantity: 1,
      material: product?.material || "",
      weight: product?.weight || "",
      ProductDescription: product?.productDetails || "",
      ProductBrand: product?.brandName || "",
      brandingTypes: [],
      baseCost: cost,
      suggestedBreakdown: {
        baseCost: 0,
        marginPct: 0,
        marginAmount: 0,
        logisticsCost: 0,
        brandingCost: 0,
        finalPrice: 0
      }
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 relative flex flex-col animate-pulse">
        {/* Skeleton for stock indicator */}
        <div className="absolute top-2 right-2 bg-gray-200 h-6 w-16 rounded-full"></div>

        {/* Skeleton for image */}
        <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>

        {/* Skeleton for product name */}
        <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>

        {/* Skeleton for price */}
        <div className="h-5 bg-gray-200 rounded mb-2 w-1/2"></div>

        {/* Skeleton for category */}
        <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>

        {/* Skeleton for buttons */}
        <div className="mt-auto flex flex-col gap-2">
          <div className="h-10 bg-gray-200 rounded-md"></div>
          <div className="h-10 bg-gray-200 rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 relative flex flex-col hover:shadow-md transition-shadow">
      {product?.stockInHand != null && (
        <span
          className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full ${
            product.stockInHand > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {product.stockInHand > 0 ? "In Stock" : "Out of Stock"}
        </span>
      )}

      <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden mb-4">
        {product?.images?.length > 0 && isImageLoaded ? (
          <img
            src={product.images[0]}
            alt={product.productName || product.name}
            className="object-contain h-full w-full"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Image Available</span>
        )}
      </div>

      <h2 className="font-medium text-lg mb-1 text-gray-900">
        {product?.productName || product?.name || "Unknown Product"}
      </h2>
      <h3 className="font-bold text-md text-gray-800 mb-1">
        ₹{(product?.productCost || 0).toFixed(2)}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {product?.category || "No Category"}
        {product?.subCategory ? ` / ${product.subCategory}` : ""}
      </p>

      <div className="mt-auto flex flex-col gap-2">
        {hasVariations ? (
          <button
            onClick={() => openVariationSelector(product)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Choose Variation
          </button>
        ) : (
          <button
            onClick={handleSingleSelect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Add to Selection
          </button>
        )}

        <button
          onClick={() => onViewDetails(product?._id)}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
