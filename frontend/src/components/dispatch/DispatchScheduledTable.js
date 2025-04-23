// components/dispatch/DispatchScheduledTable.js
import React from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";

/* ───────────────────────────────────────────────────────── */
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

/* ───────────────────────────────────────────────────────── */
export default function DispatchScheduledTable({
  rows,
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
  showEdit = true,
}) {
  return (
    <div className="border border-gray-300 rounded-lg">
      <table className="w-full table-auto text-xs">
        <thead>
          <tr>
            <HeadCell label="Batch / Full" field="batchType" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Job Sheet Created" field="jobSheetCreatedDate" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Job Sheet #" field="jobSheetNumber" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Expected Delivery" field="expectedDeliveryDate" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Client" field="clientCompanyName" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Event" field="eventName" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Product" field="product" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Validated" field="jobSheetValidated" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Dispatch Qty" field="dispatchQty" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Sent On" field="sentOn" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Mode" field="modeOfDelivery" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="DC#" field="dcNumber" {...{ sortField, sortOrder, toggle: toggleSort }} />
            <HeadCell label="Status" field="status" {...{ sortField, sortOrder, toggle: toggleSort }} />
            {showEdit && (
              <th className="px-2 py-1 border border-gray-300 bg-gray-50">
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const key = r.pendingPackingId || r._id;
            const bg =
              r.status === "sent"
                ? "bg-green-200"
                : r.status === "pending"
                ? "bg-orange-200"
                : r.status === "alert"
                ? "bg-red-200"
                : "";
            return (
              <tr key={key} className={`${bg} hover:bg-opacity-80`}>
                <Cell val={r.batchType} />
                <Cell val={r.jobSheetCreatedDate} />
                <Cell val={r.jobSheetNumber} />
                <Cell val={r.expectedDeliveryDate} />
                <Cell val={r.clientCompanyName} />
                <Cell val={r.eventName} />
                <Cell val={r.product} />
                <Cell val={r.jobSheetValidated} />
                <Cell val={r.dispatchQty} />
                <Cell val={r.sentOn} />
                <Cell val={r.modeOfDelivery} />
                <Cell val={r.dcNumber} />
                <Cell val={r.status} />
                {showEdit && (
                  <td className="px-2 py-1 border border-gray-300">
                    <button onClick={() => onEdit(r)}>
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={showEdit ? 14 : 13}
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

/* Cell helper */
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