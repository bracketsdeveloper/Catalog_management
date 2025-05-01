// src/components/productionjobsheet/ClosedProductionJobSheetTable.js
import React, { useState } from "react";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

/* util */
const t = (v) => (v && v !== "-" ? v : "");
const d = (v) => (!v || v === "-" ? "" : isNaN(new Date(v)) ? "" : new Date(v).toLocaleDateString());

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
    </tr>
  );
}

/* export */
const exportToExcel = (data) => {
  const ws = XLSX.utils.json_to_sheet(
    data.map((r) => ({
      "Order Date": d(r.jobSheetCreatedDate),
      "Job Sheet": t(r.jobSheetNumber),
      "Delivery Date": d(r.deliveryDateTime),
      Client: t(r.clientCompanyName),
      Event: t(r.eventName),
      Product: t(r.product),
      "Qty Req": r.qtyRequired,
      "Qty Ord": r.qtyOrdered,
      "Expected In-Hand": d(r.expectedReceiveDate),
      "Branding Type": t(r.brandingType),
      "Branding Vendor": t(r.brandingVendor),
      "Expected Post Brand": t(r.expectedPostBranding),
      "Schedule Pick-Up": d(r.schedulePickUp),
      Remarks: t(r.remarks),
      Status: t(r.status),
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Closed");
  XLSX.writeFile(wb, "ClosedProductionJobSheets.xlsx");
};

export default function ClosedProductionJobSheetTable({
  data,
  sortField,
  sortOrder,
  onSortChange,
  headerFilters,
  onHeaderFilterChange,
}) {

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


  const icon = (f) =>
    sortField !== f ? (
      <span className="opacity-50 ml-0.5 text-xs">↕</span>
    ) : sortOrder === "asc" ? (
      <span className="ml-0.5 text-xs">▲</span>
    ) : (
      <span className="ml-0.5 text-xs">▼</span>
    );

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => exportToExcel(data)}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded"
        >
          Export&nbsp;to&nbsp;Excel
        </button>
      </div>

      <table className="min-w-full border-collapse text-xs">
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
                onClick={() => onSortChange(k)}
                className="p-2 border cursor-pointer"
              >
                {l} {icon(k)}
              </th>
            ))}
            <th className="p-2 border">Qty Req</th>
            <th className="p-2 border">Qty Ord</th>
            <th className="p-2 border">Expected In-Hand</th>
            {[
              ["brandingType", "Branding Type"],
              ["brandingVendor", "Branding Vendor"],
            ].map(([k, l]) => (
              <th
                key={k}
                onClick={() => onSortChange(k)}
                className="p-2 border cursor-pointer"
              >
                {l} {icon(k)}
              </th>
            ))}
            <th className="p-2 border">Expected Post Brand</th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("schedulePickUp")}
            >
              Schedule Pick-Up {icon("schedulePickUp")}
            </th>
            {[
              ["remarks", "Remarks"],
              ["status", "Status"],
            ].map(([k, l]) => (
              <th
                key={k}
                onClick={() => onSortChange(k)}
                className="p-2 border cursor-pointer"
              >
                {l} {icon(k)}
              </th>
            ))}
          </tr>
          <FilterRow filters={headerFilters} onChange={onHeaderFilterChange} />
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r._id} className="bg-green-200">
              <td className="p-2 border">{d(r.jobSheetCreatedDate)}</td>
              <td className="p-2 border">
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
              <td className="p-2 border">{d(r.deliveryDateTime)}</td>
              <td className="p-2 border">{t(r.clientCompanyName)}</td>
              <td className="p-2 border">{t(r.eventName)}</td>
              <td className="p-2 border">{t(r.product)}</td>
              <td className="p-2 border">{r.qtyRequired}</td>
              <td className="p-2 border">{r.qtyOrdered}</td>
              <td className="p-2 border">{d(r.expectedReceiveDate)}</td>
              <td className="p-2 border">{t(r.brandingType)}</td>
              <td className="p-2 border">{t(r.brandingVendor)}</td>
              <td className="p-2 border">{t(r.expectedPostBranding)}</td>
              <td className="p-2 border">{d(r.schedulePickUp)}</td>
              <td className="p-2 border">{t(r.remarks)}</td>
              <td className="p-2 border">{t(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>

        <JobSheetGlobal
          jobSheetNumber={selectedJobSheetNumber} 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />

            

    </div>
  );
}
