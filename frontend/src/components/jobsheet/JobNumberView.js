// components/JobSheetModal.jsx
import React from "react";

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
  )};


export const JobSheetModal = ({ jobSheet, onClose }) => {
   if (!jobSheet) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center px-2 sm:px-6 md:px-10 overflow-auto pt-24 sm:pt-32">
      <div className="w-full max-w-5xl bg-white border border-black text-xs sm:text-sm p-4 sm:p-6 md:p-10 mx-auto rounded-lg">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-4 text-center">
          Job Sheet Details
        </h2>
        <p><strong>Job Sheet Number:</strong> {jobSheet.jobSheetNumber || "(No Number)"}</p>
        <p><strong>ID:</strong> {jobSheet._id}</p>

        {/* Header Row */}
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

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobSheetModal;
