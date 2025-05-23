"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [editableQuotation, setEditableQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTerm, setNewTerm] = useState({ heading: "", content: "" });
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermIdx, setEditingTermIdx] = useState(null);
  const [products, setProducts] = useState([]);
  const token = localStorage.getItem("token");

  const defaultTerms = [
    {
      heading: "Delivery",
      content:
        "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost",
    },
    { heading: "Branding", content: "As mentioned above" },
    { heading: "Payment Terms", content: "Within 30 days upon delivery" },
    {
      heading: "Quote Validity",
      content: "The quote is valid only for 6 days from the date of quotation",
    },
  ];

  useEffect(() => {
    fetchQuotation();
    fetchProducts();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (editableQuotation && (!editableQuotation.terms || editableQuotation.terms.length === 0)) {
      setEditableQuotation((prev) => ({ ...prev, terms: defaultTerms }));
    }
    // eslint-disable-next-line
  }, [editableQuotation?.terms]);

  async function fetchProducts() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error.response?.data || error.message);
    }
  }

  async function fetchQuotation() {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch quotation");
      }
      const data = await res.json();
      const sanitizedItems = (data.items || []).map((item, idx) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 1,
        slNo: item.slNo || idx + 1,
        productGST: item.productGST != null ? parseFloat(item.productGST) : 18, // Respect 0
        rate: parseFloat(item.rate) || 0,
        product: item.product || "Unknown Product",
      }));
      setQuotation({ ...data, items: sanitizedItems });
      setEditableQuotation({ ...data, items: sanitizedItems });
      setError(null);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError("Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveQuotation() {
    if (!editableQuotation) return;
    try {
      const updatedMargin = parseFloat(editableQuotation.margin) || 0;
      const {
        opportunityNumber,
        catalogName,
        salutation,
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        gst,
        items,
        terms,
        fieldsToDisplay,
        displayTotals,
        displayHSNCodes,
      } = editableQuotation;

      const updatedItems = items.map((item) => {
        const baseRate = parseFloat(item.rate) || 0;
        const quantity = parseFloat(item.quantity) || 1;
        const marginFactor = 1 + updatedMargin / 100;
        const effRate = baseRate * marginFactor;
        const amount = effRate * quantity;
        const gstRate = item.productGST != null ? parseFloat(item.productGST) : 18; // Respect 0
        const gstAmount = parseFloat((amount * (gstRate / 100)).toFixed(2));
        const total = parseFloat((amount + gstAmount).toFixed(2));
        return {
          ...item,
          rate: baseRate,
          amount,
          total,
          productprice: baseRate,
          productGST: gstRate,
          quantity,
          productId: item.productId?._id || item.productId,
        };
      });

      const body = {
        opportunityNumber,
        catalogName,
        salutation,
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        margin: updatedMargin,
        gst,
        items: updatedItems,
        terms,
        fieldsToDisplay,
        displayTotals,
        displayHSNCodes,
      };

      console.log("Updating quotation with payload:", body);

      const updateRes = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update quotation");
      }

      console.log("Creating new quotation with payload:", body);

      const createRes = await fetch(`${BACKEND_URL}/api/admin/quotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create new quotation");
      }

      const data = await createRes.json();
      console.log("Response from server:", data);

      if (!data || !data.quotation || !data.quotation._id) {
        throw new Error("Invalid response from server: Missing quotation data");
      }

      alert("New Quotation created!");
      setQuotation(data.quotation);
      setEditableQuotation(data.quotation);
      navigate(`/admin-dashboard/quotations/${data.quotation._id}`);
    } catch (error) {
      console.error("Save error:", error);
      alert(`Failed to save quotation: ${error.message}`);
    }
  }

  function handleHeaderBlur(field, e) {
    setEditableQuotation((prev) => ({
      ...prev,
      [field]: e.target.innerText,
    }));
  }

  function updateItemField(index, field, newValue) {
    setEditableQuotation((prev) => {
      const newItems = [...prev.items];
      if (field === "quantity" || field === "productGST" || field === "rate") {
        const parsedValue = parseFloat(newValue);
        newItems[index] = {
          ...newItems[index],
          [field]: isNaN(parsedValue) ? (field === "productGST" ? 18 : 1) : parsedValue, // Allow 0 for productGST
        };
      } else {
        newItems[index] = { ...newItems[index], [field]: newValue };
      }
      return { ...prev, items: newItems };
    });
  }

  function removeItem(index) {
    setEditableQuotation((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, idx) => ({ ...item, slNo: idx + 1 })),
    }));
  }

  function handleAddEmail() {
    const email = window.prompt("Enter customer email:");
    if (email) {
      setEditableQuotation((prev) => ({
        ...prev,
        customerEmail: email,
      }));
    }
  }

  function handleAddTerm() {
    if (newTerm.heading && newTerm.content) {
      setEditableQuotation((prev) => ({
        ...prev,
        terms: [...prev.terms, newTerm],
      }));
      setNewTerm({ heading: "", content: "" });
      setTermModalOpen(false);
    }
  }

  function handleEditTerm(idx) {
    const term = editableQuotation.terms[idx];
    setNewTerm({ heading: term.heading, content: term.content });
    setEditingTermIdx(idx);
    setTermModalOpen(true);
  }

  function handleUpdateTerm() {
    const updatedTerms = [...editableQuotation.terms];
    updatedTerms[editingTermIdx] = { heading: newTerm.heading, content: newTerm.content };
    setEditableQuotation((prev) => ({
      ...prev,
      terms: updatedTerms,
    }));
    setTermModalOpen(false);
    setEditingTermIdx(null);
  }

  const handleExportPDF = () => {
    navigate(`/admin-dashboard/print-quotation/${id}`);
  };

  if (loading) return <div className="p-6 text-gray-400">Loading quotation...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!editableQuotation || !editableQuotation.items) return <div className="p-6 text-gray-400">Quotation not found.</div>;

  const marginFactor = 1 + (parseFloat(editableQuotation.margin) || 0) / 100;

  return (
    <div className="p-6 bg-white text-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleExportPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs"
        >
          Export to PDF
        </button>
        <div className="flex space-x-4">
          <button
            onClick={handleSaveQuotation}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
          >
            Save Changes
          </button>
          <button
            onClick={() => setEditableQuotation((prev) => ({ ...prev, displayTotals: !prev.displayTotals }))}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs"
          >
            {editableQuotation.displayTotals ? "Hide Totals" : "Show Totals"}
          </button>
          <button
            onClick={() => setEditableQuotation((prev) => ({ ...prev, displayHSNCodes: !prev.displayHSNCodes }))}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-xs"
          >
            {editableQuotation.displayHSNCodes ? "Hide HSN Codes" : "Show HSN Codes"}
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-2 text-xs">
        {editableQuotation.customerName && (
          <div>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("salutation", e)}
            >
              {editableQuotation.salutation || "Mr."}
            </span>{" "}
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("customerName", e)}
            >
              {editableQuotation.customerName}
            </span>
          </div>
        )}
        <div>
          <span
            type="text"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerCompany", e)}
          >
            {editableQuotation.customerCompany}
          </span>
        </div>
        {editableQuotation.customerAddress && (
          <div>
            <span className="font-bold uppercase">Address:</span>{" "}
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleHeaderBlur("customerAddress", e)}
            >
              {editableQuotation.customerAddress}
            </span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={() => setTermModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4 text-xs"
        >
          + Add Terms
        </button>
        {editableQuotation.terms.map((term, idx) => (
          <div key={idx} className="mb-4 text-xs">
            <div className="font-semibold">{term.heading}</div>
            <div>{term.content}</div>
            <button
              onClick={() => handleEditTerm(idx)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mt-2 text-xs"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {termModalOpen && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded w-1/3">
            <h2 className="text-xl font-semibold mb-4">
              {editingTermIdx !== null ? "Edit Term" : "Add Term"}
            </h2>
            <div className="mb-4">
              <input
                type="text"
                value={newTerm.heading}
                placeholder="Term Heading"
                onChange={(e) => setNewTerm((prev) => ({ ...prev, heading: e.target.value }))}
                className="border p-2 w-full text-xs"
              />
            </div>
            <div className="mb-4">
              <textarea
                value={newTerm.content}
                placeholder="Term Content"
                onChange={(e) => setNewTerm((prev) => ({ ...prev, content: e.target.value }))}
                className="border p-2 w-full text-xs"
                rows="4"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setTermModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={editingTermIdx !== null ? handleUpdateTerm : handleAddTerm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
              >
                {editingTermIdx !== null ? "Update Term" : "Add Term"}
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="w-full border-collapse mb-6 text-xs">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Sl. No.</th>
            <th className="p-2 text-left">Image</th>
            <th className="p-2 text-left">Product</th>
            {editableQuotation.displayHSNCodes && <th className="p-2 text-left">HSN</th>}
            <th className="p-2 text-left">Quantity</th>
            <th className="p-2 text-left">Rate (with margin)</th>
            <th className="p-2 text-left">Price Breakdown</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">GST (%)</th>
            <th className="p-2 text-left">Total</th>
            <th className="p-2 text-left">Remove</th>
          </tr>
        </thead>
        <tbody>
          {editableQuotation.items.map((item, index) => {
            const baseRate = parseFloat(item.rate) || 0;
            const quantity = parseFloat(item.quantity) || 1;
            const effRate = baseRate * marginFactor;
            const amount = effRate * quantity;
            const gstRate = item.productGST != null ? parseFloat(item.productGST) : 18; // Respect 0
            const gstVal = parseFloat((amount * (gstRate / 100)).toFixed(2));
            const total = parseFloat((amount + gstVal).toFixed(2));
            const imageUrl =
              item.image ||
              item.productId?.images?.[0] ||
              item.productId?.name ||
              "https://via.placeholder.com/150";
            const hsnCode = item.hsnCode || item.productId?.hsnCode || "N/A";

            return (
              <tr key={index} className="border-b">
                <td className="p-2">{item.slNo}</td>
                <td className="p-2">
                  {imageUrl !== "https://via.placeholder.com/150" ? (
                    <img src={imageUrl} alt={item.product} className="w-16 h-16 object-cover" />
                  ) : (
                    "No Image"
                  )}
                </td>
                <td className="p-2">
                  <EditableField
                    value={item.product || ""}
                    onSave={(newVal) => updateItemField(index, "product", newVal)}
                  />
                </td>
                {editableQuotation.displayHSNCodes && (
                  <td className="p-2">
                    <EditableField
                      value={hsnCode}
                      onSave={(newVal) => updateItemField(index, "hsnCode", newVal)}
                    />
                  </td>
                )}
                <td className="p-2">
                  <EditableField
                    value={quantity.toString()}
                    type="number"
                    onSave={(newVal) => {
                      const newQuantity = parseFloat(newVal);
                      updateItemField(index, "quantity", isNaN(newQuantity) || newQuantity < 0 ? 1 : newQuantity);
                    }}
                  />
                </td>
                <td className="p-2">
                  <EditableField
                    value={effRate.toFixed(2)}
                    type="number"
                    onSave={(newVal) => {
                      const newEffRate = parseFloat(newVal);
                      if (!isNaN(newEffRate)) {
                        const newBaseRate = newEffRate / marginFactor;
                        updateItemField(index, "rate", parseFloat(newBaseRate.toFixed(2)));
                        updateItemField(index, "productprice", parseFloat(newBaseRate.toFixed(2)));
                      }
                    }}
                  />
                </td>
                <td className="p-2">
                  <PriceBreakdownTooltip breakdown={item.suggestedBreakdown} />
                </td>
                <td className="p-2">{amount.toFixed(2)}</td>
                <td className="p-2">
                  <EditableField
                    value={gstRate.toString()}
                    type="number"
                    onSave={(newVal) => {
                      const newGST = parseFloat(newVal);
                      updateItemField(index, "productGST", isNaN(newGST) ? 18 : newGST); // Allow 0
                    }}
                  />
                  %
                </td>
                <td className="p-2">{total.toFixed(2)}</td>
                <td className="p-2">
                  <button
                    onClick={() => removeItem(index)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editableQuotation.displayTotals && (
        <div className="mb-6 text-lg font-bold text-xs">
          <p>Total Amount: ₹{computedAmount(editableQuotation).toFixed(2)}</p>
          <p>Grand Total (with GST): ₹{computedTotal(editableQuotation).toFixed(2)}</p>
        </div>
      )}

      <div className="p-2 italic font-bold text-blue-600 border text-center text-xs">
        Rates may vary in case there is a change in specifications / quantity / timelines
      </div>
    </div>
  );
}

function EditableField({ value, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleIconClick = () => setEditing(true);

  const handleBlur = () => {
    setEditing(false);
    onSave(currentValue);
  };

  if (editing) {
    return (
      <input
        type={type}
        className="border p-1 rounded text-xs"
        autoFocus
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        min={type === "number" ? 0 : undefined}
      />
    );
  }

  return (
    <div className="flex items-center">
      <span>{currentValue}</span>
      <button onClick={handleIconClick} className="ml-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 4h2M12 5v6m-7 7h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  );
}

function PriceBreakdownTooltip({ breakdown }) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    baseCost = 0,
    marginPct = 0,
    marginAmount = 0,
    logisticsCost = 0,
    brandingCost = 0,
    finalPrice = 0,
  } = breakdown || {};

  return (
    <div className="relative inline-block">
      <button
        className="text-blue-600 hover:text-blue-800 text-xs font-bold"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        i
      </button>
      {isHovered && (
        <div className="absolute z-10 bg-gray-800 text-white text-xs rounded p-2 w-64 shadow-lg -left-20 top-6">
          <h4 className="font-bold mb-1">Price Breakdown</h4>
          <p>Cost: ₹{(baseCost + marginAmount).toFixed(2)}</p>
          <p>Logistics Cost: ₹{logisticsCost.toFixed(2)}</p>
          <p>Branding Cost: ₹{brandingCost.toFixed(2)}</p>
          <p>Final Price: ₹{finalPrice.toFixed(2)}</p>
          <p>Profit: ₹{marginAmount.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

function computedAmount(quotation) {
  let sum = 0;
  (quotation.items || []).forEach((item) => {
    const quantity = parseFloat(item.quantity) || 1;
    const baseRate = parseFloat(item.rate) || 0;
    const margin = parseFloat(quotation.margin) || 0;
    const marginFactor = 1 + margin / 100;
    sum += baseRate * marginFactor * quantity;
  });
  return sum;
}

function computedTotal(quotation) {
  let sum = 0;
  (quotation.items || []).forEach((item) => {
    const quantity = parseFloat(item.quantity) || 1;
    const baseRate = parseFloat(item.rate) || 0;
    const margin = parseFloat(quotation.margin) || 0;
    const marginFactor = 1 + margin / 100;
    const amount = baseRate * marginFactor * quantity;
    const gst = item.productGST != null ? parseFloat(item.productGST) : 18; // Respect 0
    const gstVal = parseFloat((amount * (gst / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}