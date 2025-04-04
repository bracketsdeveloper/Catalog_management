"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function QuotationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [quotation, setQuotation] = useState(null);
  const [editableQuotation, setEditableQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTerm, setNewTerm] = useState({ heading: "", content: "" });
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermIdx, setEditingTermIdx] = useState(null);

  // Default terms preset
  const defaultTerms = [
    {
      heading: "Delivery",
      content:
        "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost",
    },
    {
      heading: "Branding",
      content: "As mentioned above",
    },
    {
      heading: "Payment Terms",
      content: "Within 30 days upon delivery",
    },
    {
      heading: "Quote Validity",
      content: "The quote is valid only for 6 days from the date of quotation",
    },
  ];

  useEffect(() => {
    fetchQuotation();
    // eslint-disable-next-line
  }, [id]);

  // Preset default terms if none exist
  useEffect(() => {
    if (editableQuotation && (!editableQuotation.terms || editableQuotation.terms.length === 0)) {
      setEditableQuotation((prev) => ({
        ...prev,
        terms: defaultTerms,
      }));
    }
    // eslint-disable-next-line
  }, [editableQuotation?.terms]);

  async function fetchQuotation() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch quotation");
      }
      const data = await res.json();
      setQuotation(data);
      setEditableQuotation(data);
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
      const token = localStorage.getItem("token");
      const updatedMargin = parseFloat(editableQuotation.margin) || 0;
      const {
        catalogName,
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        items,
        terms,
      } = editableQuotation;
      
      const body = {
        catalogName,
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        margin: updatedMargin,
        items,
        terms,
      };

      console.log("Before saving, updated quotation data:", body);
      // Log each item's base rate and computed effective rate:
      body.items.forEach((it, idx) => {
        const effRate = it.rate * (1 + updatedMargin / 100);
        console.log(`Item ${idx}: base rate = ${it.rate}, effective rate = ${effRate.toFixed(2)}`);
      });

      const res = await fetch(`${BACKEND_URL}/api/admin/quotations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error("Creation failed");
      }
      const data = await res.json();
      console.log("Response from server:", data);
      alert("New Quotation created!");
      navigate(`/admin-dashboard/quotations/${data.quotation._id}`);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes");
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
      newItems[index] = { ...newItems[index], [field]: newValue };
      console.log(`After update, items:`, newItems);
      return { ...prev, items: newItems };
    });
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

  function computedAmount(quotation) {
    let sum = 0;
    quotation.items.forEach((item) => {
      const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
      const baseRate = parseFloat(item.rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      sum += baseRate * marginFactor * quantity;
    });
    return sum;
  }

  function computedTotal(quotation) {
    let sum = 0;
    quotation.items.forEach((item) => {
      const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
      const baseRate = parseFloat(item.rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const amount = baseRate * marginFactor * quantity;
      const gstVal = parseFloat((amount * (parseFloat(item.productGST) / 100)).toFixed(2));
      sum += amount + gstVal;
    });
    return sum;
  }

  if (loading) {
    return <div className="p-6 text-gray-400">Loading quotation...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }
  if (!editableQuotation) {
    return <div className="p-6 text-gray-400">Quotation not found.</div>;
  }

  // Compute margin factor for display
  const marginFactor = 1 + ((parseFloat(editableQuotation.margin) || 0) / 100);

  return (
    <div className="p-6 bg-white text-black min-h-screen">
      {/* Top Buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleExportPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Export to PDF
        </button>
        <button
          onClick={handleSaveQuotation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Save Changes
        </button>
      </div>

      {/* Editable Header Fields */}
      <div className="mb-4 space-y-2">
        <div>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerName", e)}
          >
            {editableQuotation.customerName}
          </span>
        </div>
        <div>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerEmail", e)}
          >
            {editableQuotation.customerEmail}
          </span>
        </div>
        <div>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerCompany", e)}
          >
            {editableQuotation.customerCompany}
          </span>
        </div>
        <div>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("gst", e)}
          >
            GST: {editableQuotation.gst}
          </span>
        </div>
      </div>

      {/* Terms Section */}
      <div className="mb-6">
        <button
          onClick={() => setTermModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4"
        >
          + Add Terms
        </button>
        {editableQuotation.terms.map((term, idx) => (
          <div key={idx} className="mb-4">
            <div className="font-semibold">{term.heading}</div>
            <div>{term.content}</div>
            <button
              onClick={() => handleEditTerm(idx)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mt-2"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* Terms Modal */}
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
                onChange={(e) =>
                  setNewTerm((prev) => ({ ...prev, heading: e.target.value }))
                }
                className="border p-2 w-full"
              />
            </div>
            <div className="mb-4">
              <textarea
                value={newTerm.content}
                placeholder="Term Content"
                onChange={(e) =>
                  setNewTerm((prev) => ({ ...prev, content: e.target.value }))
                }
                className="border p-2 w-full"
                rows="4"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setTermModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={editingTermIdx !== null ? handleUpdateTerm : handleAddTerm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                {editingTermIdx !== null ? "Update Term" : "Add Term"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <table className="w-full border-collapse mb-6 text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Sl. No.</th>
            <th className="p-2 text-left">Image</th>
            <th className="p-2 text-left">Product</th>
            <th className="p-2 text-left">Quantity</th>
            <th className="p-2 text-left">Rate (with margin)</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">GST (%)</th>
            <th className="p-2 text-left">Total</th>
          </tr>
        </thead>
        <tbody>
          {editableQuotation.items.map((item, index) => {
            const baseRate = parseFloat(item.rate) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            // Effective rate = base rate * marginFactor
            const effRate = baseRate * marginFactor;
            const amount = effRate * quantity;
            const gstVal = parseFloat((amount * (parseFloat(item.productGST) / 100)).toFixed(2));
            const total = parseFloat((amount + gstVal).toFixed(2));
            const imageUrl =
              item.image ||
              (item.productId &&
                item.productId.images &&
                item.productId.images.length > 0
                ? item.productId.images[0]
                : "https://via.placeholder.com/150");

            console.log(`Rendering item ${index}: base rate = ${baseRate}, effective rate = ${effRate.toFixed(2)}`);
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
                <td className="p-2">{item.product}</td>
                <td className="p-2">
                  <EditableField
                    value={item.quantity.toString()}
                    onSave={(newVal) => {
                      const newQuantity = parseFloat(newVal);
                      if (!isNaN(newQuantity)) {
                        updateItemField(index, "quantity", newQuantity);
                      }
                    }}
                  />
                </td>
                <td className="p-2">
                  <EditableField
                    value={effRate.toFixed(2)}
                    onSave={(newVal) => {
                      const newEffRate = parseFloat(newVal);
                      if (!isNaN(newEffRate)) {
                        // Compute new base rate = new effective rate divided by margin factor
                        const newBaseRate = newEffRate / marginFactor;
                        console.log(
                          `Editing item ${index}: new effective rate = ${newEffRate}, computed new base rate = ${newBaseRate.toFixed(2)}`
                        );
                        // Update both rate and productprice to the new base rate
                        updateItemField(index, "rate", parseFloat(newBaseRate.toFixed(2)));
                        updateItemField(index, "productprice", parseFloat(newBaseRate.toFixed(2)));
                      }
                    }}
                  />
                </td>
                <td className="p-2">{amount.toFixed(2)}</td>
                <td className="p-2">
                  <EditableField
                    value={item.productGST.toString()}
                    onSave={(newVal) => {
                      const newGST = parseFloat(newVal);
                      if (!isNaN(newGST)) {
                        updateItemField(index, "productGST", newGST);
                      }
                    }}
                  />%
                </td>
                <td className="p-2">{total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mb-6 text-lg font-bold">
        <p>Total Amount: ₹{computedAmount(editableQuotation).toFixed(2)}</p>
        <p>Grand Total (with GST): ₹{computedTotal(editableQuotation).toFixed(2)}</p>
      </div>

      <div className="p-2 italic font-bold text-blue-600 border text-center">
        Rates may vary in case there is a change in specifications / quantity / timelines
      </div>
    </div>
  );
}

// Reusable inline editing component
function EditableField({ value, onSave }) {
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
        type="text"
        className="border p-1 rounded"
        autoFocus
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
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
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4h2M12 5v6m-7 7h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}

// Helper functions to compute totals
function computedAmount(quotation) {
  let sum = 0;
  quotation.items.forEach((item) => {
    const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
    const baseRate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    sum += baseRate * marginFactor * quantity;
  });
  return sum;
}

function computedTotal(quotation) {
  let sum = 0;
  quotation.items.forEach((item) => {
    const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
    const baseRate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const amount = baseRate * marginFactor * quantity;
    const gstVal = parseFloat((amount * (parseFloat(item.productGST) / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}
