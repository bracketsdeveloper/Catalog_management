// src/pages/JobSheetView.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function JobSheetView() {
  const { id } = useParams();
  const [jobSheet, setJobSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch job-sheet data
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(
          `${BACKEND_URL}/api/admin/jobsheets/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setJobSheet(data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch job sheet");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Format date helper
  const formatDate = (d) => (d ? format(new Date(d), "dd-MMM-yyyy") : "N/A");

  // Export to Word
  const exportToDocx = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/jobsheets/${id}/export-docx`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `job-sheet-${id}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Document export failed");
    }
  };

  // Export to PDF (landscape, margins)
  const exportToPdf = async () => {
    const input = document.getElementById("job-sheet-content");
    if (!input) return alert("Nothing to export");
    try {
      const canvas = await html2canvas(input, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const margin = 40;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
      pdf.save(`job-sheet-${jobSheet.eventName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF export failed");
    }
  };

  // Render states
  if (loading) return <p className="text-xs">Loading job sheet…</p>;
  if (error) return <p className="text-xs text-red-500">{error}</p>;
  if (!jobSheet) return <p className="text-xs">No job sheet found.</p>;

  return (
    <>
      {/* Export buttons */}
      <div className="mb-4 space-x-2">
        <button
          onClick={exportToDocx}
          className="px-4 py-2 bg-blue-500 text-white text-xs rounded"
        >
          Export to Word
        </button>
        <button
          onClick={exportToPdf}
          className="px-4 py-2 bg-green-500 text-white text-xs rounded"
        >
          Export to PDF
        </button>
      </div>

      {/* Job-sheet preview */}
      <div
        id="job-sheet-content"
        className="mx-auto border border-black text-xs"
        style={{ width: "90%", maxWidth: "1123px", boxSizing: "border-box" }}
      >
        {/* Top Header Row */}
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-0">
          <div className="border border-black flex items-center justify-center text-left">
            <span className="font-bold uppercase">EVENT NAME:</span>
            <span className="ml-1 font-semibold">
              {jobSheet.eventName || "N/A"}
            </span>
          </div>
          <div className="border border-black flex items-center justify-center">
            <span className="font-bold uppercase">ORDER FORM</span>
          </div>
          <div className="border border-black flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="h-16 inline-block" />
          </div>
        </div>

        {/* 3×3 Grid Header */}
        <div className="grid grid-cols-3 gap-0">
          <Cell label="ORDER FORM #:" value={jobSheet.jobSheetNumber} />
          <Cell label="DELIVERY DATE:" value={formatDate(jobSheet.deliveryDate)} />
          <Cell label="CLIENT COMPANY:" value={jobSheet.clientCompanyName} />
          <Cell label="REF QUOTATION:" value={jobSheet.referenceQuotation} />
          <Cell label="DELIVERY TIME:" value={jobSheet.deliveryTime} />
          <Cell label="CLIENT NAME:" value={jobSheet.clientName} />
          <Cell label="ORDER DATE:" value={formatDate(jobSheet.orderDate)} />
          <Cell label="CRM INCHARGE:" value={jobSheet.crmIncharge} />
          <Cell label="CONTACT:" value={jobSheet.contactNumber} />
        </div>

        {/* Product Table */}
        <table className="min-w-full border-collapse border border-black">
          <thead>
            <tr className="border border-black">
              {[
                "SL NO.",
                "PRODUCTS",
                "COLOR",
                "SIZE/CAPACITY",
                "QTY",
                "SOURCING FROM",
                "BRANDING TYPE",
                "BRANDING VENDOR",
                "REMARKS",
              ].map((h) => (
                <th key={h} className="p-1 border border-black uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobSheet.items.map((it, i) => (
              <tr key={i} className="border border-black font-semibold">
                <td className="p-1 border border-black">{i + 1}</td>
                <td className="p-1 border border-black">{it.product}</td>
                <td className="p-1 border border-black">{it.color}</td>
                <td className="p-1 border border-black">{it.size}</td>
                <td className="p-1 border border-black">{it.quantity}</td>
                <td className="p-1 border border-black">{it.sourcingFrom || "N/A"}</td>
                <td className="p-1 border border-black">{it.brandingType || "N/A"}</td>
                <td className="p-1 border border-black">{it.brandingVendor || "N/A"}</td>
                <td className="p-1 border border-black">{it.remarks || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Additional Details */}
        <Section
          rows={[
            [
              { label: "PO NUMBER:", val: jobSheet.poNumber },
              { label: "PO STATUS:", val: jobSheet.poStatus },
            ],
            [
              { label: "DELIVERY TYPE:", val: jobSheet.deliveryType },
              { label: "DELIVERY MODE:", val: jobSheet.deliveryMode },
              { label: "DELIVERY CHARGES:", val: jobSheet.deliveryCharges },
            ],
          ]}
        />

        <Line label="DELIVERY ADDRESS:" value={jobSheet.deliveryAddress} />
        <Line label="GIFT BOX / BAGS DETAILS:" value={jobSheet.giftBoxBagsDetails} />
        <Line label="PACKAGING INSTRUCTIONS:" value={jobSheet.packagingInstructions} />
        <Line label="ANY OTHER DETAILS:" value={jobSheet.otherDetails} />

        {/* Hand-written fields */}
        <div className="mt-2">
          <div className="flex justify-between mb-20 px-6">
            {["QTY DISPATCHED:", "SENT ON:", "SEAL/SIGN:"].map((t) => (
              <div key={t} className="w-1/3 text-center">
                <span className="font-bold uppercase">{t}</span>
                <span className="border-b border-black inline-block w-full"> </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Presentational helpers

function Cell({ label, value }) {
  return (
    <div className="border border-black flex items-center">
      <span className="font-bold uppercase border-r border-black p-2 w-[50%]">
        {label}
      </span>
      <span className="p-1 w-[50%] font-semibold">{value || "N/A"}</span>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="border-b border-black p-1">
      <span className="font-bold uppercase border-black border-r p-1 mr-2">
        {label}
      </span>
      <span className="font-semibold">{value || "N/A"}</span>
    </div>
  );
}

function Section({ rows }) {
  return (
    <div className="border border-black">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`grid gap-0 border-b border-black ${
            row.length === 2 ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {row.map((cell) => (
            <div
              key={cell.label}
              className={`p-1 ${
                row.length === 3 ? "border-r border-black" : ""
              }`}
            >
              <span className="font-bold uppercase">{cell.label}</span>
              <span className="ml-1 font-semibold">{cell.val || "N/A"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
