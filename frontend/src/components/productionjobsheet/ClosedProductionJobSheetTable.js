// src/components/productionjobsheet/ClosedProductionJobSheetTable.js
import React from "react";
import * as XLSX from "xlsx";

// Helper functions for display. Return an empty string if no valid value.
function displayText(value) {
  return value && value !== "-" ? value : "";
}

function displayDate(value) {
  if (!value || value === "-") return "";
  const dateObj = new Date(value);
  return isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleDateString();
}

// The export function will export the passed data with appropriate headers.
function exportToExcel(data) {
  // Map each record into a clean object for export.
  const exportData = data.map((record) => ({
    "Order Date": displayDate(record.jobSheetCreatedDate),
    "Job Sheet Number": displayText(record.jobSheetNumber),
    "Delivery Date": displayDate(record.deliveryDateTime),
    "Client Company Name": displayText(record.clientCompanyName),
    "Event Name": displayText(record.eventName),
    "Product": displayText(record.product),
    "Product Expected In Hand": displayDate(record.expectedReceiveDate),
    "Branding Type": displayText(record.brandingType),
    "Branding Vendor": displayText(record.brandingVendor),
    "Expected Post Branding in Ace": displayText(record.expectedPostBranding),
    "Schedule Pick Up Date": displayDate(record.schedulePickUp),
    "Remarks": displayText(record.remarks),
    "Status": displayText(record.status),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Closed Production Job Sheets");
  XLSX.writeFile(workbook, "ClosedProductionJobSheets.xlsx");
}

const ClosedProductionJobSheetTable = ({ data, sortField, sortOrder, onSortChange }) => {
  // Render sort icon for a header field.
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span className="ml-1 opacity-50 text-xs">↕</span>;
    }
    return sortOrder === "asc" ? (
      <span className="ml-1 text-xs">▲</span>
    ) : (
      <span className="ml-1 text-xs">▼</span>
    );
  };

  return (
    <div>
      {/* Export Button positioned at the top right */}
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
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("jobSheetCreatedDate")}
            >
              Order Date {renderSortIcon("jobSheetCreatedDate")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("jobSheetNumber")}
            >
              Job Sheet Number {renderSortIcon("jobSheetNumber")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("deliveryDateTime")}
            >
              Delivery Date {renderSortIcon("deliveryDateTime")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("clientCompanyName")}
            >
              Client Company Name {renderSortIcon("clientCompanyName")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("eventName")}
            >
              Event Name {renderSortIcon("eventName")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("product")}
            >
              Product {renderSortIcon("product")}
            </th>
            <th className="p-2 border border-gray-300">
              Product Expected In Hand
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("brandingType")}
            >
              Branding Type {renderSortIcon("brandingType")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("brandingVendor")}
            >
              Branding Vendor {renderSortIcon("brandingVendor")}
            </th>
            <th className="p-2 border border-gray-300">
              Expected Post Branding in Ace
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("schedulePickUp")}
            >
              Schedule Pick Up Date {renderSortIcon("schedulePickUp")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("remarks")}
            >
              Remarks {renderSortIcon("remarks")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("status")}
            >
              Status {renderSortIcon("status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((record) => (
            <tr key={record._id} className="bg-green-200">
              <td className="p-2 border border-gray-300">
                {displayDate(record.jobSheetCreatedDate)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.jobSheetNumber)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayDate(record.deliveryDateTime)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.clientCompanyName)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.eventName)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.product)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayDate(record.expectedReceiveDate)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.brandingType)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.brandingVendor)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.expectedPostBranding)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayDate(record.schedulePickUp)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.remarks)}
              </td>
              <td className="p-2 border border-gray-300">
                {displayText(record.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClosedProductionJobSheetTable;
