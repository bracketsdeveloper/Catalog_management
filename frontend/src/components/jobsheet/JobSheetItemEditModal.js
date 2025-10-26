"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

const JobSheetItemEditModal = ({ item, onClose, onUpdate }) => {
  const [color, setColor] = useState(item.color || "");
  const [size, setSize] = useState(item.size || "");
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [sourcingFrom, setSourcingFrom] = useState(item.sourcingFrom || "");
  const [brandingType, setBrandingType] = useState(item.brandingType || "");
  const [brandingVendor, setBrandingVendor] = useState(item.brandingVendor || "");
  const [remarks, setRemarks] = useState(item.remarks || "");

  // vendor suggestions for sourcing typeahead
  const [vendors, setVendors] = useState([]);
  const [openSuggest, setOpenSuggest] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVendors(res.data || []);
      } catch (e) {
        console.error("Failed to load vendors", e);
      }
    })();
  }, []);

  const filtered = vendors
    .filter(v => (v.vendorName || "").toLowerCase().includes((sourcingFrom || "").toLowerCase()))
    .slice(0, 8);

  const handleSave = () => {
    const updatedItem = {
      color,
      size,
      quantity: parseInt(quantity) || 1,
      sourcingFrom,
      brandingType,
      brandingVendor,
      remarks,
    };
    onUpdate(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-white p-6 rounded w-full max-w-md relative border border-gray-200 shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
          <h2 className="text-xl font-bold mb-4 text-purple-700">
            Edit Item for {item.product}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Size</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-purple-700 mb-1">Sourcing From</label>
              <input
                type="text"
                value={sourcingFrom}
                onChange={(e) => { setSourcingFrom(e.target.value); setOpenSuggest(true); }}
                onFocus={() => setOpenSuggest(true)}
                className="border border-purple-300 rounded p-2 w-full"
                placeholder="Type vendor name…"
              />
              {openSuggest && filtered.length > 0 && (
                <div className="absolute z-20 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                  {filtered.map(v => (
                    <div
                      key={v._id}
                      className="p-2 cursor-pointer hover:bg-gray-100"
                      onMouseDown={() => { setSourcingFrom(v.vendorName); setOpenSuggest(false); }}
                    >
                      {v.vendorName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Branding Type</label>
              <input
                type="text"
                value={brandingType}
                onChange={(e) => setBrandingType(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Branding Vendor</label>
              <input
                type="text"
                value={brandingVendor}
                onChange={(e) => setBrandingVendor(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="border border-purple-300 rounded p-2 w-full"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
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
};

export default JobSheetItemEditModal;
