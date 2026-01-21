// ../components/jobsheet/VariationModal.js
import React, { useState } from "react";

const VariationModal = ({ product, onClose, onSave }) => {
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

  const [selectedColor, setSelectedColor] = useState(colorOptions[0] || "");
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || "");
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    const newItem = {
      product: product.name,
      color: selectedColor,
      size: selectedSize,
      quantity: parseInt(quantity) || 1,
      brandingType: "",
      brandingVendor: "",
      remarks: ""
    };
    onSave(newItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        >
          <span className="text-xl font-bold">&times;</span>
        </button>
        <h2 className="text-xl font-bold mb-4 text-purple-700">
          Choose Variation for {product.name}
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-purple-700 mb-1">
            Color
          </label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="border border-purple-300 rounded p-2 w-full"
          >
            {colorOptions.map((c, index) => (
              <option key={index} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-purple-700 mb-1">
            Size
          </label>
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="border border-purple-300 rounded p-2 w-full"
          >
            {sizeOptions.map((s, index) => (
              <option key={index} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-purple-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border border-purple-300 rounded p-2 w-full"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariationModal;
