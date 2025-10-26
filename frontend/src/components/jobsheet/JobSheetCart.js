"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

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
  handleInlineUpdate
}) => {
  const isValid = selectedItems.every(item => item.brandingType && item.brandingVendor);

  const [vendorOtherMap, setVendorOtherMap] = useState({});
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [sourceOpen, setSourceOpen] = useState({});        // typeahead open map per item
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendorSuggestions(res.data || []);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const filteredBy = (q) => {
    const s = (q || "").toLowerCase();
    return vendorSuggestions
      .filter(v => (v.vendorName || "").toLowerCase().includes(s))
      .slice(0, 8);
  };

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
          {selectedItems.map((item, idx) => {
            const options = filteredBy(item.sourcingFrom);
            return (
              <div key={idx} className="flex flex-col border border-purple-200 rounded p-2 mb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-purple-800 break-words">{item.product}</div>
                    {item.color && <div className="text-xs">Color: {item.color}</div>}
                    {item.size && <div className="text-xs">Size: {item.size}</div>}
                    <div className="text-xs">Qty: {item.quantity}</div>

                    {/* Sourcing From - typeahead */}
                    <div className="text-xs relative">
                      <span className="font-bold">SOURCING FROM: </span>
                      <input
                        type="text"
                        className="text-xs border rounded p-1 w-full"
                        value={item.sourcingFrom || ""}
                        onChange={(e) => {
                          handleInlineUpdate(idx, "sourcingFrom", e.target.value);
                          setSourceOpen((m) => ({ ...m, [idx]: true }));
                        }}
                        onFocus={() => setSourceOpen((m) => ({ ...m, [idx]: true }))}
                        placeholder="Type vendor name…"
                      />
                      {sourceOpen[idx] && options.length > 0 && (
                        <div className="absolute z-20 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-40 overflow-y-auto">
                          {options.map(v => (
                            <div
                              key={v._id}
                              className="p-2 cursor-pointer hover:bg-gray-100"
                              onMouseDown={() => {
                                handleInlineUpdate(idx, "sourcingFrom", v.vendorName);
                                setSourceOpen((m) => ({ ...m, [idx]: false }));
                              }}
                            >
                              {v.vendorName}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Branding Type */}
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

                    {/* Branding Vendor */}
                    <div className="text-xs">
                      <span className="font-bold">BRANDING VENDOR: </span>
                      {vendorOtherMap[idx] ? (
                        <div className="relative">
                          <div>
                            <input
                              type="text"
                              className="border rounded p-1 w-full"
                              value={item.brandingVendor || ""}
                              onChange={(e) =>
                                handleInlineUpdate(idx, "brandingVendor", e.target.value)
                              }
                              placeholder="Enter Vendor"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setVendorOtherMap(prev => ({ ...prev, [idx]: false }))
                            }
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                          >
                            Go to option
                          </button>
                        </div>
                      ) : (
                        <div>
                          {vendorSuggestions.length > 0 && (
                            <select
                              name="vendorName"
                              className="border w-full p-2 rounded text-sm"
                              value={item.brandingVendor || ""}
                              onChange={(e) => {
                                const selected = e.target.value;
                                if (selected === "Other") {
                                  setVendorOtherMap(prev => ({ ...prev, [idx]: true }));
                                  handleInlineUpdate(idx, "brandingVendor", "");
                                } else {
                                  handleInlineUpdate(idx, "brandingVendor", selected);
                                }
                              }}
                            >
                              <option value="">Select Vendor</option>
                              {vendorSuggestions.map((vendor) => (
                                <option key={vendor._id} value={vendor.vendorName}>
                                  {vendor.vendorName}
                                </option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                          )}
                        </div>
                      )}
                    </div>

                    {item.remarks && <div className="text-xs">Remarks: {item.remarks}</div>}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleRemoveSelectedItem(idx)}
                      className="bg-pink-600 hover:bg-pink-700 text-white px-2 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleEditItem(idx)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isValid && (
          <p className="text-red-500 text-xs mb-2">
            Please fill in Branding Type and Branding Vendor for all items.
          </p>
        )}
        <button
          onClick={() => { if (isValid) setCartOpen(false); }}
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
