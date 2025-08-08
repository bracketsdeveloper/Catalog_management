// src/components/manualcatalog/VariationModal.jsx
import React, { useState, useCallback } from "react";
import SuggestedPriceCalculator from "../SuggestedPriceCalculator";

export default function VariationModal({
  product,
  onClose,
  onSave,
  // new props to feed into the price calculator:
  companySegment,
  companyPincode,
  brandingTypesList,
  segmentsList,
}) {
  console.debug("◉ VariationModal mounted for product:", product);

  const colorOptions = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string"
    ? product.color.split(",").map((c) => c.trim()).filter(Boolean)
    : [];
  const sizeOptions = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string"
    ? product.size.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const [pickedColor, setPickedColor] = useState(colorOptions[0] || "");
  const [pickedSize, setPickedSize] = useState(sizeOptions[0] || "");
  const [pickedQuantity, setPickedQuantity] = useState(1);

  // each variation now carries its own breakdown slot
  const [variations, setVariations] = useState([]);

  const handleAddLine = useCallback(() => {
    console.debug("➕ Adding variation line:", { pickedColor, pickedSize, pickedQuantity });
    setVariations((prev) => [
      ...prev,
      {
        color: pickedColor || "",
        size: pickedSize || "",
        quantity: parseInt(pickedQuantity, 10) || 1,
        suggestedBreakdown: null,
      },
    ]);
  }, [pickedColor, pickedSize, pickedQuantity]);

  const handleRemoveLine = useCallback((idx) => {
    console.debug("➖ Removing variation line:", idx);
    setVariations((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // build a stable callback for each variation to capture its own breakdown
  const makeBreakdownHandler = useCallback(
    (idx) => (breakdown) => {
      console.debug(`🔍 Breakdown for variation #${idx}:`, breakdown);
      setVariations((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], suggestedBreakdown: breakdown };
        return copy;
      });
    },
    []
  );

  const handleSave = () => {
    console.debug("💾 Saving all variations:", variations);
    if (variations.length === 0) {
      alert("Add at least one variation to save");
      return;
    }
    // ensure every variation has a breakdown
    // for (let i = 0; i < variations.length; i++) {
    //   if (!variations[i].suggestedBreakdown) {
    //     alert(`Waiting for price calc on line ${i + 1}…`);
    //     return;
    //   }
    // }
    onSave(variations);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600"
          >
            ×
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">
            Choose Variations for {product.productName || product.name}
          </h2>

          {/* Pick new variation */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Color
              </label>
              {colorOptions.length ? (
                <select
                  value={pickedColor}
                  onChange={(e) => setPickedColor(e.target.value)}
                  className="border border-purple-300 rounded p-1 w-full"
                >
                  {colorOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={pickedColor}
                  onChange={(e) => setPickedColor(e.target.value)}
                  placeholder="Type color"
                  className="border border-purple-300 rounded p-1 w-full"
                />
              )}
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Size
              </label>
              {sizeOptions.length ? (
                <select
                  value={pickedSize}
                  onChange={(e) => setPickedSize(e.target.value)}
                  className="border border-purple-300 rounded p-1 w-full"
                >
                  {sizeOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={pickedSize}
                  onChange={(e) => setPickedSize(e.target.value)}
                  placeholder="Type size"
                  className="border border-purple-300 rounded p-1 w-full"
                />
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Qty
              </label>
              <input
                type="number"
                min={1}
                value={pickedQuantity}
                onChange={(e) => setPickedQuantity(e.target.value)}
                className="border border-purple-300 rounded p-1 w-full"
              />
            </div>
          </div>

          <button
            onClick={handleAddLine}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            + Add
          </button>

          {/* List of Variations & Suggested Price */}
          <div className="mt-4 space-y-4 max-h-64 overflow-y-auto">
            {variations.length === 0 && (
              <p className="text-red-500 text-sm font-semibold">
                Add product to save
              </p>
            )}
            {variations.map((v, idx) => (
              <div
                key={idx}
                className="border p-2 rounded flex flex-col space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span>
                    {v.color} / {v.size} &nbsp; Qty: {v.quantity}
                  </span>
                  <button
                    onClick={() => handleRemoveLine(idx)}
                    className="bg-pink-600 hover:bg-pink-700 text-white px-2 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                </div>

                {/* Suggested Price */}
                {/* <SuggestedPriceCalculator
                  product={{
                    baseCost: product.baseCost ?? product.productCost,
                    productCost: product.productCost,
                    quantity: v.quantity,
                    weight: product.weight,
                    brandingTypes: product.brandingTypes || [],
                  }}
                  companySegment={companySegment}
                  companyPincode={companyPincode}
                  brandingTypesList={brandingTypesList}
                  segmentsList={segmentsList}
                  onBreakdown={makeBreakdownHandler(idx)}
                /> */}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded text-white ${
                variations.length
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
              disabled={!variations.length}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
