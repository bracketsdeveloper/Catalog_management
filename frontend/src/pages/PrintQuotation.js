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
      const sanitizedItems = (data.items || [])
        .filter((item) => item.product && parseFloat(item.quantity) > 0 && parseFloat(item.rate) > 0)
        .map((item, idx) => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          slNo: item.slNo || idx + 1,
          rate: parseFloat(item.rate) || 0,
          productGST: parseFloat(item.productGST) || 0,
          product: item.product || "Unknown Product",
        }));
      console.log("Sanitized items:", sanitizedItems);
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

    // Scale down images by 30%
    clonedElement.querySelectorAll("img").forEach((img) => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      img.style.width = `${originalWidth * 0.7}px`;
      img.style.height = `${originalHeight * 0.7}px`;
    });

    const opt = {
      margin: [10, 5, 10, 5], // margins in mm (top, right, bottom, left)
      filename: `Quotation-${quotation?.quotationNumber || ""} (${quotation?.customerCompany || ""}).pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        allowTaint: true
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after'
      }
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
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            .print-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .header-section {
              page-break-after: avoid;
              margin-bottom: 0.2in !important;
            }
            .customer-info {
              margin-bottom: 0.1in !important;
            }
            .table-container {
              width: 100%;
              overflow: visible !important;
            }
            table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              margin-top: 0.1in !important;
              page-break-inside: auto;
            }
            thead {
              display: table-header-group;
            }
            tbody tr {
              page-break-inside: avoid;
              page-break-after: auto;
              height: 0.3in !important;
            }
            td, th {
              padding: 2px !important;
              font-size: 9pt !important;
            }
            img {
              max-height: 0.7in !important;
              max-width: 1.4in !important;
              object-fit: contain !important;
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

      <div className="print-section header-section">
        <div className="flex justify-between items-start" style={{ marginBottom: '0.1in' }}>
          <div>
            <div className="text-xs text-gray-600" style={{ fontSize: '9pt' }}>
              {new Date(quotation.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="mt-1" style={{ marginTop: '0.05in' }}>
              <div className="text-lg font-bold" style={{ fontSize: '12pt' }}>
                Quotation No.: {quotation.quotationNumber || "N/A"}
              </div>
              <div className="text-xs" style={{ fontSize: '9pt' }}>GSTIN: 29ABCFA9924A1ZL</div>
            </div>
          </div>
          <div>
            <img
              src="/logo.png"
              alt="Logo"
              style={{ height: '0.5in', width: 'auto' }}
              crossOrigin="anonymous"
            />
          </div>
        </div>

        <div className="customer-info" style={{ marginBottom: '0.1in' }}>
          {quotation.customerName && (
            <div className="text-base font-bold" style={{ fontSize: '11pt' }}>
              {quotation.salutation || "Mr."} {quotation.customerName}
            </div>
          )}
          <div className="text-xs" style={{ fontSize: '9pt' }}>{quotation.customerCompany || ""}</div>
          <div className="text-xs" style={{ fontSize: '9pt' }}>{quotation.customerAddress || ""}</div>
        </div>

        <div className="text-md font-bold" style={{ fontSize: '11pt', marginBottom: '0.1in' }}>
          Quotation: {quotation.catalogName || "Goodies"}
        </div>
      </div>

      <div className="print-section table-container mt-4">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border px-2 py-2 text-center">Sl. No.</th>
              <th className="border px-2 py-2 text-center image-cell">Image</th>
              <th className="border px-2 py-2 text-center product-cell">Product</th>
              {quotation.displayHSNCodes && (
                <th className="border px-2 py-2 text-center hsn-cell">HSN</th>
              )}
              <th className="border px-2 py-2 text-center quantity-cell">Quantity</th>
              <th className="border px-2 py-2 text-center rate-cell">Rate</th>
              <th className="border px-2 py-2 text-center amount-cell">Amount</th>
              <th className="border px-2 py-2 text-center gst-cell">GST (%)</th>
              <th className="border px-2 py-2 text-center total-cell">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, idx) => {
              const baseRate = parseFloat(item.rate) || 0;
              const quantity = parseFloat(item.quantity) || 1;
              const effRate = baseRate * marginFactor;
              const amount = effRate * quantity;
              const gstPercent = parseFloat(item.productGST) || 0;
              const gstAmt = parseFloat((amount * (gstPercent / 100)).toFixed(2));
              const total = parseFloat((amount + gstAmt).toFixed(2));
              const imageUrl = item.productId?.images?.[item.imageIndex] || "https://via.placeholder.com/150";
              const hsnCode = item.hsnCode || item.productId?.hsnCode || "N/A";

              return (
                <tr key={idx} className="print-section">
                  <td className="border px-2 py-2 text-center">{item.slNo}</td>
                  <td className="border px-2 py-2 text-center image-cell">
                    {imageUrl !== "https://via.placeholder.com/150" ? (
                      <img
                        src={imageUrl}
                        alt={item.product}
                        className="mx-auto"
                        crossOrigin="anonymous"
                        style={{ 
                          maxWidth: '3.136in', 
                          maxHeight: '1.8in',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <span className="text-xs">No Image</span>
                    )}
                  </td>
                  <td className="border px-2 py-2 text-center product-cell">{item.product}</td>
                  {quotation.displayHSNCodes && (
                    <td className="border px-2 py-2 text-center hsn-cell">{hsnCode}</td>
                  )}
                  <td className="border px-2 py-2 text-center quantity-cell">{quantity}</td>
                  <td className="border px-2 py-2 text-center rate-cell">
                    ₹{effRate.toFixed(2)}
                  </td>
                  <td className="border px-2 py-2 text-center amount-cell">
                    ₹{amount.toFixed(2)}
                  </td>
                  <td className="border px-2 py-2 text-center gst-cell">{gstPercent}%</td>
                  <td className="border px-2 py-2 text-center total-cell">
                    ₹{total.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {quotation.displayTotals && (
        <div className="print-section mt-4 text-right">
          <div className="text-base font-bold">
            Total Amount: ₹{computedAmount(quotation).toFixed(2)}
          </div>
          <div className="text-base font-bold">
            Grand Total (with GST): ₹{computedTotal(quotation).toFixed(2)}
          </div>
        </div>
      )}

      <div className="print-section mt-4 border-t pt-2">
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

      <div className="print-section footer-block mt-8 flex justify-between items-start">
        <div className="flex flex-col">
          <div className="text-xl font-bold">For Ace Print Pack</div>
          <div className="mt-2">
            <img
              src="/signature.png"
              alt="Signature"
              style={{ height: '0.8in', width: 'auto' }}
              crossOrigin="anonymous"
            />
          </div>
          <h2>Neeraj Dinodia</h2>
        </div>
        <div>
          <img
            src="/address.png"
            alt="Address"
            style={{ height: '1.2in', width: 'auto' }}
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
    const gst = parseFloat(item.productGST) || 0;
    const gstVal = parseFloat((amount * (gst / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}