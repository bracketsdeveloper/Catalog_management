import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export default function QuotationView() {
  const { id } = useParams();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [quotation, setQuotation] = useState(null);
  const [editableQuotation, setEditableQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTerm, setNewTerm] = useState({ heading: "", content: "" });
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermIdx, setEditingTermIdx] = useState(null);

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

  function handleAddTerm() {
    if (newTerm.heading && newTerm.content) {
      setEditableQuotation((prev) => ({
        ...prev,
        terms: [...prev.terms, newTerm]
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
      terms: updatedTerms
    }));
    setTermModalOpen(false);
    setEditingTermIdx(null);
  }

  function handleAddCGST() {
    const cgst = window.prompt("Enter CGST value:");
    if (cgst && !isNaN(cgst)) {
      setEditableQuotation((prev) => ({
        ...prev,
        cgst: parseFloat(cgst),
        cgstAdded: true
      }));
    }
  }

  function handleAddSGST() {
    const sgst = window.prompt("Enter SGST value:");
    if (sgst && !isNaN(sgst)) {
      setEditableQuotation((prev) => ({
        ...prev,
        sgst: parseFloat(sgst),
        sgstAdded: true
      }));
    }
  }

  const handleExportPDF = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      // Load a custom font that supports the Indian Rupee symbol
      const fontUrl = '/fonts/DejaVuSans.ttf'; // Ensure this path is correct
      const fontBytes = await fetch(fontUrl).then(res => {
        if (!res.ok) {
          throw new Error('Failed to load font');
        }
        return res.arrayBuffer();
      });

      const customFont = await pdfDoc.embedFont(fontBytes);

      const page = pdfDoc.addPage([600, 800]);
      const fontSize = 12;
      const margin = 50;
      let yPosition = 750;

      // Header
      page.drawText(`Quotation No.: ${editableQuotation.quotationNumber}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 20;
      page.drawText(`GSTIN: ${editableQuotation.gst || '29ABCFA9924A1ZL'}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 40;
      page.drawText(`Date: ${new Date(editableQuotation.createdAt).toLocaleDateString()}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 40;

      // Customer Info
      page.drawText(`Customer Name: ${editableQuotation.customerName}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 20;
      page.drawText(`Email: ${editableQuotation.customerEmail || 'N/A'}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 40;

      // Table Header
      const tableHeader = "Sl. No. | Product | Quantity | Rate | Amount | GST | CGST | SGST | Total";
      page.drawText(tableHeader, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 20;

      // Table Data
      editableQuotation.items.forEach((item, idx) => {
        const amount = (parseFloat(item.rate) || 0) * (parseInt(item.quantity) || 0);
        const gstRate = editableQuotation.gst || 18;
        const gstAmount = amount * (gstRate / 100);
        const cgst = editableQuotation.cgst || 0;
        const sgst = editableQuotation.sgst || 0;
        const total = amount + gstAmount;
        
        const row = `${idx + 1} | ${item.product} | ${item.quantity} | ₹${item.rate} | ₹${amount.toFixed(2)} | ₹${gstAmount.toFixed(2)} | ₹${cgst.toFixed(2)} | ₹${sgst.toFixed(2)} | ₹${total.toFixed(2)}`;
        
        if (yPosition < 50) {
          page.drawText('-- Continued on next page --', {
            x: margin,
            y: 30,
            font: customFont,
            size: fontSize,
          });
          const newPage = pdfDoc.addPage([600, 800]);
          yPosition = 750;
          newPage.drawText(tableHeader, {
            x: margin,
            y: yPosition,
            font: customFont,
            size: fontSize,
          });
          yPosition -= 20;
        }
        
        page.drawText(row, { 
          x: margin, 
          y: yPosition, 
          font: customFont, 
          size: fontSize 
        });
        yPosition -= 20;
      });

      // Terms Section
      yPosition -= 20;
      page.drawText("Terms & Conditions:", { 
        x: margin, 
        y: yPosition, 
        font: customFont, 
        size: fontSize 
      });
      yPosition -= 20;
      
      editableQuotation.terms.forEach((term) => {
        if (yPosition < 50) {
          page.drawText('-- Continued on next page --', {
            x: margin,
            y: 30,
            font: customFont,
            size: fontSize,
          });
          const newPage = pdfDoc.addPage([600, 800]);
          yPosition = 750;
        }
        
        page.drawText(`${term.heading}: ${term.content}`, {
          x: margin,
          y: yPosition,
          font: customFont,
          size: fontSize,
        });
        yPosition -= 20;
      });

      // Footer
      const totalAmount = editableQuotation.items.reduce(
        (acc, item) => acc + (parseFloat(item.rate) * (parseInt(item.quantity) || 0)),
        0
      );
      const totalGST = totalAmount * ((editableQuotation.gst || 18) / 100);
      const grandTotal = totalAmount + totalGST;
      
      yPosition -= 20;
      page.drawText(`Total Amount: ₹${totalAmount.toFixed(2)}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 20;
      page.drawText(`GST (${editableQuotation.gst || 18}%): ₹${totalGST.toFixed(2)}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });
      yPosition -= 20;
      page.drawText(`Grand Total: ₹${grandTotal.toFixed(2)}`, {
        x: margin,
        y: yPosition,
        font: customFont,
        size: fontSize,
      });

      // Download PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quotation-${editableQuotation.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-400">Loading quotation...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }
  if (!editableQuotation) {
    return <div className="p-6 text-gray-400">Quotation not found.</div>;
  }

  const marginFactor = 1 + ((parseFloat(editableQuotation.margin) || 0) / 100);
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

      <div className="flex justify-end space-x-4 mb-4">
        {!editableQuotation.cgstAdded ? (
          <button
            onClick={handleAddCGST}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            + Add CGST
          </button>
        ) : (
          <button
            onClick={handleAddCGST}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Update CGST
          </button>
        )}
        {!editableQuotation.sgstAdded ? (
          <button
            onClick={handleAddSGST}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            + Add SGST
          </button>
        ) : (
          <button
            onClick={handleAddSGST}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Update SGST
          </button>
        )}
      </div>

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
            {editableQuotation.cgst !== 0 && (
              <th className="p-2 text-left">CGST</th>
            )}
            {editableQuotation.sgst !== 0 && (
              <th className="p-2 text-left">SGST</th>
            )}
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
            const imageUrl =
              item.image ||
              (item.productId &&
                item.productId.images &&
                item.productId.images.length > 0
                ? item.productId.images[0]
                : "https://via.placeholder.com/150");
            return (
              <tr key={index} className="border-b">
                <td className="p-2">{item.slNo}</td>
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
                <td className="p-2">{item.product}</td>
                <td className="p-2">
                  <EditableCell
                    value={item.quantity}
                    onSave={(val) => updateItemField(index, "quantity", val)}
                  />
                </td>
                <td className="p-2">{effRate.toFixed(2)}</td>
                <td className="p-2">{amount.toFixed(2)}</td>
                <td className="p-2">{editableQuotation.gst || "0.00"}%</td>
                {editableQuotation.cgst !== 0 && (
                  <td className="p-2">{editableQuotation.cgst || "0.00"}%</td>
                )}
                {editableQuotation.sgst !== 0 && (
                  <td className="p-2">{editableQuotation.sgst || "0.00"}%</td>
                )}
                <td className="p-2">{total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mb-6 text-lg font-bold">
        <p>Total Amount: ₹{computedAmount.toFixed(2)}</p>
        <p>Grand Total (with GST): ₹{computedTotal.toFixed(2)}</p>
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