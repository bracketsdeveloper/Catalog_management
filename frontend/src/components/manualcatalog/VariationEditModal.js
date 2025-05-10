// src/components/VariationEditModal.jsx
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

  const [suggestedPrice, setSuggestedPrice] = useState(editableCost);
  const [priceFrozen, setPriceFrozen] = useState(false);
  const [breakdown, setBreakdown] = useState(item.suggestedBreakdown || {});
  const initialCost = useRef(item.baseCost != null ? item.baseCost : item.productCost);

  useEffect(() => {
    if (!item.productId) return;
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admin/products/${item.productId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(({ data }) => {
      if (!productDescription) setProductDescription(data.productDetails || "");
      if (!productBrand)       setProductBrand(data.brandName || "");
    })
    .catch(() => {});
  }, [item.productId, productDescription, productBrand]);

  const handleSetPrice = () => {
    setEditableCost(suggestedPrice);
    setPriceFrozen(true);
  };

  const toggleBrandingType = id =>
    setBrandingTypes(prev => prev.includes(id) ? prev.filter(x => x!==id) : [...prev, id]);

  const handleSave = () => onUpdate({
    productName: name,
    productCost: editableCost,
    productprice: editableCost,
    productGST: parseFloat(productGST)||0,
    color: color||"N/A",
    size: size||"N/A",
    quantity: parseInt(quantity)||1,
    material, weight,
    ProductDescription: productDescription,
    ProductBrand: productBrand,
    brandingTypes,
    baseCost: initialCost.current,
    suggestedBreakdown: breakdown,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border shadow-lg">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-600">×</button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">Edit Cart Item</h2>
          <div className="space-y-4">
            {/* Name */}
            <Field label="Product Name" value={name} setValue={setName} />

            {/* Cost + Set */}
            <div className="flex items-end space-x-2">
              <Field label="Cost" type="number" value={editableCost} setValue={setEditableCost} className="flex-1" />
              {!priceFrozen && (
                <button onClick={handleSetPrice}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                  Set Price
                </button>
              )}
            </div>

            {/* Suggested */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Suggested Price</label>
              <SuggestedPriceCalculator
                product={{ baseCost: initialCost.current, quantity: parseInt(quantity)||1, weight: parseFloat(weight)||0, brandingTypes }}
                companySegment={segmentName}
                companyPincode={companyPincode||""}
                brandingTypesList={brandingTypesList}
                segmentsList={segmentsList}
                onPrice={priceFrozen?undefined:setSuggestedPrice}
                onBreakdown={setBreakdown}
              />
            </div>

            <Field label="GST (%)" type="number" value={productGST} setValue={setProductGST} />
            <Field label="Color" value={color} setValue={setColor} />
            <Field label="Size" value={size} setValue={setSize} />
            <Field label="Quantity" type="number" value={quantity} setValue={setQuantity} />
            <Field label="Material" value={material} setValue={setMaterial} />
            <Field label="Weight" value={weight} setValue={setWeight} />
            <Field label="Product Description" textarea value={productDescription} setValue={setProductDescription} />
            <Field label="Product Brand" value={productBrand} setValue={setProductBrand} />

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Branding Types</label>
              <div className="border border-purple-300 p-2 rounded max-h-32 overflow-y-auto">
                {brandingTypesList.map(bt => (
                  <label key={bt._id} className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={brandingTypes.includes(bt._id)} onChange={()=>toggleBrandingType(bt._id)} />
                    <span>{bt.brandingName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Field helper
function Field({ label, value, setValue, type="text", textarea=false, className="" }) {
  return textarea ? (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">{label}</label>
      <textarea className={`border border-purple-300 rounded p-2 w-full h-24 ${className}`}
        value={value} onChange={e=>setValue(e.target.value)} />
    </div>
  ) : (
    <div>
      <label className="block text-sm font-medium text-purple-700 mb-1">{label}</label>
      <input type={type} className={`border border-purple-300 rounded p-2 w-full ${className}`}
        value={value} onChange={e=>setValue(e.target.value)} />
    </div>
  );
}
