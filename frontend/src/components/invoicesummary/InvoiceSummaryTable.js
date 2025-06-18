import React, { useState, useMemo } from "react";
import { ArrowUpIcon, ArrowDownIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import JobSheetGlobal from "../jobsheet/globalJobsheet";
import { fmt } from "../../pages/ManageInvoiceSummary";

function formatIndianNumber(num) {
  if (!num && num !== 0) return "-";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function HeadCell({ label, field, sortField, sortOrder, toggle }) {
  const arrow =
    sortField === field ? (
      sortOrder === "asc" ? (
        <ArrowUpIcon className="h-3 w-3 inline ml-0.5" />
      ) : (
        <ArrowDownIcon className="h-3 w-3 inline ml-0.5" />
      )
    ) : null;

  const isRightAligned = field === "invoiceAmount";

  return (
    <th
      onClick={() => toggle(field)}
      className={`px-2 py-1 border border-gray-300 bg-gray-50 whitespace-nowrap cursor-pointer ${
        isRightAligned ? "text-right" : "text-left"
      }`}
    >
      {label} {arrow}
    </th>
  );
}

export default function InvoiceSummaryTable({
  rows = [],
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
  filters,
  search,
}) {
  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [headerFilters, setHeaderFilters] = useState({
    invoiceNumber: "",
    jobSheetNumber: "",
    clientCompanyName: "",
    clientName: "",
    eventName: "",
    invoiceDate: "",
    invoiceAmount: "",
    invoiceMailed: "",
    invoiceMailedOn: "",
    invoiceUploadedOnPortal: "",
    crmName: "",
  });

  const handleFilterChange = (field, value) => {
    setHeaderFilters((prev) => ({ ...prev, [field]: value.trim() }));
  };

  const filtered = useMemo(() => {
    const filteredRows = rows.filter((r) => {
      const matchesSearch = JSON.stringify(r)
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesGlobalFilters = Object.entries(filters).every(([field, value]) => {
        if (!value || (typeof value === "object" && !value.from && !value.to))
          return true;
        if (field === "jobSheetNumber") {
          return (
            (!value.from || r[field] >= value.from) &&
            (!value.to || r[field] <= value.to)
          );
        }
        if (field === "invoiceDate") {
          return (
            (!value.from || (r[field] && new Date(r[field]) >= new Date(value.from))) &&
            (!value.to || (r[field] && new Date(r[field]) <= new Date(value.to)))
          );
        }
        return r[field]?.toString().toLowerCase().includes(value.toLowerCase());
      });

      const matchesHeaderFilters = Object.entries(headerFilters).every(([field, value]) => {
        if (!value) return true;
        const cellValue = r[field]
          ? field === "invoiceDate" || field === "invoiceMailedOn"
            ? fmt(r[field]).toLowerCase()
            : field === "invoiceAmount"
            ? formatIndianNumber(r[field]).toLowerCase()
            : r[field].toString().toLowerCase()
          : "";
        return cellValue.includes(value.toLowerCase());
      });

      return matchesSearch && matchesGlobalFilters && matchesHeaderFilters;
    });
    console.log("Table filtered rows:", filteredRows);
    return filteredRows;
  }, [rows, search, filters, headerFilters]);

  const handleOpenModal = (jobSheetNumber) => {
    setSelectedJobSheetNumber(jobSheetNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobSheetNumber(null);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-x-auto">
      <table className="w-full table-auto text-xs">
        <thead>
          <tr>
            <HeadCell
              label="Invoice #"
              field="invoiceNumber"
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
              label="Client Company"
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
              label="Invoice Mailed On"
              field="invoiceMailedOn"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Uploaded on Portal"
              field="invoiceUploadedOnPortal"
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
            <th className="px-2 py-1 border border-gray-300 bg-gray-50">
              Actions
            </th>
          </tr>
          <tr>
            {[
              "invoiceNumber",
              "jobSheetNumber",
              "clientCompanyName",
              "clientName",
              "eventName",
              "invoiceDate",
              "invoiceAmount",
              "invoiceMailed",
              "invoiceMailedOn",
              "invoiceUploadedOnPortal",
              "crmName",
            ].map((field) => (
              <td key={field} className="px-2 py-1 border border-gray-300">
                <input
                  type="text"
                  value={headerFilters[field]}
                  onChange={(e) => handleFilterChange(field, e.target.value)}
                  placeholder="Search…"
                  className="w-full p-1 text-xs border rounded"
                />
              </td>
            ))}
            <td className="px-2 py-1 border border-gray-300"></td>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 ? (
            filtered.map((r) => (
              <tr key={r._id} className="hover:bg-gray-100">
                <Cell val={r.invoiceNumber} />
                <td className="px-2 py-1 border border-gray-300 whitespace-normal break-words">
                  <button
                    className="border-b text-blue-500 hover:text-blue-700"
                    onClick={() => handleOpenModal(r.jobSheetNumber)}
                  >
                    {r.jobSheetNumber || "No Number"}
                  </button>
                </td>
                <Cell val={r.clientCompanyName} />
                <Cell val={r.clientName} />
                <Cell val={r.eventName} />
                <Cell val={r.invoiceDate} />
                <Cell val={r.invoiceAmount} field="invoiceAmount" />
                <Cell val={r.invoiceMailed} />
                <Cell val={r.invoiceMailedOn} />
                <Cell val={r.invoiceUploadedOnPortal} />
                <Cell val={r.crmName} />
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
                colSpan={12}
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

function Cell({ val, field }) {
  const isRightAligned = field === "invoiceAmount";

  return (
    <td
      className={`px-2 py-1 border border-gray-300 whitespace-normal break-words ${
        isRightAligned ? "text-right" : ""
      }`}
    >
      {val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
        ? fmt(val)
        : field === "invoiceAmount"
        ? formatIndianNumber(val)
        : val ?? "-"}
    </td>
  );
}