// components/productionjobsheet/ProductionJobSheetInvoiceTable.jsx
import React from "react";
import * as XLSX from "xlsx";

// Helper functions for clean display.
function displayText(value) {
  return value && value !== "-" ? value : "";
}
function displayDate(value) {
  if (!value || value === "-") return "";
  const dateObj = new Date(value);
  return isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleDateString();
}

const ProductionJobSheetInvoiceTable = ({ data, sortConfig, onSortChange, onActionClick }) => {
  const renderSortIcon = (field) => {
    if (sortConfig.key !== field) {
      return <span className="ml-1 opacity-50 text-xs">↕</span>;
    }
    return sortConfig.direction === "asc" ? (
      <span className="ml-1 text-xs">▲</span>
    ) : (
      <span className="ml-1 text-xs">▼</span>
    );
  };

  // Export all rows (regardless of filters) to Excel.
  const exportToExcel = () => {
    const exportData = data.map((inv) => ({
      "Order Confirmation Date": displayDate(inv.orderConfirmationDate),
      "Job Sheet": displayText(inv.jobSheetNumber),
      "Client Name": displayText(inv.clientCompanyName),
      "Event Name": displayText(inv.eventName),
      "Product Name": displayText(inv.product),
      "Source From": displayText(inv.sourceFrom),
      "Cost": inv.cost || "",
      "Negotiated Cost": inv.negotiatedCost || "",
      "Payment Modes":
        inv.paymentModes && inv.paymentModes.length > 0
          ? inv.paymentModes.map((pm) => pm.mode).join(", ")
          : "",
      "Vendor Invoice Number": displayText(inv.vendorInvoiceNumber),
      "Vendor Invoice Received": displayText(inv.vendorInvoiceReceived),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ProductionJobSheetInvoice");
    XLSX.writeFile(workbook, "ProductionJobSheetInvoice.xlsx");
  };

  return (
    <>
      <div className="mb-2">
        <button
          onClick={exportToExcel}
          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
        >
          Export to Excel
        </button>
      </div>
      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("orderConfirmationDate")}
            >
              Order Confirmation Date {renderSortIcon("orderConfirmationDate")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("jobSheetNumber")}
            >
              Job Sheet {renderSortIcon("jobSheetNumber")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("clientCompanyName")}
            >
              Client Name {renderSortIcon("clientCompanyName")}
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
              Product Name {renderSortIcon("product")}
            </th>
            <th className="p-2 border border-gray-300">Source From</th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("cost")}
            >
              Cost {renderSortIcon("cost")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("negotiatedCost")}
            >
              Negotiated Cost {renderSortIcon("negotiatedCost")}
            </th>
            <th className="p-2 border border-gray-300">Payment Mode</th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("vendorInvoiceNumber")}
            >
              Vendor Invoice Number {renderSortIcon("vendorInvoiceNumber")}
            </th>
            <th
              className="p-2 border border-gray-300 cursor-pointer"
              onClick={() => onSortChange("vendorInvoiceReceived")}
            >
              Vendor Invoice Received {renderSortIcon("vendorInvoiceReceived")}
            </th>
            <th className="p-2 border border-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((inv) => {
            // If vendorInvoiceReceived is "Yes" (case-insensitive), use a green background.
            const rowBg = inv.vendorInvoiceReceived &&
              inv.vendorInvoiceReceived.toLowerCase() === "yes"
              ? "bg-green-100"
              : "bg-white";
            return (
              <tr key={inv._id} className={rowBg}>
                <td className="p-2 border border-gray-300">
                  {displayDate(inv.orderConfirmationDate)}
                </td>
                <td className="p-2 border border-gray-300">{displayText(inv.jobSheetNumber)}</td>
                <td className="p-2 border border-gray-300">{displayText(inv.clientCompanyName)}</td>
                <td className="p-2 border border-gray-300">{displayText(inv.eventName)}</td>
                <td className="p-2 border border-gray-300">{displayText(inv.product)}</td>
                <td className="p-2 border border-gray-300">{displayText(inv.sourceFrom)}</td>
                <td className="p-2 border border-gray-300">{inv.cost || ""}</td>
                <td className="p-2 border border-gray-300">{inv.negotiatedCost || ""}</td>
                <td className="p-2 border border-gray-300">
                  {inv.paymentModes && inv.paymentModes.length > 0
                    ? inv.paymentModes.map((pm) => pm.mode).join(", ")
                    : ""}
                </td>
                <td className="p-2 border border-gray-300">{displayText(inv.vendorInvoiceNumber)}</td>
                <td className="p-2 border border-gray-300">{displayText(inv.vendorInvoiceReceived)}</td>
                <td className="p-2 border border-gray-300 text-center">
                  <button onClick={() => onActionClick(inv)} className="focus:outline-none">
                    ⋮
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default ProductionJobSheetInvoiceTable;
