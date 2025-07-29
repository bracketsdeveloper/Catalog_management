import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const QUOTATION_API_URL = `${BACKEND_URL}/api/admin/quotations`;

const QuotationSuggestionInput = ({ value, onChange, placeholder, label, onSelect }) => {
  const [quotations, setQuotations] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchQuotations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(QUOTATION_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Extract quotations array, default to empty array
      setQuotations(Array.isArray(res.data.quotations) ? res.data.quotations : []);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      setQuotations([]); // Set empty array on error
    }
  };

  const handleFocus = () => {
    if (quotations.length === 0) {
      fetchQuotations();
    }
    setShowSuggestions(true);
  };

  useEffect(() => {
    if (value) {
      const filtered = quotations.filter((q) =>
        q.quotationNumber?.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(Array.isArray(filtered) ? filtered : []);
    } else {
      setSuggestions(Array.isArray(quotations) ? quotations : []);
    }
  }, [value, quotations]);

  const handleSelect = (quotation) => {
    onChange(quotation.quotationNumber || "");
    setShowSuggestions(false);
    if (onSelect) {
      onSelect(quotation);
    }
  };

  return (
    <div className="relative">
      {label && <label className="block mb-1 font-medium text-purple-700">{label}</label>}
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
          {suggestions.map((q) => (
            <div
              key={q._id}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(q)}
            >
              {(q.quotationNumber || "Unknown")} - {(q.customerName || "Unknown")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotationSuggestionInput;