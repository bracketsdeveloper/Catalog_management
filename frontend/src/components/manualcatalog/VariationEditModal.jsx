import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function VariationEditModal({ item, onClose, onUpdate }) {
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);

  // Sync state if the item prop changes
  useEffect(() => {
    setColor(item.color || "");
    setSize(item.size || "");
    setQuantity(item.quantity || 1);
  }, [item]);

  const handleSave = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      alert("Please enter a valid quantity.");
      return;
    }
    onUpdate({ color, size, quantity: qty });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40">
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="bg-white p-6 rounded shadow-lg relative">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-600">
            &times;
          </button>
          <h2 className="text-xl font-bold mb-4">Edit Variation for {item.name}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Size</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                min="1"
                onChange={(e) => setQuantity(e.target.value)}
                className="border rounded p-2 w-full"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="border rounded px-4 py-2">Cancel</button>
            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

VariationEditModal.propTypes = {
  item: PropTypes.shape({
    name: PropTypes.string.isRequired,
    color: PropTypes.string,
    size: PropTypes.string,
    quantity: PropTypes.number,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};
