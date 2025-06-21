import React, { useState, useEffect } from "react";
import axios from "axios";

// Use your backend proxy endpoint for purchase orders
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PO_API_URL = `${BACKEND_URL}/api/erp/purchase-orders`;

const PurchaseOrderSuggestionInput = ({ value, onChange, placeholder, label, onPOSelect }) => {
  const [allPOs, setAllPOs] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch all purchase orders (only "name")
  const fetchPOs = async () => {
    try {
      const res = await axios.get(PO_API_URL, {
        params: {
          fields: '["name"]'
        }
      });
      setAllPOs(res.data.data);
    } catch (error) {
      console.error("Error fetching purchase orders from ERPNext:", error);
    }
  };

  const handleFocus = () => {
    if (allPOs.length === 0) {
      fetchPOs();
    }
    setShowSuggestions(true);
  };

  useEffect(() => {
    if (value) {
      const filtered = allPOs.filter((po) =>
        po.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(allPOs);
    }
  }, [value, allPOs]);

  const handleSelect = (po) => {
    onChange(po.name);
    setShowSuggestions(false);
    if (onPOSelect) {
      onPOSelect(po);
    }
  };

  return (
    <div className="relative">
      {label && (
        <label className="block mb-1 font-medium text-purple-700">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="border border-purple-300 rounded w-full p-2"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bg-white border border-gray-300 rounded shadow-lg mt-1 w-full z-10">
          {suggestions.map((po) => (
            <div
              key={po.name}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(po)}
            >
              {po.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderSuggestionInput;
