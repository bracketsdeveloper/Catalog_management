// components/productionjobsheet/ProductionJobSheetInvoiceTable.jsx
import React from "react";
import * as XLSX from "xlsx";

const txt = (v) => (v && v !== "-" ? v : "");
const dte = (v) => (!v || v === "-" ? "" : new Date(v).toLocaleDateString());

const ProductionJobSheetInvoiceTable = ({
  data,
  sortConfig,
  onSortChange,
  onActionClick,
}) => {
  const sortIcon = (f) =>
    sortConfig.key === f ? (
      sortConfig.direction === "asc" ? (
        <span className="ml-1 text-xs">▲</span>
      ) : (
        <span className="ml-1 text-xs">▼</span>
      )
    ) : (
      <span className="ml-1 opacity-50 text-xs">↕</span>
    );

  const exportToExcel = () => {
    const exp = data.map((i) => ({
      "Order Confirmation Date": dte(i.orderConfirmationDate),
      "Job Sheet": txt(i.jobSheetNumber),
      "Client Name": txt(i.clientCompanyName),
      "Event Name": txt(i.eventName),
      "Product Name": txt(i.product),
      "Qty Required": i.qtyRequired ?? "",
      "Qty Ordered": i.qtyOrdered ?? "",
      "Source From": txt(i.sourceFrom),
      Cost: i.cost ?? "",
      "Negotiated Cost": i.negotiatedCost ?? "",
      "Payment Modes":
        i.paymentModes?.length ? i.paymentModes.map((p) => p.mode).join(", ") : "",
      "Vendor Invoice Number": txt(i.vendorInvoiceNumber),
      "Vendor Invoice Received": txt(i.vendorInvoiceReceived),
    }));
    const ws = XLSX.utils.json_to_sheet(exp);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "ProductionJobSheetInvoice.xlsx");
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
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("orderConfirmationDate")}>
              Order Confirmation Date {sortIcon("orderConfirmationDate")}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("jobSheetNumber")}>
              Job Sheet {sortIcon("jobSheetNumber")}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("clientCompanyName")}>
              Client Name {sortIcon("clientCompanyName")}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("eventName")}>
              Event Name {sortIcon("eventName")}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("product")}>
              Product Name {sortIcon("product")}
            </th>
            <th className="p-2 border">Qty Req</th>
            <th className="p-2 border">Qty Ord</th>
            <th className="p-2 border">Source From</th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("cost")}>
              Cost {sortIcon("cost")}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("negotiatedCost")}>
              Negotiated Cost {sortIcon("negotiatedCost")}
            </th>
            <th className="p-2 border">Payment Mode</th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("vendorInvoiceNumber")}>
              Vendor Invoice Number {sortIcon("vendorInvoiceNumber")}
            </th>
            <th className="p-2 border cursor-pointer" onClick={() => onSortChange("vendorInvoiceReceived")}>
              Vendor Invoice Received {sortIcon("vendorInvoiceReceived")}
            </th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((i) => {
            const bg =
              i.vendorInvoiceReceived?.toLowerCase() === "yes"
                ? "bg-green-100"
                : "bg-white";
            return (
              <tr key={i._id} className={bg}>
                <td className="p-2 border">{dte(i.orderConfirmationDate)}</td>
                <td className="p-2 border">{txt(i.jobSheetNumber)}</td>
                <td className="p-2 border">{txt(i.clientCompanyName)}</td>
                <td className="p-2 border">{txt(i.eventName)}</td>
                <td className="p-2 border">{txt(i.product)}</td>
                <td className="p-2 border">{i.qtyRequired ?? ""}</td>
                <td className="p-2 border">{i.qtyOrdered ?? ""}</td>
                <td className="p-2 border">{txt(i.sourceFrom)}</td>
                <td className="p-2 border">{i.cost ?? ""}</td>
                <td className="p-2 border">{i.negotiatedCost ?? ""}</td>
                <td className="p-2 border">
                  {i.paymentModes?.length
                    ? i.paymentModes.map((p) => p.mode).join(", ")
                    : ""}
                </td>
                <td className="p-2 border">{txt(i.vendorInvoiceNumber)}</td>
                <td className="p-2 border">{txt(i.vendorInvoiceReceived)}</td>
                <td className="p-2 border text-center">
                  <button onClick={() => onActionClick(i)} className="focus:outline-none">
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
