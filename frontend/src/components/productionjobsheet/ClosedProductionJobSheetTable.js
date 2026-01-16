// src/components/productionjobsheet/ClosedProductionJobSheetTable.js
import React, { useState } from "react";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

/* util */
const t = (v) => (v && v !== "-" ? v : "");
const d = (v) => (!v || v === "-" ? "" : isNaN(new Date(v)) ? "" : new Date(v).toLocaleDateString());

/* header filter row - UPDATED VERSION */
function FilterRow({ filters, onChange }) {
  const statusOptions = ["All", "pending", "received", "alert"];
  
  const dateKeys = [
    "jobSheetCreatedDate",
    "deliveryDateTime",
    "expectedReceiveDate",
    "expectedPostBranding",
    "schedulePickUp"
  ];

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
    { key: "status", type: "select", label: "Status", options: statusOptions },
    { key: "remarks", type: "text", label: "Remarks" },
  ];

  // Format date for input type="date" (YYYY-MM-DD) or datetime-local (YYYY-MM-DDTHH:MM)
  const formatDateForInput = (value, isDateTime = false) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return "";
      
      if (isDateTime) {
        // For datetime-local, format as YYYY-MM-DDTHH:MM
        const pad = (num) => num.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } else {
        // For date, format as YYYY-MM-DD
        return date.toISOString().split('T')[0];
      }
    } catch {
      return "";
    }
  };

  // Parse date from input value
  const parseDateFromInput = (value, isDateTime = false) => {
    if (!value) return "";
    
    if (isDateTime) {
      // For datetime-local, ensure proper format
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString();
    } else {
      // For date, ensure proper format
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
    }
  };

  // Handle input changes
  const handleChange = (key, value, isDateField = false, isDateTime = false) => {
    if (isDateField) {
      const formattedValue = parseDateFromInput(value, isDateTime);
      onChange(key, formattedValue);
    } else {
      onChange(key, value);
    }
  };

  // Get current value for input field
  const getInputValue = (key, value, isDateField, isDateTime) => {
    if (isDateField && value) {
      return formatDateForInput(value, isDateTime);
    }
    return value || "";
  };

  return (
    <tr className="bg-gray-100">
      {cols.map(({ key, type, options }) => {
        const isDateField = dateKeys.includes(key);
        const isDateTime = key === "schedulePickUp";
        
        return (
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
            ) : isDateField ? (
              <input
                type={isDateTime ? "datetime-local" : "date"}
                value={getInputValue(key, filters[key], isDateField, isDateTime)}
                onChange={(e) => handleChange(key, e.target.value, isDateField, isDateTime)}
                className="w-full border p-0.5 text-[10px] rounded"
                placeholder={isDateTime ? "yyyy-mm-ddThh:mm" : "yyyy-mm-dd"}
              />
            ) : (
              <input
                type={type}
                value={filters[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full border p-0.5 text-[10px] rounded"
                placeholder="filter..."
              />
            )}
          </th>
        );
      })}
      <th className="border px-1 py-0.5"></th> {/* Action column */}
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
  onActionClick,
  sortField,
  sortOrder,
  onSortChange,
  headerFilters,
  onHeaderFilterChange,
}) {
  console.log('Table data:', data);

  const icon = (f) =>
    sortField !== f ? (
      <span className="opacity-50 ml-0.5">↕</span>
    ) : sortOrder === "asc" ? (
      <span className="ml-0.5">▲</span>
    ) : (
      <span className="ml-0.5">▼</span>
    );

  // Handle follow up date display
  const getLatestFollowUpDate = (followUpArray) => {
    if (!followUpArray || followUpArray.length === 0) return "";
    const latest = followUpArray.reduce((latestItem, currentItem) => {
      const latestDate = new Date(latestItem.followUpDate);
      const currentDate = new Date(currentItem.followUpDate);
      return currentDate > latestDate ? currentItem : latestItem;
    });
    return d(latest.followUpDate);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        {/* <button
          onClick={() => exportToExcel(data)}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded"
        >
          Export&nbsp;to&nbsp;Excel
        </button> */}
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-150px)] border rounded"> {/* Added container */}
        <table className="min-w-full table-auto border-collapse text-xs">
          <thead className="bg-gray-50 sticky top-0 z-10"> {/* Made sticky */}
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
                ["status", "Status", "string"],
                ["remarks", "Remarks", "string"],
              ].map(([key, label, type]) => (
                <th
                  key={key}
                  className="border px-2 py-1 font-semibold text-blue-800 cursor-pointer bg-gray-50" /* Added bg-gray-50 */
                  onClick={() => onSortChange(key)}
                >
                  {label} {icon(key)}
                </th>
              ))}
              <th className="border px-2 py-1 font-semibold bg-gray-50">Action</th> {/* Added bg-gray-50 */}
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
                        onActionClick(r);
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
                <td className="p-2 border">
                  {getLatestFollowUpDate(r.followUp)}
                </td>
                <td className="p-2 border">{t(r.status)}</td>
                <td className="p-2 border">{t(r.remarks)}</td>
                <td className="p-2 border">
                  {onActionClick && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onActionClick(r);
                      }}
                      className="hover:text-gray-600"
                    >
                      &#8942;
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> {/* End of container */}
    </div>
  );
}