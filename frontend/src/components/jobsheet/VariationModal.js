// src/components/manualcatalog/VariationModal.jsx
import React, { useState, useCallback } from "react";
import SuggestedPriceCalculator from "../SuggestedPriceCalculator";

export default function VariationModal({
  product,
  onClose,
  onSave,
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

  // Each variation now carries its own breakdown slot
  const [variations, setVariations] = useState([]);
  const [allBreakdownsCalculated, setAllBreakdownsCalculated] = useState(false);

  const handleAddLine = useCallback(() => {
    console.debug("➕ Adding variation line:", { pickedColor, pickedSize, pickedQuantity });
    const newVariation = {
      color: pickedColor || "",
      size: pickedSize || "",
      quantity: parseInt(pickedQuantity, 10) || 1,
      suggestedBreakdown: null,
      breakdownCalculated: false,
    };
    
    setVariations((prev) => [...prev, newVariation]);
  }, [pickedColor, pickedSize, pickedQuantity]);

  const handleRemoveLine = useCallback((idx) => {
    console.debug("➖ Removing variation line:", idx);
    setVariations((prev) => {
      const newVariations = prev.filter((_, i) => i !== idx);
      // Check if all remaining variations have breakdowns calculated
      const allCalculated = newVariations.every(v => v.breakdownCalculated);
      setAllBreakdownsCalculated(allCalculated);
      return newVariations;
    });
  }, []);

  // Build a stable callback for each variation to capture its own breakdown
  const makeBreakdownHandler = useCallback((idx) => (breakdown) => {
    console.debug(`🔍 Breakdown for variation #${idx}:`, breakdown);
    setVariations((prev) => {
      const copy = [...prev];
      copy[idx] = { 
        ...copy[idx], 
        suggestedBreakdown: breakdown,
        breakdownCalculated: true
      };
      
      // Check if all variations now have breakdowns calculated
      const allCalculated = copy.every(v => v.breakdownCalculated);
      setAllBreakdownsCalculated(allCalculated);
      
      return copy;
    });
  }, []);

  const handleSave = () => {
    console.debug("💾 Saving all variations:", variations);
    
    if (variations.length === 0) {
      alert("Add at least one variation to save");
      return;
    }
    
    // Check if all variations have breakdowns calculated
    const hasMissingBreakdowns = variations.some(v => !v.breakdownCalculated || !v.suggestedBreakdown);
    
    if (hasMissingBreakdowns) {
      alert("Please wait for all price calculations to complete before saving.");
      return;
    }
    
    // Prepare variations data for saving
    const variationsToSave = variations.map((v, index) => ({
      productId: product._id,
      productName: product.productName || product.name,
      productCost: v.suggestedBreakdown?.finalPrice || product.productCost || 0,
      productGST: product.productGST || 0,
      color: v.color,
      size: v.size,
      quantity: v.quantity,
      material: product.material || "",
      weight: product.weight || "",
      ProductDescription: product.productDetails || "",
      ProductBrand: product.brandName || "",
      brandingTypes: [],
      baseCost: product.productCost || 0,
      suggestedBreakdown: v.suggestedBreakdown || {
        baseCost: product.productCost || 0,
        marginPct: 0,
        marginAmount: 0,
        logisticsCost: 0,
        brandingCost: 0,
        finalPrice: v.suggestedBreakdown?.finalPrice || product.productCost || 0,
      },
      imageIndex: 0,
    }));
    
    onSave(variationsToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border shadow-lg">
          {/* REMOVED THE CLOSE BUTTON FROM HERE */}
          
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
            + Add Variation
          </button>

          {/* Status indicator */}
          {variations.length > 0 && !allBreakdownsCalculated && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 rounded text-sm">
              ⏳ Calculating prices for all variations...
            </div>
          )}

          {/* List of Variations & Suggested Price */}
          <div className="mt-4 space-y-4 max-h-64 overflow-y-auto">
            {variations.length === 0 && (
              <p className="text-red-500 text-sm font-semibold">
                Add at least one variation to continue
              </p>
            )}
            
            {variations.map((v, idx) => (
              <div
                key={idx}
                className="border p-3 rounded bg-gray-50"
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-medium">Variation {idx + 1}:</span>
                    <span className="ml-2">
                      {v.color || "No color"} / {v.size || "No size"} 
                      <span className="ml-2">(Qty: {v.quantity})</span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveLine(idx)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Remove
                  </button>
                </div>

                {/* Suggested Price Calculator for this variation */}
                <SuggestedPriceCalculator
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
                />
                
                {/* Show breakdown status */}
                {v.breakdownCalculated && v.suggestedBreakdown?.finalPrice && (
                  <div className="mt-2 p-2 bg-green-50 text-green-700 rounded text-xs">
                    ✅ Price calculated: ₹{v.suggestedBreakdown.finalPrice.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded text-white ${
                variations.length > 0 && allBreakdownsCalculated
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
              disabled={!variations.length || !allBreakdownsCalculated}
            >
              {allBreakdownsCalculated ? "Save All Variations" : "Calculating..."}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}