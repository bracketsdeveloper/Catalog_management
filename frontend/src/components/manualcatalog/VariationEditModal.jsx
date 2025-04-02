import React, { useState } from "react";

export default function VariationEditModal({ item, margin, onClose, onUpdate }) {
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);

  const handleSave = () => {
    const updatedItem = {
      color,
      size,
      quantity: parseInt(quantity) || 1
      // We are not updating cost/GST here, but you could if needed
    };
    onUpdate(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">
            Edit Variation for {item.name}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Size
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
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
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
