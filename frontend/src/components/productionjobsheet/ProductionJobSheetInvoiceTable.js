import React, { useState } from "react";
import * as XLSX from "xlsx";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

/* utils */
const t = (v) => (v && v !== "-" ? v : "");
const d = (v) => (!v || v === "-" ? "" : new Date(v).toLocaleDateString());

/* header filter row */
function FilterRow({ filters, onChange }) {
  const cols = [
    "orderConfirmationDate",
    "jobSheetNumber",
    "clientCompanyName",
    "eventName",
    "product",
    "qtyRequired",
    "qtyOrdered",
    "sourceFrom",
    "cost",
    "negotiatedCost",
    "vendorInvoiceNumber",
    "vendorInvoiceReceived",
    "paymentStatus",
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

export default function ProductionJobSheetInvoiceTable({
  data,
  sortConfig,
  onSortChange,
  onActionClick,
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
        "Branding Vendor": i.brandingVendor,
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
      <div className="mb-2">
        <button onClick={exportExcel} className="bg-green-600 text-white text-xs px-4 py-2 rounded">
          Export&nbsp;to&nbsp;Excel
        </button>
      </div>

      <table className="min-w-full border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            {[
              ["orderConfirmationDate", "Order Confirmation Date"],
              ["jobSheetNumber", "Job Sheet"],
              ["clientCompanyName", "Client Name"],
              ["eventName", "Event Name"],
              ["product", "Product Name"],
            ].map(([k, l]) => (
              <th key={k} className="p-2 border cursor-pointer" onClick={() => onSortChange(k)}>
                {l} {icon(k)}
              </th>
            ))}
            <th className="p-2 border">Qty Req</th>
            <th className="p-2 border">Qty Ord</th>
            <th className="p-2 border">Branding Vendor</th>
            {[
              ["cost", "Cost"],
              ["negotiatedCost", "Negotiated Cost"],
            ].map(([k, l]) => (
              <th key={k} className="p-2 border cursor-pointer" onClick={() => onSortChange(k)}>
                {l} {icon(k)}
              </th>
            ))}
            <th className="p-2 border">Payment Mode</th>
            {[
              ["vendorInvoiceNumber", "Vendor Invoice Number"],
              ["vendorInvoiceReceived", "Vendor Invoice Received"],
              ["paymentStatus", "Payment Status"],
            ].map(([k, l]) => (
              <th key={k} className="p-2 border cursor-pointer" onClick={() => onSortChange(k)}>
                {l} {icon(k)}
              </th>
            ))}
            {/* <th className="p-2 border">Payment Status</th> */}
            <th className="p-2 border">Actions</th>
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
              <td className="p-2 border">{i.brandingVendor}</td>
              <td className="p-2 border">{i.cost}</td>
              <td className="p-2 border">{i.negotiatedCost}</td>
              <td className="p-2 border">
                {i.paymentModes?.map((p) => p.mode).join(", ")}
              </td>
              <td className="p-2 border">{t(i.vendorInvoiceNumber)}</td>
              <td className="p-2 border">{t(i.vendorInvoiceReceived)}</td>
              <td className="p-2 border">{i.paymentStatus}</td>
              <td className="p-2 border text-center">
                <button onClick={() => onActionClick(i)} className="focus:outline-none">
                  ⋮
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

         <JobSheetGlobal
                jobSheetNumber={selectedJobSheetNumber} 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
              />
      
    </>
  );
}
