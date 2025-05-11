// components/delivery/DeliveryReportsTable.js
import React, { useState } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

function Head({ label, field, sortField, sortOrder, toggleSort }) {
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
      onClick={() => toggleSort(field)}
      className="px-2 py-1 border border-gray-300 bg-gray-50 text-left whitespace-nowrap cursor-pointer"
    >
      {label}
      {arrow}
    </th>
  );
}

export default function DeliveryReportsTable({
  rows,
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
  onShowFollowUps,
  onShowExcel,
}) {
  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [headerFilters, setHeaderFilters] = useState({
    batchType: "",
    jobSheetNumber: "",
    clientCompanyName: "",
    eventName: "",
    product: "",
    dispatchQty: "",
    deliveredSentThrough: "",
    dcNumber: "",
    status: "",
  });

  const handleOpenModal = (jobSheetNumber) => {
    setSelectedJobSheetNumber(jobSheetNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobSheetNumber(null);
  };

  const FilterRow = () => (
    <tr>
      {Object.keys(headerFilters).map((key) => (
        <td key={key} className="px-2 py-1 border border-gray-300">
          <input
            type="text"
            value={headerFilters[key]}
            onChange={(e) => 
              setHeaderFilters({...headerFilters, [key]: e.target.value})
            }
            className="w-full p-1 text-xs border rounded"
            placeholder="Filter..."
          />
        </td>
      ))}
      <td className="px-2 py-1 border border-gray-300"></td>
    </tr>
  );

  const filteredRows = rows.filter(row => {
    return Object.entries(headerFilters).every(([key, value]) => {
      if (!value) return true;
      const cellValue = String(row[key] || "").toLowerCase();
      return cellValue.includes(value.toLowerCase());
    });
  });

  return (
    <div className="border border-gray-300 rounded-lg">
      <table className="w-full table-auto text-xs">
        <thead>
          <tr>
            <Head label="Batch / Full" field="batchType" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Job Sheet #" field="jobSheetNumber" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Client" field="clientCompanyName" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Event" field="eventName" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Product" field="product" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Dispatch Qty" field="dispatchQty" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Sent Through" field="deliveredSentThrough" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="DC#" field="dcNumber" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Latest Follow-up" field="latestFollowUp" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Delivered On" field="deliveredOn" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Excel File" field="excelFileName" {...{ sortField, sortOrder, toggleSort }} />
            <Head label="Status" field="status" {...{ sortField, sortOrder, toggleSort }} />
            <th className="px-2 py-1 border border-gray-300 bg-gray-50">Actions</th>
          </tr>
          <FilterRow />
        </thead>

        <tbody>
          {filteredRows.map((r) => {
            const key = r.dispatchId || r._id;
            const bg =
              r.status === "Delivered"
                ? "bg-green-200"
                : r.status === "Pending"
                ? "bg-orange-200"
                : r.status === "Alert"
                ? "bg-red-200"
                : "";
            return (
              <tr key={key} className={`${bg} hover:bg-opacity-80`}>
                <Cell val={r.batchType} />
                <button
                  className="border-b text-blue-500 hover:text-blue-700"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenModal(r.jobSheetNumber);
                  }}
                >
                  <Cell val={(r.jobSheetNumber) || "No Number"} />
                </button>
                <Cell val={r.clientCompanyName} />
                <Cell val={r.eventName} />
                <Cell val={r.product} />
                <Cell val={r.dispatchQty} />
                <Cell val={r.deliveredSentThrough} />
                <Cell val={r.dcNumber} />
                <td
                  className="px-2 py-1 border border-gray-300 text-blue-600 underline cursor-pointer whitespace-nowrap"
                  onClick={() => onShowFollowUps(r)}
                >
                  {r.latestFollowUp ? date(r.latestFollowUp) : "-"}
                </td>
                <Cell val={r.deliveredOn} />
                <td
                  className="px-2 py-1 border border-gray-300 text-blue-600 underline cursor-pointer"
                  onClick={() => r.excelData?.length && onShowExcel(r)}
                >
                  {r.excelFileName || "-"}
                </td>
                <Cell val={r.status} />
                <td className="px-2 py-1 border border-gray-300">
                  <button onClick={() => onEdit(r)}>
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
          {filteredRows.length === 0 && (
            <tr>
              <td
                colSpan={13}
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
        ? date(val)
        : val ?? "-"}
    </td>
  );
}

function date(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}