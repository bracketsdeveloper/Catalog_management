// components/paymentfollowup/PaymentFollowUpTable.js
import React, { useState } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";

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

export default function PaymentFollowUpTable({
  rows,
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
}) {
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);

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
              label="Due Date"
              field="dueDate"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Over Due Since"
              field="overDueSince"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Follow Ups"
              field="followUps"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <HeadCell
              label="Payment Received"
              field="paymentReceived"
              {...{ sortField, sortOrder, toggle: toggleSort }}
            />
            <th className="px-2 py-1 border border-gray-300 bg-gray-50">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const latestFollowUp = r.followUps?.length
              ? r.followUps.reduce((latest, current) =>
                  new Date(current.updatedOn) > new Date(latest.updatedOn)
                    ? current
                    : latest
                )
              : null;

            return (
              <tr key={r._id} className="hover:bg-gray-100">
                <Cell val={r.invoiceNumber} />
                <Cell val={r.invoiceDate} />
                <Cell val={r.invoiceAmount} />
                <Cell val={r.invoiceMailed} />
                <Cell val={r.dueDate} />
                <Cell val={r.overDueSince} />
                <td
                  className="px-2 py-1 border border-gray-300 whitespace-normal break-words cursor-pointer text-blue-600 hover:underline"
                  onClick={() =>
                    latestFollowUp ? setSelectedFollowUp(latestFollowUp) : null
                  }
                >
                  {latestFollowUp ? fmt(latestFollowUp.date) : "-"}
                </td>
            
                <Cell val={r.paymentReceived} />
                <td className="px-2 py-1 border border-gray-300">
                  <button onClick={() => onEdit(r)}>
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}

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

      {/* Follow-Up Note Modal */}
      {selectedFollowUp && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md relative text-xs">
            <button
              onClick={() => setSelectedFollowUp(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
            <h3 className="text-md font-bold mb-2">Latest Follow-Up Note</h3>
            <div className="mb-2">
              <label className="text-gray-500">Date:</label>
              <div>{fmt(selectedFollowUp.date)}</div>
            </div>
            <div className="mb-2">
              <label className="text-gray-500">Note:</label>
              <div>{selectedFollowUp.note || "-"}</div>
            </div>
            <div className="mb-2">
              <label className="text-gray-500">By:</label>
              <div>{selectedFollowUp.by || "-"}</div>
            </div>
            <div className="mb-2">
              <label className="text-gray-500">Updated On:</label>
              <div>{fmt(selectedFollowUp.updatedOn)}</div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedFollowUp(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
