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
  const initialCost = useRef(item.baseCost != null ? item.baseCost : item.productCost);

  // --- image selection state ---
  const [images, setImages] = useState([]);                       // array of product image URLs
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
        // fill in description/brand if blank
        if (!productDescription) setProductDescription(data.productDetails || "");
        if (!productBrand)       setProductBrand(data.brandName || "");
        // grab images array
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

  function handleSave() {
    try {
      const payload = {
        productName:        name,
        productCost:        parseFloat(editableCost) || 0,
        productprice:       parseFloat(editableCost) || 0,
        productGST:         parseFloat(productGST) || 0,
        color:              color || "N/A",
        size:               size || "N/A",
        quantity:           parseInt(quantity) || 1,
        material,
        weight:             parseFloat(weight) || 0,
        ProductDescription: productDescription,
        ProductBrand:       productBrand,
        brandingTypes,
        baseCost:           initialCost.current,
        suggestedBreakdown: breakdown,
        imageIndex:         selectedImageIndex,
      };
      console.log("Saving with data:", payload);
      onUpdate(payload);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }
  

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
          >
            ×
          </button>

          <h2 className="text-xl font-bold mb-4 text-purple-700">
            Edit Cart Item
          </h2>

          <div className="space-y-4">

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
                >
                  Set Price
                </button>
              )}
            </div>

            {/* Suggested Price */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                Suggested Price
              </label>
              <SuggestedPriceCalculator
                product={{
                  baseCost: initialCost.current,
                  quantity: parseInt(quantity) || 1,
                  weight:   parseFloat(weight) || 0,
                  brandingTypes
                }}
                companySegment={segmentName}
                companyPincode={companyPincode || ""}
                brandingTypesList={brandingTypesList}
                segmentsList={segmentsList}
                onPrice={priceFrozen ? undefined : setSuggestedPrice}
                onBreakdown={setBreakdown}
              />
            </div>

            {/* GST */}
            <Field
              label="GST (%)"
              type="number"
              value={productGST}
              setValue={setProductGST}
            />

            {/* Color / Size / Quantity */}
            <Field label="Color"     value={color}    setValue={setColor} />
            <Field label="Size"      value={size}     setValue={setSize} />
            <Field label="Quantity"  type="number"    value={quantity} setValue={setQuantity} />

            {/* Material / Weight */}
            <Field label="Material"  value={material}  setValue={setMaterial} />
            <Field label="Weight"    value={weight}    setValue={setWeight} />

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

          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
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

// simple input/textarea field component
function Field({ label, value, setValue, type = "text", textarea = false, className = "" }) {
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
      />
    </div>
  );
}
