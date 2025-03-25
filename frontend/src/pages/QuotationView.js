"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// EditableCell for inline editing
// function EditableCell({ value, onSave }) {
//   const [editing, setEditing] = useState(false);
//   const [currentValue, setCurrentValue] = useState(value);

//   useEffect(() => {
//     setCurrentValue(value);
//   }, [value]);

//   const handleDoubleClick = () => setEditing(true);
//   const handleBlur = () => {
//     setEditing(false);
//     onSave(currentValue);
//   };

//   return editing ? (
//     <input
//       type="text"
//       className="border p-1 rounded"
//       autoFocus
//       value={currentValue}
//       onChange={(e) => setCurrentValue(e.target.value)}
//       onBlur={handleBlur}
//     />
//   ) : (
//     <div onDoubleClick={handleDoubleClick}>{currentValue}</div>
//   );
// }

export default function QuotationView() {
  const { id } = useParams();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [quotation, setQuotation] = useState(null);
  const [editableQuotation, setEditableQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  async function fetchQuotation() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
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

  function handleHeaderBlur(field, e) {
    setEditableQuotation((prev) => ({
      ...prev,
      [field]: e.target.innerText
    }));
  }

  function updateItemField(index, field, newValue) {
    setEditableQuotation((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: newValue };
      return { ...prev, items: newItems };
    });
  }

  function handleAddEmail() {
    const email = window.prompt("Enter customer email:");
    if (email) {
      setEditableQuotation((prev) => ({
        ...prev,
        customerEmail: email
      }));
    }
  }

  async function handleSaveQuotation() {
    if (!editableQuotation) return;
    try {
      const token = localStorage.getItem("token");
      const updatedMargin = parseFloat(editableQuotation.margin) || 0;
      const body = { ...editableQuotation, margin: updatedMargin };
      const res = await fetch(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        throw new Error("Update failed");
      }
      alert("Quotation updated!");
      fetchQuotation();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes");
    }
  }

  async function handleExportWord() {
    if (!editableQuotation) return;
    try {
      const token = localStorage.getItem("token");
      const url = `${BACKEND_URL}/api/admin/quotations/${editableQuotation._id}/export-word`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error("Export doc request failed");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Quotation-${editableQuotation.quotationNumber || "NoNumber"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export .docx");
    }
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

  // Compute margin factor
  const marginFactor = 1 + ((parseFloat(editableQuotation.margin) || 0) / 100);

  // Compute totals from items
  let computedAmount = 0;
  let computedTotal = 0;
  editableQuotation.items.forEach((item) => {
    const baseRate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const effRate = baseRate * marginFactor;
    const amount = effRate * quantity;
    const total = amount * 1.18;
    computedAmount += amount;
    computedTotal += total;
  });

  return (
    <div className="p-6 bg-white text-black min-h-screen">
      {/* Top Buttons */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleExportWord}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Export to Word
        </button>
        <button
          onClick={handleSaveQuotation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Save Changes
        </button>
      </div>

      {/* Header: Date and GSTIN */}
      <div className="mb-4 flex justify-between items-center text-sm">
        <div>
          {editableQuotation.createdAt
            ? new Date(editableQuotation.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })
            : new Date().toLocaleDateString()}
        </div>
        <div>GSTIN: 29ABCFA9924A1ZL</div>
      </div>

      {/* Quotation Number */}
      <div className="text-xl font-bold mb-2">
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => handleHeaderBlur("quotationNumber", e)}
        >
          Quotation No.: {editableQuotation.quotationNumber}
        </span>
      </div>

      {/* Customer & Catalog Details */}
      <div className="mb-4 space-y-2">
        <div>
          Mr/Mrs.{" "}
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerName", e)}
          >
            {editableQuotation.customerName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Email:</span>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("customerEmail", e)}
          >
            {editableQuotation.customerEmail}
          </span>
          {!editableQuotation.customerEmail && (
            <button
              onClick={handleAddEmail}
              className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
            >
              +
            </button>
          )}
        </div>
        <div>
          Quotation:{" "}
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("catalogName", e)}
          >
            {editableQuotation.catalogName}
          </span>
        </div>
        <div>
          Margin:{" "}
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleHeaderBlur("margin", e)}
          >
            {editableQuotation.margin}
          </span>
          %
        </div>
      </div>

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
            <th className="p-2 text-left">GST (18%)</th>
            <th className="p-2 text-left">Total</th>
          </tr>
        </thead>
        <tbody>
          {editableQuotation.items.map((item, index) => {
            const baseRate = parseFloat(item.rate) || 0;
            const quantity = parseFloat(item.quantity) || 0;
            const effRate = baseRate * marginFactor;
            const amount = effRate * quantity;
            const gst = parseFloat((amount * 0.18).toFixed(2));
            const total = parseFloat((amount + gst).toFixed(2));
            // Use item.image if available; otherwise try item.productId.images[0]
            const imageUrl =
              item.image ||
              (item.productId &&
                item.productId.images &&
                item.productId.images.length > 0
                ? item.productId.images[0]
                : "https://via.placeholder.com/150");
            return (
              <tr key={index} className="border-b">
                <td className="p-2">
                  <EditableCell
                    value={item.slNo}
                    onSave={(val) => updateItemField(index, "slNo", val)}
                  />
                </td>
                <td className="p-2">
                  {imageUrl !== "https://via.placeholder.com/150" ? (
                    <img
                      src={imageUrl}
                      alt={item.product}
                      className="w-16 h-16 object-cover"
                    />
                  ) : (
                    "No Image"
                  )}
                </td>
                <td className="p-2">
                  <EditableCell
                    value={item.product}
                    onSave={(val) => updateItemField(index, "product", val)}
                  />
                </td>
                <td className="p-2">
                  <EditableCell
                    value={item.quantity}
                    onSave={(val) => updateItemField(index, "quantity", val)}
                  />
                </td>
                <td className="p-2">
                  <EditableCell
                    value={effRate.toFixed(2)}
                    onSave={(newVal) => {
                      const newBaseRate = parseFloat(newVal) / marginFactor;
                      updateItemField(index, "rate", newBaseRate.toFixed(2));
                    }}
                  />
                </td>
                <td className="p-2">₹{amount.toFixed(2)}</td>
                <td className="p-2">₹{gst.toFixed(2)}</td>
                <td className="p-2">₹{total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Display computed totals */}
      <div className="mb-6 text-lg font-bold">
        <p>Total Amount: ₹{computedAmount.toFixed(2)}</p>
        <p>Grand Total (with GST): ₹{computedTotal.toFixed(2)}</p>
      </div>

      {/* Additional Quotation Details */}
      <div className="mb-6 text-sm space-y-2">
        <p>
          <strong>Delivery:</strong> 10 – 12 Working days upon order confirmation.
          Single delivery to Hyderabad office included in the cost.
        </p>
        <p><strong>Branding:</strong> As mentioned above.</p>
        <p><strong>Payment Terms:</strong> Within 30 days upon delivery.</p>
        <p><strong>Quote Validity:</strong> The quote is valid only for 6 days from the date of quotation.</p>
        <p>
          <strong>Note:</strong> Rates may vary if specifications, quantity, or timelines change.
        </p>
      </div>

      <div className="mt-8 text-sm">
        <p>For Ace Print Pack</p>
        <p className="mt-2">Neeraj Dinodia</p>
      </div>
    </div>
  );
}

function EditableCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleDoubleClick = () => setEditing(true);
  const handleBlur = () => {
    setEditing(false);
    onSave(currentValue);
  };

  return editing ? (
    <input
      type="text"
      className="border p-1 rounded"
      autoFocus
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleBlur}
    />
  ) : (
    <div onDoubleClick={handleDoubleClick}>{currentValue}</div>
  );
}
