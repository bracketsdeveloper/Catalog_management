// src/components/productionjobsheet/ClosedProductionJobSheetTable.js
import React from "react";
import * as XLSX from "xlsx";

const displayText = (v) => (v && v !== "-" ? v : "");
const displayDate = (v) => {
  if (!v || v === "-") return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const exportToExcel = (data) => {
  const exportData = data.map((r) => ({
    "Order Date": displayDate(r.jobSheetCreatedDate),
    "Job Sheet Number": displayText(r.jobSheetNumber),
    "Delivery Date": displayDate(r.deliveryDateTime),
    "Client Company Name": displayText(r.clientCompanyName),
    "Event Name": displayText(r.eventName),
    "Product": displayText(r.product),
    "Qty Required": r.qtyRequired ?? "",
    "Qty Ordered": r.qtyOrdered ?? "",
    "Product Expected In Hand": displayDate(r.expectedReceiveDate),
    "Branding Type": displayText(r.brandingType),
    "Branding Vendor": displayText(r.brandingVendor),
    "Expected Post Branding in Ace": displayText(r.expectedPostBranding),
    "Schedule Pick Up Date": displayDate(r.schedulePickUp),
    Remarks: displayText(r.remarks),
    Status: displayText(r.status),
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Closed Sheets");
  XLSX.writeFile(wb, "ClosedProductionJobSheets.xlsx");
};

const ClosedProductionJobSheetTable = ({
  data,
  sortField,
  sortOrder,
  onSortChange,
}) => {
  const renderSortIcon = (field) =>
    sortField === field ? (
      sortOrder === "asc" ? (
        <span className="ml-1 text-xs">▲</span>
      ) : (
        <span className="ml-1 text-xs">▼</span>
      )
    ) : (
      <span className="ml-1 opacity-50 text-xs">↕</span>
    );

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => exportToExcel(data)}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          Export to Excel
        </button>
      </div>
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("jobSheetCreatedDate")}
            >
              Order Date {renderSortIcon("jobSheetCreatedDate")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("jobSheetNumber")}
            >
              Job Sheet Number {renderSortIcon("jobSheetNumber")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("deliveryDateTime")}
            >
              Delivery Date {renderSortIcon("deliveryDateTime")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("clientCompanyName")}
            >
              Client Company Name {renderSortIcon("clientCompanyName")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("eventName")}
            >
              Event Name {renderSortIcon("eventName")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("product")}
            >
              Product {renderSortIcon("product")}
            </th>
            <th className="p-2 border">Qty Required</th>
            <th className="p-2 border">Qty Ordered</th>
            <th className="p-2 border">Product Expected In Hand</th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("brandingType")}
            >
              Branding Type {renderSortIcon("brandingType")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("brandingVendor")}
            >
              Branding Vendor {renderSortIcon("brandingVendor")}
            </th>
            <th className="p-2 border">Expected Post Branding in Ace</th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("schedulePickUp")}
            >
              Schedule Pick Up Date {renderSortIcon("schedulePickUp")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("remarks")}
            >
              Remarks {renderSortIcon("remarks")}
            </th>
            <th
              className="p-2 border cursor-pointer"
              onClick={() => onSortChange("status")}
            >
              Status {renderSortIcon("status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r._id} className="bg-green-200">
              <td className="p-2 border">{displayDate(r.jobSheetCreatedDate)}</td>
              <td className="p-2 border">{displayText(r.jobSheetNumber)}</td>
              <td className="p-2 border">{displayDate(r.deliveryDateTime)}</td>
              <td className="p-2 border">{displayText(r.clientCompanyName)}</td>
              <td className="p-2 border">{displayText(r.eventName)}</td>
              <td className="p-2 border">{displayText(r.product)}</td>
              <td className="p-2 border">{r.qtyRequired ?? ""}</td>
              <td className="p-2 border">{r.qtyOrdered ?? ""}</td>
              <td className="p-2 border">{displayDate(r.expectedReceiveDate)}</td>
              <td className="p-2 border">{displayText(r.brandingType)}</td>
              <td className="p-2 border">{displayText(r.brandingVendor)}</td>
              <td className="p-2 border">
                {displayText(r.expectedPostBranding)}
              </td>
              <td className="p-2 border">{displayDate(r.schedulePickUp)}</td>
              <td className="p-2 border">{displayText(r.remarks)}</td>
              <td className="p-2 border">{displayText(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClosedProductionJobSheetTable;
