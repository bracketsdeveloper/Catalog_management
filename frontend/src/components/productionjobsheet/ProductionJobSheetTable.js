import React, { useState } from "react";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

/* utility fns (unchanged) */
const t = (v) => (!v || v === "-" ? "" : v);
const d = (v) => (!v || v === "-" ? "" : isNaN(new Date(v)) ? "" : new Date(v).toLocaleDateString());
const dt = (v) => (!v || v === "-" ? "" : isNaN(new Date(v)) ? "" : new Date(v).toLocaleString());

/* header filter row */
function FilterRow({ filters, onChange }) {
  const statusOptions = ["All", "pending", "received", "alert", "Not Set"];

  const cols = [
    { key: "jobSheetCreatedDate", type: "date", label: "Order Date" },
    { key: "jobSheetNumber", type: "text", label: "Job Sheet" },
    { key: "deliveryDateTime", type: "date", label: "Delivery Date" },
    { key: "clientCompanyName", type: "text", label: "Client" },
    { key: "eventName", type: "text", label: "Event" },
    { key: "product", type: "text", label: "Product" },
    { key: "qtyRequired", type: "number", label: "Qty Req" },
    { key: "qtyOrdered", type: "number", label: "Qty Ord" },
    { key: "expectedReceiveDate", type: "date", label: "Expected In-Hand" },
    { key: "brandingType", type: "text", label: "Branding Type" },
    { key: "brandingVendor", type: "text", label: "Branding Vendor" },
    { key: "expectedPostBranding", type: "date", label: "Expected Post-Branding" },
    { key: "schedulePickUp", type: "datetime-local", label: "Schedule Pick-Up" },
    { key: "followUp", type: "text", label: "Follow Up" },
    { key: "remarks", type: "text", label: "Remarks" },
    { key: "status", type: "select", label: "Status", options: statusOptions },
  ];

  return (
    <tr className="bg-gray-100">
      {cols.map(({ key, type, options }) => (
        <th key={key} className="border px-1 py-0.5">
          {type === "select" ? (
            <select
              value={filters[key] || ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full border p-0.5 text-[10px] rounded"
            >
              {options.map((opt) => (
                <option key={opt} value={opt === "All" ? "" : opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={filters[key] || ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full border p-0.5 text-[10px] rounded"
              placeholder={type === "date" ? "dd-mm-yyyy" : type === "datetime-local" ? "dd-mm-yyyy --:--" : "filter..."}
            />
          )}
        </th>
      ))}
      <th className="border px-1 py-0.5"></th>
    </tr>
  );
}

export default function ProductionJobSheetTable({
  data,
  onActionClick,
  sortField,
  sortOrder,
  onSortChange,
  headerFilters,
  onHeaderFilterChange,
}) {
  const [fuModal, setFuModal] = useState(null);

  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    
    const handleOpenModal = (jobSheetNumber) => {
      setSelectedJobSheetNumber(jobSheetNumber);
      setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedJobSheetNumber(null);
    };
  

  const rowCls = (s) =>
    !s
      ? ""
      : s === "pending"
      ? "bg-orange-200"
      : s === "received"
      ? "bg-green-300"
      : s === "alert"
      ? "bg-red-200"
      : "";

  const icon = (f) =>
    sortField !== f ? (
      <span className="opacity-50 ml-0.5">↕</span>
    ) : sortOrder === "asc" ? (
      <span className="ml-0.5">▲</span>
    ) : (
      <span className="ml-0.5">▼</span>
    );

  const latestFU = (arr = []) =>
    arr.reduce(
      (p, c) => ((new Date(c.followUpDate) > new Date(p.followUpDate) ? c : p)),
      { followUpDate: 0 }
    );

  return (
    <>
      <table className="min-w-full table-auto border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            {[
              ["jobSheetCreatedDate", "Order Date", "date"],
              ["jobSheetNumber", "Job Sheet", "string"],
              ["deliveryDateTime", "Delivery Date", "date"],
              ["clientCompanyName", "Client", "string"],
              ["eventName", "Event", "string"],
              ["product", "Product", "string"],
              ["qtyRequired", "Qty Req", "number"],
              ["qtyOrdered", "Qty Ord", "number"],
              ["expectedReceiveDate", "Expected In-Hand", "date"],
              ["brandingType", "Branding Type", "string"],
              ["brandingVendor", "Branding Vendor", "string"],
              ["expectedPostBranding", "Expected Post-Branding", "date"],
              ["schedulePickUp", "Schedule Pick-Up", "date"],
              ["followUp", "Follow Up", "date"],
              ["remarks", "Remarks", "string"],
              ["status", "Status", "string"],
            ].map(([key, label, type]) => (
              <th
                key={key}
                className="border px-2 py-1 font-semibold text-blue-800 cursor-pointer"
                onClick={() => onSortChange(key)}
              >
                {label} {icon(key)}
              </th>
            ))}
            <th className="border px-2 py-1 font-semibold">Action</th>
          </tr>
          <FilterRow filters={headerFilters} onChange={onHeaderFilterChange} />
        </thead>
        <tbody>
          {data.map((r) => {
            const fu = latestFU(r.followUp);
            return (
              <tr key={r._id} className={rowCls(r.status)}>
                <td className="border px-2 py-1">{d(r.jobSheetCreatedDate)}</td>
                <td className="border px-2 py-1">
                  <button
                    className="border-b text-blue-500 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenModal(r.jobSheetNumber);
                    }}
                  >
                    {t(r.jobSheetNumber) || "(No Number)"}
                  </button>
                </td>
                <td className="border px-2 py-1">{d(r.deliveryDateTime)}</td>
                <td className="border px-2 py-1">{t(r.clientCompanyName)}</td>
                <td className="border px-2 py-1">{t(r.eventName)}</td>
                <td className="border px-2 py-1">{t(r.product)}</td>
                <td className="border px-2 py-1">{t(r.qtyRequired)}</td>
                <td className="border px-2 py-1">{t(r.qtyOrdered)}</td>
                <td className="border px-2 py-1">{d(r.expectedReceiveDate)}</td>
                <td className="border px-2 py-1">{t(r.brandingType)}</td>
                <td className="border px-2 py-1">{t(r.brandingVendor)}</td>
                <td className="border px-2 py-1">{d(r.expectedPostBranding)}</td>
                <td className="border px-2 py-1">{dt(r.schedulePickUp)}</td>
                <td
                  className="border px-2 py-1 text-blue-600 underline cursor-pointer"
                  onClick={() => fu.followUpDate && setFuModal(fu)}
                >
                  {fu.followUpDate ? new Date(fu.followUpDate).toLocaleDateString() : ""}
                </td>
                <td className="border px-2 py-1">{t(r.remarks)}</td>
                <td className="border px-2 py-1">{t(r.status)}</td>
                <td className="border px-2 py-1 text-center">
                  <button onClick={() => onActionClick(r)}>&#8942;</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      
                <JobSheetGlobal
                  jobSheetNumber={selectedJobSheetNumber} 
                  isOpen={isModalOpen}
                  onClose={handleCloseModal}
                />
              

      {/* follow-up pop-up */}
      {fuModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded max-w-md text-xs">
            <h3 className="font-bold mb-2">Follow Up Details</h3>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(fuModal.followUpDate).toLocaleString()}
            </p>
            <p>
              <strong>Note:</strong> {fuModal.note}
            </p>
            <button onClick={() => setFuModal(null)} className="mt-4 border px-3 py-1 rounded">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
