import React, { useState } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

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

export default function InvoiceFollowUpTable({
  rows = [], // Default to empty array
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
}) {
  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValues, setSearchValues] = useState({});

  const handleOpenModal = (jobSheetNumber) => {
    setSelectedJobSheetNumber(jobSheetNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobSheetNumber(null);
  };

  const handleSearchChange = (field, value) => {
    setSearchValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-x-auto">
      <table className="w-full table-auto text-xs">
        <thead>
          <tr>
            <HeadCell
              label="Order Date"
              field="orderDate"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Job Sheet #"
              field="jobSheetNumber"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Client (Co.)"
              field="clientCompanyName"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Client Name"
              field="clientName"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Event"
              field="eventName"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Quotation #"
              field="quotationNumber"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Quotation Total"
              field="quotationTotal"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="CRM Name"
              field="crmName"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Product"
              field="product"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Partial Qty"
              field="partialQty"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Dispatched On"
              field="dispatchedOn"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Delivered Through"
              field="deliveredThrough"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="PO Status"
              field="poStatus"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Invoice Generated"
              field="invoiceGenerated"
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
              label="Pending From (days)"
              field="pendingFromDays"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <th className="px-2 py-1 border border-gray-300 bg-gray-50">
              Actions
            </th>
          </tr>
          <tr>
            {[
              "orderDate",
              "jobSheetNumber",
              "clientCompanyName",
              "clientName",
              "eventName",
              "quotationNumber",
              "quotationTotal",
              "crmName",
              "product",
              "partialQty",
              "dispatchedOn",
              "deliveredThrough",
              "poStatus",
              "invoiceGenerated",
              "invoiceNumber",
              "pendingFromDays",
            ].map((field) => (
              <td key={field} className="px-2 py-1 border border-gray-300">
                <input
                  type="text"
                  placeholder={`Search ${field}`}
                  className="w-full p-1 border border-gray-300 rounded"
                  value={searchValues[field] || ""}
                  onChange={(e) => handleSearchChange(field, e.target.value)}
                />
              </td>
            ))}
            <td className="px-2 py-1 border border-gray-300"></td>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows
              .filter((row) => {
                return Object.entries(searchValues).every(([field, value]) => {
                  if (!value) return true;
                  const rowValue = row[field]?.toString().toLowerCase() || "";
                  return rowValue.includes(value.toLowerCase());
                });
              })
              .map((r) => (
                <tr
                  key={r.dispatchId || r._id}
                  className={`hover:bg-gray-100 ${
                    r.invoiceGenerated === "Yes" ? "bg-green-100" : ""
                  }`}
                >
                  <Cell val={r.orderDate} />
                  <button
                    className="border-b text-blue-500 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenModal(r.jobSheetNumber);
                    }}
                  >
                    <Cell val={r.jobSheetNumber || "No Number"} />
                  </button>
                  <Cell val={r.clientCompanyName} />
                  <Cell val={r.clientName} />
                  <Cell val={r.eventName} />
                  <Cell val={r.quotationNumber} />
                  <Cell val={r.quotationTotal} />
                  <Cell val={r.crmName} />
                  <Cell val={r.product} />
                  <Cell val={r.partialQty} />
                  <Cell val={r.dispatchedOn} />
                  <Cell val={r.deliveredThrough} />
                  <Cell val={r.poStatus} />
                  <Cell val={r.invoiceGenerated} />
                  <Cell val={r.invoiceNumber} />
                  <Cell val={r.pendingFromDays} />
                  <td className="px-2 py-1 border border-gray-300">
                    <button onClick={() => onEdit(r)}>
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
          ) : (
            <tr>
              <td
                colSpan={17}
                className="text-center py-4 text-gray-500 border border-gray-300"
              >
                No records
              </td>
            </tr>
          )}
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

function Cell({ val }) {
  return (
    <td className="px-2 py-1 border border-gray-300 whitespace-normal break-words">
      {val instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(val)
        ? fmt(val)
        : typeof val === 'number' && !isNaN(val)
          ? val.toFixed(2)
          : val ?? "-"}
    </td>
  );
}

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}