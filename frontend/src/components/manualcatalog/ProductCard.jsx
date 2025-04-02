import React from "react";

export default function ProductCard({
  product,
  selectedMargin,
  onAddSelected,
  openVariationSelector
}) {
  // productGST might come from Product model. If none, default to 0
  const gst = product.productGST || 0;

  // Convert product.color/size to arrays
  const colorOptions = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string"
    ? product.color.split(",").map((c) => c.trim())
    : [];
  const sizeOptions = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string"
    ? product.size.split(",").map((s) => s.trim())
    : [];

  const singleColor = colorOptions.length === 1;
  const singleSize = sizeOptions.length === 1;

  const handleSingleSelect = () => {
    let cost = product.productCost || 0;
    if (selectedMargin > 0) {
      cost *= 1 + selectedMargin / 100;
      cost = parseFloat(cost.toFixed(2));
    }
    const newItem = {
      productId: product._id,
      name: product.name,
      productCost: cost,
      productGST: gst,
      color: singleColor ? colorOptions[0] : "",
      size: singleSize ? sizeOptions[0] : "",
      quantity: 1,
      material: product.material || "",
      weight: product.weight || ""
    };
    onAddSelected(newItem);
  };

  return (
    <div className="bg-white border border-purple-200 rounded shadow-md p-4 relative">
      {product.stockInHand !== undefined && (
        <span
          className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded ${
            product.stockInHand > 0 ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {product.stockInHand > 0 ? "Available" : "Out of stock"}
        </span>
      )}
      <div className="h-40 flex items-center justify-center bg-gray-50 overflow-hidden mb-4">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="object-contain h-full"
          />
        ) : (
          <span className="text-gray-400 text-sm">No Image</span>
        )}
      </div>
      <h2 className="font-semibold text-lg mb-1 truncate text-purple-700">
        {product.name}
      </h2>
      <h3 className="font-semibold text-md text-red-600 mb-1 truncate">
        ₹{product.productCost}
      </h3>
      {gst > 0 && <p className="text-xs text-gray-600 mb-1">GST: {gst}%</p>}
      <p className="text-xs text-gray-600 mb-2">
        {product.category}
        {product.subCategory ? ` / ${product.subCategory}` : ""}
      </p>
      {singleColor && singleSize ? (
        <button
          onClick={handleSingleSelect}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Select
        </button>
      ) : (
        <button
          onClick={() => openVariationSelector(product)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Choose Variation
        </button>
      )}
    </div>
  );
}
