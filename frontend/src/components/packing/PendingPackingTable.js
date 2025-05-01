import React, { useState } from "react";
import {
  EllipsisVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

/* --------------------------------------------------------------- */
function Header({ label, field, sortField, sortOrder, toggleSort }) {
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
      className="px-2 py-1 border border-gray-300 cursor-pointer text-left whitespace-nowrap bg-gray-50"
    >
      {label}
      {arrow}
    </th>
  );
}

/* --------------------------------------------------------------- */
export default function PendingPackingTable({
  rows,
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
  onShowFollowUps,
  showEdit = true, // new prop
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

  return (
    <div className="border border-gray-300 rounded-lg">
      <table className="w-full table-auto text-xs">
        <thead>
          <tr>
            <Header label="Job Sheet Created" field="jobSheetCreatedDate" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Job Sheet #" field="jobSheetNumber" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Expected Delivery" field="expectedDeliveryDate" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Client" field="clientCompanyName" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Event" field="eventName" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Product" field="product" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Validated" field="jobSheetValidated" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Branded Product Expected On" field="brandedProductExpectedOn" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Qty Ordered" field="qtyOrdered" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Qty to Deliver" field="qtyToBeDelivered" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Qty Rejected" field="qtyRejected" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="QC Done By" field="qcDoneBy" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Status" field="status" {...{ sortField, sortOrder, toggleSort }} />
            <Header label="Latest Follow‑up" field="latestFollowUp" {...{ sortField, sortOrder, toggleSort }} />
            {showEdit && <th className="px-2 py-1 border border-gray-300 bg-gray-50">Actions</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const key = row.productionJobSheetId || row._id;
            return (
              <tr key={key} className="hover:bg-gray-50">
                <Cell val={row.jobSheetCreatedDate} />
                <button
                    className="flex justify-center items-center text-blue-500 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenModal(row.jobSheetNumber);
                    }}
                  >
                  <Cell val=
                      {(row.jobSheetNumber) || "(No Number)"}
                      />
                    </button>
                
                <Cell val={row.expectedDeliveryDate} />
                <Cell val={row.clientCompanyName} />
                <Cell val={row.eventName} />
                <Cell val={row.product} />
                <Cell val={row.jobSheetValidated} />
                <Cell val={row.brandedProductExpectedOn} />
                <Cell val={row.qtyOrdered} />
                <Cell val={row.qtyToBeDelivered} />
                <Cell val={row.qtyRejected} />
                <Cell val={row.qcDoneBy} />
                <Cell val={row.status} />
                <td
                  className="px-2 py-1 border border-gray-300 text-blue-600 underline cursor-pointer whitespace-nowrap"
                  onClick={() => onShowFollowUps(row)}
                >
                  {row.latestFollowUp ? formatDate(row.latestFollowUp) : "-"}
                </td>
                {showEdit && (
                  <td className="px-2 py-1 border border-gray-300">
                    <button onClick={() => onEdit(row)}>
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={showEdit ? 15 : 14} className="text-center py-4 text-gray-500 border border-gray-300">
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

/* cell helper */
function Cell({ val }) {
  return (
    <td className="px-2 py-1 border border-gray-300 whitespace-normal break-words">
      {val instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(val)
        ? formatDate(val)
        : val ?? "-"}
    </td>
  );
}
function formatDate(val) {
  const d = new Date(val);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}
