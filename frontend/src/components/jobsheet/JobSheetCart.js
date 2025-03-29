"use client";

import React from "react";

const brandingTypeOptions = [
  "Screen Printing",
  "Sublimation Printing",
  "HT Printing",
  "Engraving",
  "Embroidery",
  "UV Printing",
  "DTF Stickering",
  "Embossing",
  "Debossing",
  "Digital Printing",
  "Offset Printing"
];

const JobSheetCart = ({ 
  selectedItems, 
  setCartOpen, 
  handleRemoveSelectedItem, 
  handleEditItem,
  handleInlineUpdate // New prop for inline updating
}) => {
  // Check that every item has both brandingType and brandingVendor filled
  const isValid = selectedItems.every(item => item.brandingType && item.brandingVendor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black bg-opacity-30">
      <div className="bg-white w-full sm:w-96 h-full shadow-md p-4 flex flex-col relative">
        <h2 className="text-lg font-bold text-purple-700 mb-4">
          Selected Items ({selectedItems.length})
        </h2>
        <button
          onClick={() => setCartOpen(false)}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        >
          <span className="text-xl font-bold">&times;</span>
        </button>
        <div className="flex-grow overflow-auto">
          {selectedItems.length === 0 && (
            <p className="text-gray-600">No products selected.</p>
          )}
          {selectedItems.map((item, idx) => (
            <div key={idx} className="flex flex-col border border-purple-200 rounded p-2 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm text-purple-800">{item.product}</div>
                  {item.color && <div className="text-xs">Color: {item.color}</div>}
                  {item.size && <div className="text-xs">Size: {item.size}</div>}
                  <div className="text-xs">Qty: {item.quantity}</div>
                  <div className="text-xs">
                    <span className="font-bold">SOURCING FROM: </span>
                    <input
                      type="text"
                      className="text-xs border rounded p-1"
                      value={item.sourcingFrom || ""}
                      onChange={(e) =>
                        handleInlineUpdate(idx, "sourcingFrom", e.target.value)
                      }
                      placeholder="Enter sourcing"
                    />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">BRANDING TYPE: </span>
                    <select
                      className="text-xs border rounded p-1"
                      value={item.brandingType || ""}
                      onChange={(e) =>
                        handleInlineUpdate(idx, "brandingType", e.target.value)
                      }
                    >
                      <option value="">Select Branding Type</option>
                      {brandingTypeOptions.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold">BRANDING VENDOR: </span>
                    <input
                      type="text"
                      className="text-xs border rounded p-1"
                      value={item.brandingVendor || ""}
                      onChange={(e) =>
                        handleInlineUpdate(idx, "brandingVendor", e.target.value)
                      }
                      placeholder="Enter Vendor"
                    />
                  </div>
                  {item.remarks && <div className="text-xs">Remarks: {item.remarks}</div>}
                </div>
                <button
                  onClick={() => handleRemoveSelectedItem(idx)}
                  className="bg-pink-600 hover:bg-pink-700 text-white px-2 py-1 rounded text-sm"
                >
                  Remove
                </button>
              </div>
              <button
                onClick={() => handleEditItem(idx)}
                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs self-start"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
        {!isValid && (
          <p className="text-red-500 text-xs mb-2">
            Please fill in Branding Type and Branding Vendor for all items.
          </p>
        )}
        <button
          onClick={() => {
            if (isValid) {
              setCartOpen(false);
            }
          }}
          disabled={!isValid}
          className={`px-4 py-2 rounded self-end mt-2 ${
            isValid ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"
          } text-white`}
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};

export default JobSheetCart;
