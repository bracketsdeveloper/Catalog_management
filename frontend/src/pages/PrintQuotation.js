"use client";

import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";

export default function PrintQuotation() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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

  // Calculates subtotal (before GST) across all items
  function computedAmount(quotation) {
    let sum = 0;
    quotation.items.forEach((item) => {
      const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
      const baseRate = parseFloat(item.rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const amount = baseRate * marginFactor * quantity;
      sum += amount;
    });
    return sum;
  }

  // Calculates total with GST across all items
  function computedTotal(quotation) {
    let sum = 0;
    quotation.items.forEach((item) => {
      const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
      const baseRate = parseFloat(item.rate) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const amount = baseRate * marginFactor * quantity;
      const gstPercent = parseFloat(item.productGST) || 0;
      const gstVal = parseFloat((amount * (gstPercent / 100)).toFixed(2));
      sum += amount + gstVal;
    });
    return sum;
  }

  // Exports the quotation to PDF using html2pdf.js
  const handleExportPDF = () => {
    const element = document.getElementById("printable");
    // Clone the DOM so we can remove .no-print elements
    const clonedElement = element.cloneNode(true);
    clonedElement.querySelectorAll(".no-print").forEach((el) => el.remove());

    const opt = {
      margin: 0.2, // 0.2 inches
      filename: `Quotation-${
        editableQuotation?.quotationNumber || "Unknown"
      }.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 7, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(clonedElement).save();
  };

  // Loading or error states
  if (loading) {
    return <div className="p-6 text-gray-400">Loading quotation...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }
  if (!editableQuotation) {
    return <div className="p-6 text-gray-400">Quotation not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white shadow-md" id="printable">
      <style>
        {`
          @page {
            size: A4;
            margin: 5mm 5mm 5mm 5mm;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            /* Ensure the footer doesn't get split across pages */
            .footer-block {
              page-break-inside: avoid; /* older spec */
              break-inside: avoid;      /* newer spec */
              page-break-before: auto;  /* Allow page break before if needed */
              margin-top: 1in;         /* Add space to push footer if near page bottom */
            }
            /* Ensure table rows don't break across pages */
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}
      </style>

      {/* A top export button (hidden on print) */}
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handleExportPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Export to PDF
        </button>
      </div>

      {/* Header section with date, Quotation no, and a logo */}
      <div className="flex justify-between items-start">
        {/* Left side: Date and Quotation info */}
        <div>
          <div className="text-xs text-gray-600">
            {new Date(editableQuotation.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="mt-1">
            <div className="text-lg font-bold">
              Quotation No.: {editableQuotation.quotationNumber}
            </div>
            <div className="text-xs">GSTIN : 29ABCFA9924A1ZL</div>
          </div>
        </div>

        {/* Right side: Your company logo (optional) */}
        <div>
          <img
            src="/logo.png"
            alt="Logo"
            className="h-16 w-auto"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* Customer Info */}
      <div className="mt-4">
        <div className="text-base font-bold">
          {/* Salutation plus customer name here */}
          {editableQuotation.salutation} {editableQuotation.customerName}
        </div>
        <div className="text-xs">{editableQuotation.customerCompany}</div>
        <div className="text-xs">{editableQuotation.customerAddress}</div>
        {/* <div className="text-xs">
          Email: {editableQuotation.customerEmail || "N/A"}
        </div> */}
      </div>

      {/* Quotation Title */}
      <div className="mt-4">
        <div className="text-md font-bold">
          Quotation:{" "}
          {editableQuotation.catalogName
            ? editableQuotation.catalogName
            : "Goodies"}
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border px-1 py-1">Sl. No.</th>
              <th className="border px-1 py-1">Image</th>
              <th className="border px-1 py-1">Product</th>
              <th className="border px-1 py-1">HSN</th>
              <th className="border px-1 py-1">Quantity</th>
              <th className="border px-1 py-1 text-right">Rate</th>
              <th className="border px-1 py-1 text-right">Amount</th>
              <th className="border px-1 py-1 text-right">GST (%)</th>
              <th className="border px-1 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {editableQuotation.items.map((item, idx) => {
              const marginFactor =
                1 + ((parseFloat(editableQuotation.margin) || 0) / 100);
              const qty = Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const amount = rate * marginFactor * qty;

              const gstPercent = parseFloat(item.productGST) || 0;
              const gstAmt = parseFloat((amount * (gstPercent / 100)).toFixed(2));
              const total = amount + gstAmt;

              const imageUrl = getImageUrl(item);
                const hsnCode =
              (item.productId && item.productId.hsnCode) ||
              item.hsnCode ||
              "N/A";

              return (
                <tr key={idx}>
                  <td className="border px-1 py-1 text-center">{idx + 1}</td>
                  <td className="border px-1 py-1 text-center">
                    {imageUrl !== "https://via.placeholder.com/150" ? (
                      <img
                        src={imageUrl}
                        alt={item.product}
                        className="h-10 w-auto mx-auto"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span className="text-xs">No Image</span>
                    )}
                  </td>
                  <td className="border px-1 py-1">{item.product}</td>
                  <td className="border px-1 py-1 text-center">{hsnCode}</td>
                  <td className="border px-1 py-1 text-center">{qty}</td>
                  <td className="border px-1 py-1 text-right">
                    ₹{rate.toFixed(2)}
                  </td>
                  <td className="border px-1 py-1 text-right">
                    ₹{amount.toFixed(2)}
                  </td>
                  <td className="border px-1 py-1 text-right">{gstPercent}%</td>
                  <td className="border px-1 py-1 text-right">
                    ₹{total.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals (only if displayTotals is true) */}
      {editableQuotation.displayTotals && (
        <div className="mt-4 text-right">
          <div className="text-base font-bold">
            Total Amount: ₹{computedAmount(editableQuotation).toFixed(2)}
          </div>
          <div className="text-base font-bold">
            Grand Total (with GST): ₹{computedTotal(editableQuotation).toFixed(2)}
          </div>
        </div>
      )}

      {/* Additional Info, Terms, etc. */}
      <div className="mt-4 border-t pt-2">
        <div className="p-1 italic font-bold text-xs text-blue-600 border text-center mt-2">
          Product subject to availability at the time of order confirmation
        </div>
        {editableQuotation.terms &&
          editableQuotation.terms.length > 0 &&
          editableQuotation.terms.map((term, idx) => (
            <div key={idx} className="mb-1">
              <div className="font-bold text-xs">{term.heading}:</div>
              <div className="text-xs">{term.content}</div>
            </div>
          ))}

        <div className="p-1 italic font-bold text-xs text-blue-600 border text-center mb-2">
          Rates may vary in case there is a change in specifications / quantity / timelines
        </div>
      </div>

      {/* Footer block: .footer-block to avoid page-break inside */}
      <div className="footer-block mt-8 flex justify-between items-start break-inside-avoid">
        {/* Left column: For Ace Print Pack + Signature */}
        <div className="flex flex-col">
          <div className="text-xl font-bold">For Ace Print Pack</div>
          <div className="mt-2">
            <img
              src="/signature.png"
              alt="Signature"
              className="h-20 w-auto"
              crossOrigin="anonymous"
            />
          </div>
          <h2>Neeraj Dinodia</h2>
        </div>
        {/* Right column: an address image (or any other info you want) */}
        <div>
          <img
            src="/address.png"
            alt="Address"
            className="h-32 w-auto"
            crossOrigin="anonymous"
          />
        </div>
      </div>
    </div>
  );
}

// Helper to get item image URL
function getImageUrl(item) {
  if (item.image) return item.image;
  if (item.productId?.images?.length > 0) {
    return item.productId.images[0];
  }
  return "https://via.placeholder.com/150";
}

/**
 * computeAmount: returns the subtotal (before GST) across all items 
 */
export function computedAmount(quotation) {
  let sum = 0;
  quotation.items.forEach((item) => {
    const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
    const baseRate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const amount = baseRate * marginFactor * quantity;
    sum += amount;
  });
  return sum;
}

/**
 * computedTotal: returns the total with GST across all items
 */
export function computedTotal(quotation) {
  let sum = 0;
  quotation.items.forEach((item) => {
    const marginFactor = 1 + ((parseFloat(quotation.margin) || 0) / 100);
    const baseRate = parseFloat(item.rate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const amount = baseRate * marginFactor * quantity;
    const gstPercent = parseFloat(item.productGST) || 0;
    const gstVal = parseFloat((amount * (gstPercent / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}