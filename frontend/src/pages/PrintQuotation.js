// frontend/src/pages/PrintQuotation.js
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import html2pdf from "html2pdf.js";

export default function PrintQuotation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  async function fetchQuotation() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      // Sanitize items to ensure valid fields
      const sanitizedItems = (data.items || []).map((item, idx) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 1,
        slNo: item.slNo || idx + 1,
        rate: parseFloat(item.rate) || 0,
        productGST: parseFloat(item.productGST),
        product: item.product || "Unknown Product",
      }));
      setQuotation({ ...data, items: sanitizedItems });
      setError(null);
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError("Failed to load quotation");
    } finally {
      setLoading(false);
    }
  }

  const handleExportPDF = () => {
    const element = document.getElementById("printable");
    const clonedElement = element.cloneNode(true);
    clonedElement.querySelectorAll(".no-print").forEach((el) => el.remove());

    const opt = {
      margin: 0.2,
      filename: `Quotation-${quotation?.quotationNumber || "Unknown"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 7, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(clonedElement).save();
  };

  if (loading) {
    return <div className="p-6 text-gray-400">Loading quotation...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }
  if (!quotation) {
    return <div className="p-6 text-gray-400">Quotation not found.</div>;
  }

  const marginFactor = 1 + (parseFloat(quotation.margin) || 0) / 100;

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
            .footer-block {
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-before: auto;
              margin-top: 1in;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handleExportPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Export to PDF
        </button>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs text-gray-600">
            {new Date(quotation.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="mt-1">
            <div className="text-lg font-bold">
              Quotation No.: {quotation.quotationNumber || "N/A"}
            </div>
            <div className="text-xs">GSTIN: 29ABCFA9924A1ZL</div>
          </div>
        </div>
        <div>
          <img
            src="/logo.png"
            alt="Logo"
            className="h-16 w-auto"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      <div className="mt-4">
        {quotation.customerName && (
          <div className="text-base font-bold">
            {quotation.salutation || "Mr."} {quotation.customerName}
          </div>
        )}
        <div className="text-xs">{quotation.customerCompany || ""}</div>
        <div className="text-xs">{quotation.customerAddress || ""}</div>
      </div>

      <div className="mt-4">
        <div className="text-md font-bold">
          Quotation: {quotation.catalogName || "Goodies"}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border px-1 py-1">Sl. No.</th>
              <th className="border px-1 py-1">Image</th>
              <th className="border px-1 py-1">Product</th>
              {quotation.displayHSNCodes && (
                <th className="border px-1 py-1">HSN</th>
              )}
              <th className="border px-1 py-1">Quantity</th>
              <th className="border px-1 py-1 text-right">Rate (with margin)</th>
              <th className="border px-1 py-1 text-right">Amount</th>
              <th className="border px-1 py-1 text-right">GST (%)</th>
              <th className="border px-1 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, idx) => {
              const baseRate = parseFloat(item.rate) || 0;
              const quantity = parseFloat(item.quantity) || 1;
              const effRate = baseRate * marginFactor;
              const amount = effRate * quantity;
              const gstPercent = parseFloat(item.productGST);
              const gstAmt = parseFloat((amount * (gstPercent / 100)).toFixed(2));
              const total = parseFloat((amount + gstAmt).toFixed(2));
              const imageUrl = item.productId?.images?.[item.imageIndex] || "https://via.placeholder.com/150";
              const hsnCode = item.hsnCode || item.productId?.hsnCode || "N/A";

              return (
                <tr key={idx}>
                  <td className="border px-1 py-1 text-center">{item.slNo}</td>
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
                  {quotation.displayHSNCodes && (
                    <td className="border px-1 py-1 text-center">{hsnCode}</td>
                  )}
                  <td className="border px-1 py-1 text-center">{quantity}</td>
                  <td className="border px-1 py-1 text-right">
                    ₹{effRate.toFixed(2)}
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

      {quotation.displayTotals && (
        <div className="mt-4 text-right">
          <div className="text-base font-bold">
            Total Amount: ₹{computedAmount(quotation).toFixed(2)}
          </div>
          <div className="text-base font-bold">
            Grand Total (with GST): ₹{computedTotal(quotation).toFixed(2)}
          </div>
        </div>
      )}

      <div className="mt-4 border-t pt-2">
        <div className="p-1 italic font-bold text-xs text-blue-600 border text-center mt-2">
          Product subject to availability at the time of order confirmation
        </div>
        {quotation.terms?.length > 0 &&
          quotation.terms.map((term, idx) => (
            <div key={idx} className="mb-1">
              <div className="font-bold text-xs">{term.heading}:</div>
              <div className="text-xs">{term.content}</div>
            </div>
          ))}

        <div className="p-1 italic font-bold text-xs text-blue-600 border text-center mb-2">
          Rates may vary in case there is a change in specifications / quantity / timelines
        </div>
      </div>

      <div className="footer-block mt-8 flex justify-between items-start break-inside-avoid">
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
    const gst = parseFloat(item.productGST);
    const gstVal = parseFloat((amount * (gst / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}