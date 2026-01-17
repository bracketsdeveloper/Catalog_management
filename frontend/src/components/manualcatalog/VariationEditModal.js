// src/components/manualcatalog/VariationEditModal.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import SuggestedPriceCalculator from "../SuggestedPriceCalculator";

export default function VariationEditModal({
  item,
  brandingTypesList,
  segmentsList,
  segmentName,
  companyPincode,
  onClose,
  onUpdate,
}) {
  // --- form state ---
  const [name, setName] = useState(item.productName || "");
  const [editableCost, setEditableCost] = useState(item.productCost || 0);
  const [productGST, setProductGST] = useState(item.productGST || 0);
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [material, setMaterial] = useState(item.material || "");
  const [weight, setWeight] = useState(item.weight || "");
  const [productDescription, setProductDescription] = useState(item.ProductDescription || "");
  const [productBrand, setProductBrand] = useState(item.ProductBrand || "");
  const [brandingTypes, setBrandingTypes] = useState(item.brandingTypes || []);
  const [breakdown, setBreakdown] = useState(item.suggestedBreakdown || {});
  const [isBreakdownCalculated, setIsBreakdownCalculated] = useState(false);
  const initialCost = useRef(item.baseCost != null ? item.baseCost : item.productCost);

  // --- image selection state ---
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(
    typeof item.imageIndex === "number" ? item.imageIndex : 0
  );

  // --- fetch full product (to get images + other missing fields) ---
  useEffect(() => {
    if (!item.productId) return;
    axios
      .get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/products/${item.productId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      )
      .then(({ data }) => {
        if (!productDescription) setProductDescription(data.productDetails || "");
        if (!productBrand) setProductBrand(data.brandName || "");
        setImages(Array.isArray(data.images) ? data.images : []);
      })
      .catch(() => {
        setImages([]);
      });
  }, [item.productId]);

  // --- freeze cost logic ---
  const [suggestedPrice, setSuggestedPrice] = useState(editableCost);
  const [priceFrozen, setPriceFrozen] = useState(false);
  
  function handleSetPrice() {
    setEditableCost(suggestedPrice);
    setPriceFrozen(true);
  }

  function toggleBrandingType(id) {
    setBrandingTypes((prev) =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // Handle breakdown calculation
  const handleBreakdownCalculation = (breakdownData) => {
    setBreakdown(breakdownData);
    setIsBreakdownCalculated(true);
    
    // Auto-set the price if not already set
    if (breakdownData.finalPrice && !priceFrozen) {
      setSuggestedPrice(breakdownData.finalPrice);
    }
  };

  function handleSave() {
    if (!isBreakdownCalculated) {
      alert("Please wait for the suggested price to be calculated before saving.");
      return;
    }

    try {
      const costValue = editableCost === "" || editableCost == null 
        ? suggestedPrice 
        : (isNaN(parseFloat(editableCost)) ? suggestedPrice : parseFloat(editableCost));
      
      const payload = {
        productName: name,
        productCost: costValue,
        productprice: costValue,
        productGST: parseFloat(productGST) || 0,
        color: color || "",
        size: size || "",
        quantity: parseInt(quantity) || 1,
        material,
        weight: parseFloat(weight) || 0,
        ProductDescription: productDescription,
        ProductBrand: productBrand,
        brandingTypes,
        baseCost: initialCost.current,
        suggestedBreakdown: {
          ...breakdown,
          finalPrice: costValue // Ensure finalPrice matches the saved cost
        },
        imageIndex: selectedImageIndex,
      };
      
      console.log("Saving with data:", payload);
      onUpdate(payload);
      onClose(); // Close modal after save
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error saving product: " + err.message);
    }
  }

  // Calculate if save button should be enabled
  const isSaveDisabled = !isBreakdownCalculated;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border shadow-lg max-h-[90vh] flex flex-col">
          
          {/* HEADER WITH SAVE/CANCEL BUTTONS */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <h2 className="text-xl font-bold text-purple-700">
              Edit Product Details
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`px-4 py-2 rounded text-white text-sm ${
                  isSaveDisabled 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={isSaveDisabled}
              >
                {isSaveDisabled ? "Calculating..." : "Save"}
              </button>
            </div>
          </div>

          {/* CONTENT AREA WITH SCROLL */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Image selector */}
            {images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-1">
                  Display Image
                </label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded p-2"
                  value={selectedImageIndex}
                  onChange={e => setSelectedImageIndex(Number(e.target.value))}
                >
                  {images.map((url, idx) => (
                    <option key={idx} value={idx}>
                      Image #{idx + 1}
                    </option>
                  ))}
                </select>
                <img
                  src={images[selectedImageIndex]}
                  alt={`Preview ${selectedImageIndex+1}`}
                  className="mt-2 w-full h-32 object-contain border"
                />
              </div>
            )}

            {/* Name */}
            <Field label="Product Name" value={name} setValue={setName} />

            {/* Cost + Set */}
            <div className="flex items-end space-x-2">
              <Field
                label="Cost"
                type="number"
                value={editableCost}
                setValue={setEditableCost}
                className="flex-1"
              />
              {!priceFrozen && (
                <button
                  onClick={handleSetPrice}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  disabled={!isBreakdownCalculated}
                >
                  Set Price
                </button>
              )}
            </div>

            {/* Suggested Price Calculator */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Suggested Price Calculator
              </label>
              {!isBreakdownCalculated && (
                <div className="mb-2 p-2 bg-yellow-50 text-yellow-700 rounded text-sm">
                  ⏳ Calculating suggested price...
                </div>
              )}
              <SuggestedPriceCalculator
                product={{
                  baseCost: initialCost.current,
                  quantity: parseInt(quantity) || 1,
                  weight: parseFloat(weight) || 0,
                  brandingTypes
                }}
                companySegment={segmentName}
                companyPincode={companyPincode || ""}
                brandingTypesList={brandingTypesList}
                segmentsList={segmentsList}
                onPrice={priceFrozen ? undefined : setSuggestedPrice}
                onBreakdown={handleBreakdownCalculation}
              />
              {isBreakdownCalculated && breakdown.finalPrice && (
                <div className="mt-2 p-2 bg-green-50 text-green-700 rounded text-sm">
                  ✅ Suggested price calculated: ₹{breakdown.finalPrice.toFixed(2)}
                </div>
              )}
            </div>

            {/* GST */}
            <Field
              label="GST (%)"
              type="number"
              value={productGST}
              setValue={setProductGST}
            />

            {/* Color / Size / Quantity */}
            <Field label="Color" value={color} setValue={setColor} />
            <Field label="Size" value={size} setValue={setSize} />
            <Field 
              label="Quantity"  
              type="number"    
              value={quantity} 
              setValue={setQuantity}
              min="1"
            />

            {/* Material / Weight */}
            <Field label="Material" value={material} setValue={setMaterial} />
            <Field label="Weight" value={weight} setValue={setWeight} />

            {/* Description / Brand */}
            <Field
              label="Product Description"
              textarea
              value={productDescription}
              setValue={setProductDescription}
            />
            <Field
              label="Product Brand"
              value={productBrand}
              setValue={setProductBrand}
            />

            {/* Branding Types */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Branding Types
              </label>
              <div className="border border-purple-300 p-2 rounded max-h-32 overflow-y-auto">
                {brandingTypesList.map(bt => (
                  <label
                    key={bt._id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={brandingTypes.includes(bt._id)}
                      onChange={() => toggleBrandingType(bt._id)}
                    />
                    <span>{bt.brandingName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM BUTTONS (FOR MOBILE ACCESSIBILITY) */}
          <div className="mt-6 pt-4 border-t flex justify-end space-x-2 lg:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded text-white text-sm ${
                isSaveDisabled 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={isSaveDisabled}
            >
              {isSaveDisabled ? "Calculating..." : "Save Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// simple input/textarea field component
function Field({ label, value, setValue, type = "text", textarea = false, className = "", min = null }) {
  return textarea ? (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">
        {label}
      </label>
      <textarea
        className={`border border-purple-300 rounded p-2 w-full h-24 ${className}`}
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </div>
  ) : (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        className={`border border-purple-300 rounded p-2 w-full ${className}`}
        value={value}
        onChange={e => setValue(e.target.value)}
        min={min}
      />
    </div>
  );
}