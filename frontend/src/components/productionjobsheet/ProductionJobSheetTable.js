import React, { useState } from "react";

/* utility fns (unchanged) */
const t = (v) => (!v || v === "-" ? "" : v);
const d = (v) => (!v || v === "-" ? "" : isNaN(new Date(v)) ? "" : new Date(v).toLocaleDateString());
const dt = (v) => (!v || v === "-" ? "" : isNaN(new Date(v)) ? "" : new Date(v).toLocaleString());

/* header filter row */
function FilterRow({ filters, onChange }) {
  const cols = [
    "jobSheetCreatedDate",
    "jobSheetNumber",
    "deliveryDateTime",
    "clientCompanyName",
    "eventName",
    "product",
    "qtyRequired",
    "qtyOrdered",
    "expectedReceiveDate",
    "brandingType",
    "brandingVendor",
    "expectedPostBranding",
    "schedulePickUp",
    "remarks",
    "status",
  ];
  return (
    <tr className="bg-gray-100">
      {cols.map((k) => (
        <th key={k} className="border px-1 py-0.5">
          <input
            value={filters[k] || ""}
            onChange={(e) => onChange(k, e.target.value)}
            className="w-full border p-0.5 text-[10px] rounded"
            placeholder="filter…"
          />
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
              ["jobSheetCreatedDate", "Order Date"],
              ["jobSheetNumber", "Job Sheet"],
              ["deliveryDateTime", "Delivery Date"],
              ["clientCompanyName", "Client"],
              ["eventName", "Event"],
              ["product", "Product"],
            ].map(([k, l]) => (
              <th
                key={k}
                className="border px-2 py-1 font-semibold text-blue-800 cursor-pointer"
                onClick={() => onSortChange(k)}
              >
                {l} {icon(k)}
              </th>
            ))}
            <th className="border px-2 py-1 font-semibold">Qty Req</th>
            <th className="border px-2 py-1 font-semibold">Qty Ord</th>
            <th className="border px-2 py-1 font-semibold">Expected In-Hand</th>
            {[
              ["brandingType", "Branding Type"],
              ["brandingVendor", "Branding Vendor"],
            ].map(([k, l]) => (
              <th
                key={k}
                className="border px-2 py-1 font-semibold text-blue-800 cursor-pointer"
                onClick={() => onSortChange(k)}
              >
                {l} {icon(k)}
              </th>
            ))}
            <th className="border px-2 py-1 font-semibold">Expected Post Branding</th>
            <th
              className="border px-2 py-1 font-semibold text-blue-800 cursor-pointer"
              onClick={() => onSortChange("schedulePickUp")}
            >
              Schedule Pick-Up {icon("schedulePickUp")}
            </th>
            <th className="border px-2 py-1 font-semibold">Follow Up</th>
            <th className="border px-2 py-1 font-semibold">Remarks</th>
            <th className="border px-2 py-1 font-semibold">Status</th>
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
                <td className="border px-2 py-1">{t(r.jobSheetNumber)}</td>
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
