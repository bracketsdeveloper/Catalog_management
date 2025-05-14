// src/components/ProductCard.jsx
import React from "react";

export default function ProductCard({
  product,
  onAddSelected,
  openVariationSelector,
  onViewDetails,  // new prop
}) {
  const colorOptions = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string"
    ? product.color.split(",").map(c => c.trim()).filter(Boolean)
    : [];
  const sizeOptions = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string"
    ? product.size.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const hasVariations = colorOptions.length > 1 || sizeOptions.length > 1;

  const handleSingleSelect = () => {
    const cost = product.productCost || 0;
    onAddSelected({
      productId: product._id,
      productName: product.productName || product.name || "Unknown Product",
      productCost: cost,
      productprice: cost,
      productGST: product.productGST || 0,
      color: colorOptions[0]?.trim() || "N/A",
      size: sizeOptions[0]?.trim() || "N/A",
      quantity: 1,
      material: product.material || "",
      weight: product.weight || "",
      ProductDescription: product.productDetails || "",
      ProductBrand: product.brandName || "",
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

  return (
    <div className="bg-white border border-purple-200 rounded shadow-md p-4 relative flex flex-col">
      {product.stockInHand != null && (
        <span
          className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded ${
            product.stockInHand > 0 ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {product.stockInHand > 0 ? "Available" : "Out of stock"}
        </span>
      )}

      <div className="h-40 flex items-center justify-center bg-gray-50 overflow-hidden mb-4">
        {product.images?.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.productName || product.name}
            className="object-contain h-full"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Image</span>
        )}
      </div>

      <h2 className="font-semibold text-lg mb-1 truncate text-purple-700">
        {product.productName || product.name || "Unknown"}
      </h2>
      <h3 className="font-semibold text-md text-red-600 mb-1 truncate">
        ₹{(product.productCost || 0).toFixed(2)}
      </h3>
      <p className="text-xs text-gray-600 mb-4">
        {product.category || "No Category"}
        {product.subCategory ? ` / ${product.subCategory}` : ""}
      </p>

      <div className="mt-auto flex flex-col gap-2">
        {hasVariations ? (
          <button
            onClick={() => openVariationSelector(product)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Choose Variation
          </button>
        ) : (
          <button
            onClick={handleSingleSelect}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Select
          </button>
        )}

        <button
          onClick={() => onViewDetails(product._id)}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
