// components/manualcatalog/CartPanel.jsx
import React from "react";

export default function CartPanel({ selectedProducts, onClose, onRemoveItem, onEditItem }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black bg-opacity-30">
      <div className="bg-white w-full sm:w-96 h-full p-4 flex flex-col relative">
        <h2 className="text-lg font-bold mb-4">Selected Items ({selectedProducts.length})</h2>
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-600">
          &times;
        </button>
        <div className="flex-grow overflow-auto">
          {selectedProducts.length === 0 && (
            <p className="text-gray-600">No products selected.</p>
          )}
          {selectedProducts.map((row, idx) => (
            <div key={idx} className="flex flex-col border p-2 rounded mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">{row.name}</div>
                  {row.color && <div>Color: {row.color}</div>}
                  {row.size && <div>Size: {row.size}</div>}
                  <div>Cost: ₹{row.productCost}</div>
                  <div>Qty: {row.quantity}</div>
                </div>
                <button onClick={() => onRemoveItem(idx)} className="bg-pink-600 text-white px-2 py-1 rounded">
                  Remove
                </button>
              </div>
              <button onClick={() => onEditItem(idx)} className="mt-2 bg-blue-500 text-white px-2 py-1 rounded">
                Edit
              </button>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="bg-green-500 text-white px-4 py-2 rounded self-end mt-2">
          Save & Close
        </button>
      </div>
    </div>
  );
}
