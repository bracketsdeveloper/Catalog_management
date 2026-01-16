import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

/* utils */
const t = (v) => (v && v !== "-" ? v : "");
const d = (v) => (!v || v === "-" ? "" : new Date(v).toLocaleDateString());

/* header filter row - UPDATED VERSION */
function FilterRow({ filters, onChange }) {
  const dateKeys = ["orderConfirmationDate"];
  
  const cols = [
    { key: "orderConfirmationDate", type: "date" },
    { key: "jobSheetNumber", type: "text" },
    { key: "clientCompanyName", type: "text" },
    { key: "eventName", type: "text" },
    { key: "product", type: "text" },
    { key: "qtyRequired", type: "text" },
    { key: "qtyOrdered", type: "text" },
    { key: "sourceFrom", type: "text" },
    { key: "cost", type: "text" },
    { key: "negotiatedCost", type: "text" },
    { key: "paymentModes", type: "text" },
    { key: "vendorInvoiceNumber", type: "text" },
    { 
      key: "paymentStatus", 
      type: "select", 
      options: [
        { value: "", label: "All" },
        { value: "Not Paid", label: "Not Paid" },
        { value: "Partially Paid", label: "Partially Paid" },
        { value: "Fully Paid", label: "Fully Paid" }
      ]
    },
    { 
      key: "vendorInvoiceReceived", 
      type: "select", 
      options: [
        { value: "", label: "All" },
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" }
      ]
    }
  ];

  // Format date for input type="date" (YYYY-MM-DD)
  const formatDateForInput = (value) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  // Parse date from input value
  const parseDateFromInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
  };

  // Handle input changes
  const handleChange = (key, value, isDateField = false) => {
    if (isDateField) {
      const formattedValue = parseDateFromInput(value);
      onChange(key, formattedValue);
    } else {
      onChange(key, value);
    }
  };

  // Get current value for input field
  const getInputValue = (key, value, isDateField) => {
    if (isDateField && value) {
      return formatDateForInput(value);
    }
    return value || "";
  };

  return (
    <tr className="bg-gray-100">
      {cols.map(({ key, type, options }) => {
        const isDateField = dateKeys.includes(key);
        
        return (
          <th key={key} className="border px-1 py-0.5">
            {type === "date" ? (
              <input
                type="date"
                value={getInputValue(key, filters[key], isDateField)}
                onChange={(e) => handleChange(key, e.target.value, isDateField)}
                className="w-full border p-0.5 text-[10px] rounded"
                placeholder="yyyy-mm-dd"
              />
            ) : type === "select" ? (
              <select
                value={filters[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full border p-0.5 text-[10px] rounded"
              >
                {options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                value={filters[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
                className="w-full border p-0.5 text-[10px] rounded"
                placeholder="filter…"
              />
            )}
          </th>
        );
      })}
      <th className="border px-1 py-0.5"></th>
    </tr>
  );
}

export default function ProductionJobSheetInvoiceTable({
  data,
  sortConfig,
  onSortChange,
  onActionClick,
  headerFilters,
  onHeaderFilterChange,
}) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
  }, []);

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
    sortConfig.key === f ? (
      sortConfig.direction === "asc" ? (
        <span className="ml-0.5 text-xs">▲</span>
      ) : (
        <span className="ml-0.5 text-xs">▼</span>
      )
    ) : (
      <span className="ml-0.5 opacity-50 text-xs">↕</span>
    );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((i) => ({
        "Order Confirm": d(i.orderConfirmationDate),
        "Job Sheet": i.jobSheetNumber,
        Client: i.clientCompanyName,
        Event: i.eventName,
        Product: i.product,
        "Qty Req": i.qtyRequired,
        "Qty Ord": i.qtyOrdered,
        "Branding Vendor": i.sourceFrom,
        Cost: i.cost,
        "Negotiated Cost": i.negotiatedCost,
        "Payment Modes": i.paymentModes?.map((p) => p.mode).join(", "),
        "Vendor Inv #": i.vendorInvoiceNumber,
        "Inv Received": i.vendorInvoiceReceived,
        "Payment Status": i.paymentStatus,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "ProductionJobSheetInvoice.xlsx");
  };

  return (
    <>
      <div className="overflow-y-auto max-h-[calc(100vh-200px)] border rounded">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {[
                ["orderConfirmationDate", "Order Confirmation Date"],
                ["jobSheetNumber", "Job Sheet"],
                ["clientCompanyName", "Client Name"],
                ["eventName", "Event Name"],
                ["product", "Product Name"],
              ].map(([k, l]) => (
                <th key={k} className="p-2 border cursor-pointer bg-gray-50" onClick={() => onSortChange(k)}>
                  {l} {icon(k)}
                </th>
              ))}
              <th className="p-2 border bg-gray-50">Qty Req</th>
              <th className="p-2 border bg-gray-50">Qty Ord</th>
              <th className="p-2 border bg-gray-50">Branding Vendor</th>
              {[
                ["cost", "Cost"],
                ["negotiatedCost", "Negotiated Cost"],
              ].map(([k, l]) => (
                <th key={k} className="p-2 border cursor-pointer bg-gray-50" onClick={() => onSortChange(k)}>
                  {l} {icon(k)}
                </th>
              ))}
              <th className="p-2 border bg-gray-50">Payment Mode</th>
              {[
                ["vendorInvoiceNumber", "Vendor Invoice Number"],
                ["paymentStatus", "Payment Status"],
                ["vendorInvoiceReceived", "Vendor Invoice Received"],
              ].map(([k, l]) => (
                <th key={k} className="p-2 border cursor-pointer bg-gray-50" onClick={() => onSortChange(k)}>
                  {l} {icon(k)}
                </th>
              ))}
              <th className="p-2 border bg-gray-50">Actions</th>
            </tr>
            <FilterRow filters={headerFilters} onChange={onHeaderFilterChange} />
          </thead>
          <tbody>
            {data.map((i) => (
              <tr
                key={i._id}
                className={
                  (i.vendorInvoiceReceived || "no").toLowerCase() === "yes"
                    ? "bg-green-100"
                    : ""
                }
              >
                <td className="p-2 border">{d(i.orderConfirmationDate)}</td>
                <td className="p-2 border">
                  <button
                    className="border-b text-blue-500 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenModal(i.jobSheetNumber);
                    }}
                  >
                    {t(i.jobSheetNumber) || "(No Number)"}
                  </button>
                </td>
                <td className="p-2 border">{t(i.clientCompanyName)}</td>
                <td className="p-2 border">{t(i.eventName)}</td>
                <td className="p-2 border">{t(i.product)}</td>
                <td className="p-2 border">{i.qtyRequired}</td>
                <td className="p-2 border">{i.qtyOrdered}</td>
                <td className="p-2 border">{t(i.sourceFrom)}</td>
                <td className="p-2 border">{i.cost}</td>
                <td className="p-2 border">{i.negotiatedCost}</td>
                <td className="p-2 border">
                  {i.paymentModes?.map((p) => p.mode).join(", ")}
                </td>
                <td className="p-2 border">{t(i.vendorInvoiceNumber)}</td>
                <td className="p-2 border">{i.paymentStatus}</td>
                <td className="p-2 border">{t(i.vendorInvoiceReceived)}</td>
                <td className="p-2 border text-center">
                  <button onClick={() => onActionClick(i)} className="focus:outline-none">
                    ⋮
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JobSheetGlobal
        jobSheetNumber={selectedJobSheetNumber}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}