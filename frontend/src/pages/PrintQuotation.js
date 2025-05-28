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
          product: item.product || "",
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

    clonedElement.querySelectorAll(".product-image").forEach((img) => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const aspectRatio = naturalWidth / naturalHeight;
      
      const maxWidth = 200;
      const maxHeight = 150;

      let width = naturalWidth;
      let height = naturalHeight;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      img.style.width = `${width}px`;
      img.style.height = `${height}px`;
    });

    const opt = {
      margin: [5, 5, 5, 5],
      filename: `Quotation-${quotation?.quotationNumber || ""} (${quotation?.customerCompany || ""}).pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 3,
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

  if (loading) return <div className="p-6 text-gray-400">Loading quotation...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!quotation) return <div className="p-6 text-gray-400">Quotation not found.</div>;

  const marginFactor = 1 + (parseFloat(quotation.margin) || 0) / 100;

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white shadow-md" id="printable">
      <style>
        {`
          @media print {
            body { 
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact;
            }
            .no-print { display: none !important; }
            .print-section { page-break-inside: avoid; }
            table { border-color: #666 !important; }
            
            .company-header {
              border-bottom: 1px solid #ccc;
              padding-bottom: 0.1in;
              margin-bottom: 0.15in;
            }
            
            .table-container td, .table-container th {
              padding: 2px 3px !important;
              font-size: 6pt !important;
            }
            
            .product-image {
              max-width: 2.5in !important;
              max-height: 2in !important;
              width: auto !important;
              height: auto !important;
              object-fit: contain !important;
              display: block !important;
              margin: 0 auto !important;
            }
            
            .image-cell { width: auto !important; min-width: 1.5in !important; }
            .product-cell { width: 20% !important; }
            .hsn-cell { width: 10% !important; }
            .quantity-cell { width: 7% !important; }
            .rate-cell { width: 10% !important; }
            .amount-cell { width: 10% !important; }
            .gst-cell { width: 8% !important; }
            .total-cell { width: 12% !important; }
            
            .footer-block {
              position: absolute;
              bottom: 0.2in;
              width: 100%;
            }
          }

          .table-container table {
            font-size: 0.7rem !important;
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
        <div className="company-header">
          <div className="text-lg font-bold" style={{ fontSize: '14pt' }}>
            Ace Print Pack • Ace Gifting Solutions
          </div>
          <div className="text-xs mt-1" style={{ lineHeight: '1.2', color: '#555' }}>
            #61, 1st Floor, 5th Main Road, Chamrajpet, Bangalore - 560018<br />
            Phone: +91 96200 12727 | Email: info@aceprintpack.com
          </div>
        </div>

        <div className="flex justify-between items-start mt-2">
          <div>
            <div className="text-xs" style={{ fontSize: '9pt' }}>
              Date: {new Date(quotation.createdAt).toLocaleDateString("en-IN")}
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold" style={{ fontSize: '12pt' }}>
                Quotation No: {quotation.quotationNumber}
              </div>
              <div className="text-xs">GSTIN: 29ABCFA9924A1ZL</div>
            </div>
          </div>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ height: '0.6in', width: 'auto' }}
            crossOrigin="anonymous"
          />
        </div>

        <div className="customer-info mt-3">
          <div className="text-sm font-bold" style={{ fontSize: '12pt' }}>
            {quotation.salutation || ""} {quotation.customerName}
          </div>
          <div className="text-xs">{quotation.customerCompany}</div>
          <div className="text-xs">{quotation.customerAddress}</div>
        </div>
      </div>

      <div className="print-section table-container mt-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-center">Sl. No.</th>
              <th className="border px-2 py-1 text-center image-cell">Image</th>
              <th className="border px-2 py-1 text-center hsn-cell">HSN</th>
              <th className="border px-2 py-1 text-center product-cell">Product</th>
              <th className="border px-2 py-1 text-center quantity-cell">Qty</th>
              <th className="border px-2 py-1 text-center rate-cell">Rate</th>
              <th className="border px-2 py-1 text-center amount-cell">Amount</th>
              <th className="border px-2 py-1 text-center gst-cell">GST (%)</th>
              <th className="border px-2 py-1 text-center total-cell">Total</th>
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
              const imageUrl = item.productId?.images?.[item.imageIndex] || "";
              const hsnCode = item.hsnCode || item.productId?.hsnCode || "";

              return (
                <tr key={idx}>
                  <td className="border px-2 py-1 text-center">{item.slNo}</td>
                  <td className="border px-2 py-1 text-center image-cell">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={item.product}
                        className="product-image"
                        style={{ 
                          maxWidth: '200px',
                          maxHeight: '150px',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain'
                        }}
                        crossOrigin="anonymous"
                      />
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center hsn-cell">{hsnCode}</td>
                  <td className="border px-2 py-1 text-center product-cell">{item.product}</td>
                  <td className="border px-2 py-1 text-center quantity-cell">{quantity}</td>
                  <td className="border px-2 py-1 text-center rate-cell">₹{effRate.toFixed(2)}</td>
                  <td className="border px-2 py-1 text-center amount-cell">₹{amount.toFixed(2)}</td>
                  <td className="border px-2 py-1 text-center gst-cell">{gstPercent}%</td>
                  <td className="border px-2 py-1 text-center total-cell">₹{total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {quotation.displayTotals && (
        <div className="print-section mt-4 text-right">
          <div className="text-sm font-bold">
            Total Amount: ₹{computedAmount(quotation).toFixed(2)}
          </div>
          <div className="text-sm font-bold">
            Grand Total (with GST): ₹{computedTotal(quotation).toFixed(2)}
          </div>
        </div>
      )}

      <div className="print-section mt-4 border-t pt-2">
        <div className="text-xs italic text-center py-1 border">
          Product subject to availability at the time of order confirmation
        </div>
        {quotation.terms?.length > 0 &&
          quotation.terms.map((term, idx) => (
            <div key={idx} className="mb-1">
              <div className="font-bold text-xs">{term.heading}:</div>
              <div className="text-xs">{term.content}</div>
            </div>
          ))}
      </div>

      <div className="print-section footer-block mt-8">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="text-sm font-bold">For Ace Print Pack</div>
            <img
              src="/signature.png"
              alt="Signature"
              style={{ height: '0.8in', width: 'auto', margin: '0.1in 0' }}
              crossOrigin="anonymous"
            />
            <div className="text-xs">Authorized Signatory</div>
          </div>
          
          <div className="text-xs text-right" style={{ color: '#555' }}>
            <div className="font-bold">Office Address:</div>
            #61, 1st Floor, 5th Main Road<br />
            Chamrajpet, Bangalore - 560018<br />
            Phone: +91 96200 12727<br />
            Email: info@aceprintpack.com
          </div>
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
    const marginFactor = 1 + (parseFloat(quotation.margin) || 0) / 100;
    sum += baseRate * marginFactor * quantity;
  });
  return sum;
}

function computedTotal(quotation) {
  let sum = 0;
  (quotation.items || []).forEach((item) => {
    const quantity = parseFloat(item.quantity) || 1;
    const baseRate = parseFloat(item.rate) || 0;
    const marginFactor = 1 + (parseFloat(quotation.margin) || 0) / 100;
    const amount = baseRate * marginFactor * quantity;
    const gst = parseFloat(item.productGST) || 0;
    const gstVal = parseFloat((amount * (gst / 100)).toFixed(2));
    sum += amount + gstVal;
  });
  return sum;
}