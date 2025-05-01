import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function JobSheetGlobal({ jobSheetNumber, isOpen, onClose }) {
  const [jobSheet, setJobSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
  if (!jobSheetNumber || !isOpen) return;

  const fetchJobSheet = async () => {
    try {
      console.log("Fetching job sheet...");
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `${BACKEND_URL}/api/admin/jobsheets/${jobSheetNumber}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setJobSheet(data);
      console.log("Fetched job sheet:", data);
    } catch (err) {
      console.error("Error fetching job sheet:", err);
      setError("Failed to fetch job sheet");
    } finally {
      setLoading(false);
    }
  };

  fetchJobSheet();
}, [jobSheetNumber, isOpen]);


  const formatDate = (date) => (date ? format(new Date(date), "dd-MM-yyyy") : "N/A");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-h-[90vh] overflow-y-auto p-4 border rounded-lg w-full max-w-[1200px] relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-3xl font-bold">×</button>

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <JobSheetContent jobSheet={jobSheet} formatDate={formatDate} />
        )}
      </div>
    </div>
  );
}

// Extracted presentational content (same as you had)
function JobSheetContent({ jobSheet, formatDate }) {
  return (
    <div
      id="job-sheet-content"
      className="mx-auto border border-black text-xs"
      style={{ width: "90%", maxWidth: "1123px", boxSizing: "border-box" }}
    >
        <p><strong>Job Sheet Number:</strong> {jobSheet.jobSheetNumber || "(No Number)"}</p>
        <p><strong>ID:</strong> {jobSheet._id}</p>
         
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-4 text-xs sm:text-sm border border-black">
          <div className="border border-black p-2 flex flex-col sm:flex-row items-start sm:items-center">
            <span className="font-bold uppercase">Event Name:</span>
            <span className="ml-1 font-semibold break-words">{jobSheet.eventName || "N/A"}</span>
          </div>
          <div className="border border-black flex items-center justify-center font-bold uppercase p-2">
            ORDER FORM
          </div>
          <div className="border border-black flex items-center justify-center p-2">
            <img src="/logo.png" alt="Logo" className="h-10 sm:h-12 md:h-16 object-contain" />
          </div>
        </div>

        {/* Grid Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 mt-2">
          <Cell label="ORDER FORM #:" value={jobSheet.jobSheetNumber} />
          <Cell label="CLIENT COMPANY:" value={jobSheet.clientCompanyName} />
          <Cell label="REF QUOTATION:" value={jobSheet.referenceQuotation} />
          <Cell label="DELIVERY TIME:" value={jobSheet.deliveryTime} />
          <Cell label="CLIENT NAME:" value={jobSheet.clientName} />
          <Cell label="CRM INCHARGE:" value={jobSheet.crmIncharge} />
          <Cell label="CONTACT:" value={jobSheet.contactNumber} />
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border-collapse border border-black text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                {[
                  "SL NO.", "PRODUCTS", "COLOR", "SIZE/CAPACITY", "QTY", "SOURCING FROM",
                  "BRANDING TYPE", "BRANDING VENDOR", "REMARKS"
                ].map((h) => (
                  <th key={h} className="p-1 border border-black whitespace-nowrap">{h}</th>
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
        </div>

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
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
            {["QTY DISPATCHED:", "SENT ON:", "SEAL/SIGN:"].map((t) => (
              <div key={t} className="w-full sm:w-1/3 text-center">
                <span className="font-bold uppercase">{t}</span>
                <span className="block border-b border-black mt-1 w-full h-6"></span>
              </div>
            ))}
          </div>
        </div>

        {/* <div className="mt-4 flex justify-end">
          <button
            onClick={onCloseModal}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div> */}
      </div>
  );
}

// Reuse the helpers from your original code
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
