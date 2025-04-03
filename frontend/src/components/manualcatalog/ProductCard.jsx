import React from "react";

const ProductCard = ({ product, onAddSelected, openVariationModal }) => {
  // Retrieve GST value or default to 0
  const gst = product.productGST || 0;

  // Get color and size options from product data
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
    // Use the single available color/size or, if empty, set to "N/A"
    const selectedColor =
      singleColor && colorOptions[0].trim() !== "" ? colorOptions[0] : "N/A";
    const selectedSize =
      singleSize && sizeOptions[0].trim() !== "" ? sizeOptions[0] : "N/A";
    // Construct new item with additional fields including productGST and productCost
    const newItem = {
      product: product.name,
      productCost: product.productCost,
      productGST: gst,
      color: selectedColor,
      size: selectedSize,
      quantity: 1,
      brandingType: "",
      brandingVendor: "",
      remarks: ""
    };
    onAddSelected(newItem);
  };

  const handleVariation = () => {
    if (openVariationModal) {
      openVariationModal(product);
    }
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
          onClick={handleVariation}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Choose Variation
        </button>
      )}
    </div>
  );
};

export default ProductCard;
