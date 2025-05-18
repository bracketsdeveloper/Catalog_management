import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function JobSheetGlobal({ jobSheetNumber, isOpen, onClose }) {
  const [jobSheet, setJobSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Fetch job sheet data
  useEffect(() => {
    if (!jobSheetNumber || !isOpen) return;
    const fetchJobSheet = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        const { data } = await axios.get(
          `${BACKEND_URL}/api/admin/jobsheets/${jobSheetNumber}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setJobSheet(data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch job sheet");
      } finally {
        setLoading(false);
      }
    };
    fetchJobSheet();
  }, [jobSheetNumber, isOpen]);

  // Format date helper
  const formatDate = (d) => (d ? format(new Date(d), "dd-MMM-yyyy") : "N/A");

  // Export to Word
  const exportToDocx = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/jobsheets/${jobSheetNumber}/export-docx`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `job-sheet-${jobSheetNumber}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Document export failed");
    }
  };

  // Export to PDF
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
      pdf.save(`job-sheet-${jobSheet?.eventName || jobSheetNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF export failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white max-h-[90vh] overflow-y-auto p-4 border rounded-lg w-full max-w-[1200px] relative"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-3xl font-bold"
        >
          ×
        </button>
        {loading ? (
          <p className="text-xs">Loading job sheet…</p>
        ) : error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : !jobSheet ? (
          <p className="text-xs">No job sheet found.</p>
        ) : (
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
            {/* Job sheet content */}
            <JobSheetContent jobSheet={jobSheet} formatDate={formatDate} />
          </>
        )}
      </div>
    </div>
  );
}

// Job sheet content component (from JobSheetView.jsx)
function JobSheetContent({ jobSheet, formatDate }) {
  return (
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
        <Cell
          label="DELIVERY DATE:"
          value={formatDate(jobSheet.deliveryDate)}
        />
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
              <td className="p-1 border border-black">
                {it.sourcingFrom || "N/A"}
              </td>
              <td className="p-1 border border-black">
                {it.brandingType || "N/A"}
              </td>
              <td className="p-1 border border-black">
                {it.brandingVendor || "N/A"}
              </td>
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
              <span className="border-b border-black inline-block w-full"></span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
              className={`p-1 ${row.length === 3 ? "border-r border-black" : ""}`}
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