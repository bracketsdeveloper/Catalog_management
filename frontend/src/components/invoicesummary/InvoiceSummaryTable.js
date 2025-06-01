import React, { useState, useMemo } from "react";
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
      onClick={() => toggle(field)}
      className="px-2 py-1 border border-gray-300 bg-gray-50 text-left whitespace-nowrap cursor-pointer"
    >
      {label}
      {arrow}
    </th>
  );
}

export default function InvoiceSummaryTable({
  rows = [],
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
}) {
  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // header-level filters
  const [headerFilters, setHeaderFilters] = useState({
    jobSheetNumber: "",
    clientCompanyName: "",
    clientName: "",
    eventName: "",
    invoiceNumber: "",
    invoiceDate: "",
    invoiceAmount: "",
    invoiceMailed: "",
    invoiceMailedOn: "", // New field
    invoiceUploadedOnPortal: "",
    crmName: "",
  });

  const handleFilterChange = (field, value) => {
    setHeaderFilters((h) => ({ ...h, [field]: value }));
  };

  // apply header filters
  const filtered = useMemo(() => {
    return rows.filter((r) =>
      Object.entries(headerFilters).every(([field, value]) => {
        if (!value) return true;
        const cell = r[field] ?? "";
        return cell.toString().toLowerCase().includes(value.toLowerCase());
      })
    );
  }, [rows, headerFilters]);

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
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Job Sheet #"
              field="jobSheetNumber"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Client Company"
              field="clientCompanyName"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Client Name"
              field="clientName"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Event"
              field="eventName"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Invoice Date"
              field="invoiceDate"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Invoice Amount"
              field="invoiceAmount"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Invoice Mailed"
              field="invoiceMailed"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Invoice Mailed On"
              field="invoiceMailedOn"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Uploaded on Portal"
              field="invoiceUploadedOnPortal"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="CRM Name"
              field="crmName"
              {...{ sortField, sortOrder, toggle: toggleSort }}
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
              "invoiceMailedOn", // New field
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
              <tr
                key={`${r._id}-${r.invoiceNumber}`}
                className="hover:bg-gray-100"
              >
                <Cell val={r.invoiceNumber} />
                <td className="px-2 py-1 border border-gray-300 whitespace-normal break-words">
                  <button
                    className="border-b text-blue-500 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenModal(r.jobSheetNumber);
                    }}
                  >
                    {r.jobSheetNumber || "No Number"}
                  </button>
                </td>
                <Cell val={r.clientCompanyName} />
                <Cell val={r.clientName} />
                <Cell val={r.eventName} />
                <Cell val={r.invoiceDate} />
                <Cell val={r.invoiceAmount} />
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
                colSpan={12} // Updated for new column
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
        : val ?? "-"}
    </td>
  );
}

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}