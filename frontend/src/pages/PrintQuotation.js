
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

      const maxWidth = 150;
      const maxHeight = 100;

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
      margin: [30, 5, 40, 5], // Restored original margins
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
        mode: ['css'],
        avoid: ['.terms-section', '.footer-block'],
        before: '.page-break-before',
        after: ['.page-break-after', '.table-container tr:nth-child(4)'] // Break after 4th row
      }
    };

    html2pdf()
      .set(opt)
      .from(clonedElement)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const backgroundImage = "/templates/quotetemplate.png";

        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.addImage(
            backgroundImage,
            'JPEG',
            0, 0,
            210, 297,
            undefined, undefined,
            0,
            0.2
          );
        }
      })
      .save();
  };

  if (loading) return <div className="p-6 text-gray-400">Loading quotation...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!quotation) return <div className="p-6 text-gray-400">Quotation not found.</div>;

  const marginFactor = 1 + (parseFloat(quotation.margin) || 0) / 100;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount) => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

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
            .print-section { page-break-inside: auto; }
            .header-section { margin-bottom: 8px !important; }
            .customer-info { 
              page-break-after: auto !important;
              margin-bottom: 8px !important;
            }
            .table-container { 
              page-break-before: auto !important;
              margin-top: 0 !important;
            }
            .table-container tr:nth-child(4) { 
              page-break-after: always !important; /* Break after 4th row */
            }
            .table-container thead { 
              display: table-header-group; /* Headers only on first page */
            }
            table { border-color: #333 !important; border-width: 1.5px !important; }
            
            .company-header {
              border-bottom: 1px solid #ccc;
              padding-bottom: 0.1in;
              margin-bottom: 0.1in;
            }
            
            .table-container th {
              padding: 4px 3px !important;
              font-size: 8pt !important;
              font-family: Arial, Helvetica, sans-serif !important;
              color: #0C2D5E !important;
              white-space: nowrap !important;
              background-color: #E6F0FA !important;
              border: 1.5px solid #333 !important;
            }

            .table-container td {
              padding: 4px 3px !important;
              font-size: 8pt !important;
              font-family: Arial, Helvetica, sans-serif !important;
              color: #1A4A7B !important;
              border: 1.5px solid #333 !important;
            }
            
            .product-image {
              max-width: 1.5in !important;
              max-height: 1in !important;
              width: auto !important;
              height: auto !important;
              object-fit: contain !important;
              display: block !important;
              margin: 0 auto !important;
            }
            
            .image-cell { 
              width: auto !important; 
              min-width: 0.6in !important;
            }
            .sl-no-cell { width: 10% !important; }
            .product-cell { width: 25% !important; }
            .hsn-cell { width: 10% !important; }
            .quantity-cell { width: 7% !important; }
            .rate-cell { width: 10% !important; }
            .amount-cell { width: 10% !important; }
            .gst-cell { width: 10% !important; }
            .total-cell { width: 12% !important; }
            
            .footer-block {
              position: relative;
              margin-top: 0.5in;
              width: 100%;
              page-break-before: always !important; /* Footer on new page */
            }

            .bordered-text {
              font-family: Arial, Helvetica, sans-serif !important;
              font-size: 9pt !important;
              font-style: italic !important;
              color: #0C2D5E !important;
              text-align: center !important;
              border: 1.5px solid #333 !important;
              padding: 8px !important;
              margin: 8px auto !important;
              background-color: #E6F0FA !important;
              max-width: 90%;
              display: block;
            }
            
            .table-totals {
              font-weight: bold !important;
              background-color: #F0F7FF !important;
            }
          }

          .table-container table {
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 8pt !important;
            border-collapse: collapse;
          }

          .table-container th {
            background-color: #E6F0FA;
            border: 1.5px solid #333;
            color: #0C2D5E;
          }
          
          .table-container td {
            border: 1.5px solid #333;
            color: #1A4A7B;
          }

          .header-section, .customer-info, .totals-section, .terms-section, .footer-block {
            font-family: Arial, Helvetica, sans-serif !important;
            color: #1A4A7B !important;
          }

          .header-section .date-text {
            font-size: 10pt !important;
          }

          .header-section .quotation-number, .customer-info .customer-name {
            font-size: 14pt !important;
            font-weight: bold !important;
            color: #0C2D5E !important;
          }

          .header-section .gstin-text, .customer-info .company-address {
            font-size: 10pt !important;
          }

          .footer-block .company-name {
            font-size: 11pt !important;
            font-weight: bold !important;
          }

          .footer-block .signatory-text {
            font-size: 10pt !important;
          }
          
          .bordered-text {
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 9pt !important;
            font-style: italic !important;
            color: #0C2D5E !important;
            text-align: center !important;
            border: 1.5px solid #333;
            padding: 8px;
            margin: 8px auto;
            background-color: #E6F0FA;
            max-width: 90%;
            display: block;
          }
          
          .table-totals {
            font-weight: bold;
            background-color: #F0F7FF;
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
        <div className="flex justify-between items-start mt-6">
          <div>
            <div className="date-text">
              Date: {formatDate(quotation.createdAt)}
            </div>
            <div className="mt-1">
              <div className="quotation-number">
                Quotation No: {quotation.quotationNumber}
              </div>
              <div className="gstin-text">GSTIN: 29ABCFA9924A1ZL</div>
            </div>
          </div>
        </div>

        <div className="customer-info mt-2">
          <div className="customer-name">
            {quotation.salutation && quotation.customerName ? `${quotation.salutation} ${quotation.customerName}` : quotation.customerName}
          </div>
          <div className="company-address">{quotation.customerCompany}</div>
          <div className="company-address">{quotation.customerAddress}</div>
        </div>
      </div>

      <div className="print-section table-container mt-2">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-center sl-no-cell">Sl. No.</th>
              <th className="border px-2 py-1 text-center image-cell">Image</th>
              <th className="border px-2 py-1 text-center product-cell">Product</th>
              {quotation.displayHSNCodes && (
                <th className="border px-2 py-1 text-center hsn-cell">HSN</th>
              )}
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
                  <td className="border px-2 py-1 text-center sl-no-cell">{item.slNo}</td>
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
                  <td className="border px-2 py-1 text-center product-cell">{item.product}</td>
                  {quotation.displayHSNCodes && (
                    <td className="border px-2 py-1 text-center hsn-cell">{hsnCode}</td>
                  )}
                  <td className="border px-2 py-1 text-center quantity-cell">{quantity}</td>
                  <td className="border px-2 py-1 text-center rate-cell">₹{formatCurrency(effRate)}</td>
                  <td className="border px-2 py-1 text-center amount-cell">₹{formatCurrency(amount)}</td>
                  <td className="border px-2 py-1 text-center gst-cell">{gstPercent}%</td>
                  <td className="border px-2 py-1 text-center total-cell">₹{formatCurrency(total)}</td>
                </tr>
              );
            })}
          </tbody>
          
          {quotation.displayTotals && (
            <tfoot>
              <tr className="table-totals">
                <td 
                  colSpan={quotation.displayHSNCodes ? 5 : 4} 
                  className="border px-2 py-1 text-center"
                >
                  Total
                </td>
                <td className="border px-2 py-1"></td>
                <td className="border px-2 py-1 text-center">₹{formatCurrency(computedAmount(quotation))}</td>
                <td className="border px-2 py-1"></td>
                <td className="border px-2 py-1 text-center">₹{formatCurrency(computedTotal(quotation))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="print-section terms-section mt-4 border-t pt-2">
        <div className="bordered-text font-bold">
          Product subject to availability at the time of order confirmation
        </div>
        {quotation.terms?.length > 0 &&
          quotation.terms.map((term, idx) => (
            <div key={idx} className="mb-1">
              <div className="font-bold text-xs">{term.heading}:</div>
              <div className="text-xs">{term.content}</div>
            </div>
          ))}
        <div className="bordered-text font-bold">
          Rates may vary in case there is a change in specifications / quantity / timelines
        </div>
      </div>

      <div className="print-section footer-block mt-8">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="company-name">For Ace Print Pack</div>
            <img
              src="/signature.png"
              alt="Signature"
              style={{ height: '0.8in', width: 'auto', margin: '0.1in 0' }}
              crossOrigin="anonymous"
            />
            <div className="signatory-text">Authorized Signatory</div>
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
