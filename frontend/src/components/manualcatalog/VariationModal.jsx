// components/manualcatalog/VariationModal.jsx
import React, { useState } from "react";

export default function VariationModal({ product, onClose, onSave, selectedMargin }) {
  const [variations, setVariations] = useState([]);
  const colorOptions =
    typeof product.color === "string" ? product.color.split(",").map(c => c.trim()) : product.color || [];
  const sizeOptions =
    typeof product.size === "string" ? product.size.split(",").map(s => s.trim()) : product.size || [];
  const [pickedColor, setPickedColor] = useState(colorOptions[0] || "");
  const [pickedSize, setPickedSize] = useState(sizeOptions[0] || "");
  const [pickedQuantity, setPickedQuantity] = useState(1);

  const handleAddLine = () => {
    setVariations([...variations, { color: pickedColor, size: pickedSize, quantity: parseInt(pickedQuantity) }]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40">
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="bg-white p-6 rounded shadow-lg relative">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-600">&times;</button>
          <h2 className="text-xl font-bold mb-4">Choose Variations for {product.name}</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <label className="block text-sm mb-1">Color</label>
              {colorOptions.length ? (
                <select value={pickedColor} onChange={(e) => setPickedColor(e.target.value)} className="border rounded p-1 w-full">
                  {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input type="text" value={pickedColor} onChange={(e) => setPickedColor(e.target.value)} className="border rounded p-1 w-full" placeholder="Type custom color" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Size</label>
              {sizeOptions.length ? (
                <select value={pickedSize} onChange={(e) => setPickedSize(e.target.value)} className="border rounded p-1 w-full">
                  {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input type="text" value={pickedSize} onChange={(e) => setPickedSize(e.target.value)} className="border rounded p-1 w-full" placeholder="Type custom size" />
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Qty</label>
              <input type="number" value={pickedQuantity} min="1" onChange={(e) => setPickedQuantity(e.target.value)} className="border rounded p-1 w-full" />
            </div>
          </div>
          <button onClick={handleAddLine} className="bg-blue-600 text-white px-3 py-1 rounded">+ Add</button>
          <div className="mt-4">
            {variations.map((line, idx) => (
              <div key={idx} className="flex justify-between border p-2 rounded my-1">
                <div>{line.color} | {line.size} | Qty: {line.quantity}</div>
                <button onClick={() => setVariations(variations.filter((_, i) => i !== idx))} className="bg-pink-600 text-white px-2 py-1 rounded">Remove</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="border rounded px-4 py-2">Cancel</button>
            <button onClick={() => { if(variations.length > 0) onSave(variations); }} className={`px-4 py-2 rounded text-white ${variations.length > 0 ? "bg-green-600" : "bg-gray-300"}`}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
