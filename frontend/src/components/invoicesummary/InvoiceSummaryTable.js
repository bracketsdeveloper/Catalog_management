// components/invoicessummary/InvoicesSummaryTable.js
import React from "react";
import { ArrowUpIcon, ArrowDownIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";

function HeadCell({ label, field, sortField, sortOrder, toggle }) {
  const arrow =
    sortField === field ? (
      sortOrder === "asc" ? (
        <ArrowUpIcon className="h-3 w-3 inline ml-0.5" />
      ) : (
        <ArrowDownIcon className="h-3 w-3 inline ml-0.5" />
      )
    ) : null;

  return (
    <th
      className="px-2 py-1 border border-gray-300 bg-gray-50 text-left whitespace-nowrap"
      onClick={() => toggle(field)}
    >
      <div className="flex items-center cursor-pointer">
        {label}
        {arrow}
      </div>
    </th>
  );
}

export default function InvoicesSummaryTable({
  rows,
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
}) {
  return (
    <div className="border border-gray-300 rounded-lg overflow-x-auto">
      <table className="w-full table-auto text-xs">
        <thead>
          <tr>
            <HeadCell
              label="Job Sheet #"
              field="jobSheetNumber"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Client Company Name"
              field="clientCompanyName"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Event Name"
              field="eventName"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Invoice #"
              field="invoiceNumber"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Invoice Date"
              field="invoiceDate"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Invoice Amount"
              field="invoiceAmount"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Invoice Mailed"
              field="invoiceMailed"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Invoice Uploaded on Portal"
              field="invoiceUploadedOnPortal"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <th className="px-2 py-1 border border-gray-300 bg-gray-50">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} className="hover:bg-gray-100">
              <Cell val={r.jobSheetNumber} />
              <Cell val={r.clientCompanyName} />
              <Cell val={r.eventName} />
              <Cell val={r.invoiceNumber} />
              <Cell val={r.invoiceDate} />
              <Cell val={r.invoiceAmount} />
              <Cell val={r.invoiceMailed} />
              <Cell val={r.invoiceUploadedOnPortal} />
              <td className="px-2 py-1 border border-gray-300">
                <button onClick={() => onEdit(r)}>
                  <EllipsisVerticalIcon className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="text-center py-4 text-gray-500 border border-gray-300"
              >
                No records
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ val }) {
  return (
    <td className="px-2 py-1 border border-gray-300 whitespace-normal break-words">
      {val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
        ? fmt(val)
        : val ?? "-"}
    </td>
  );
}

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}