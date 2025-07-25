import React, { useState, useMemo } from "react";
import { ArrowUpIcon, ArrowDownIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import JobSheetGlobal from "../jobsheet/globalJobsheet";

function formatIndianNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "-";
  
  // Convert to string and split by decimal point
  const [whole, decimal] = num.toString().split(".");
  
  // Format the whole number part
  const lastThree = whole.substring(whole.length - 3);
  const otherNumbers = whole.substring(0, whole.length - 3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + (otherNumbers ? "," : "") + lastThree;
  
  // Add decimal part if it exists
  return decimal ? `${formatted}.${decimal}` : formatted;
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
  rows = [],
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
}) {
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [headerFilters, setHeaderFilters] = useState({
    jobSheetNumber: "",
    clientCompanyName: "",
    clientName: "",
    invoiceNumber: "",
    invoiceDate: "",
    invoiceAmount: "",
    invoiceMailed: "",
    invoiceMailedOn: "",
    dueDate: "",
    overDueSince: "",
    latestFollowUp: "",
    totalPaymentReceived: "",
    discountAllowed: "",
    TDS: "",
    remarks: "",
  });

  const handleFilterChange = (field, value) =>
    setHeaderFilters((prev) => ({ ...prev, [field]: value }));

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      return Object.entries(headerFilters).every(([field, value]) => {
        if (!value) return true;

        let cellValue;
        if (field === "latestFollowUp") {
          const fu = getLatestFollowUp(r.followUps);
          cellValue = fu ? new Date(fu.date).toISOString().split("T")[0] : "";
        } else if (
          field === "invoiceAmount" ||
          field === "totalPaymentReceived" ||
          field === "discountAllowed" ||
          field === "TDS" ||
          field === "overDueSince"
        ) {
          cellValue = parseFloat(r[field]) || 0;
        } else if (
          field === "invoiceDate" ||
          field === "dueDate" ||
          field === "invoiceMailedOn"
        ) {
          cellValue = r[field] ? new Date(r[field]).toISOString().split("T")[0] : "";
        } else {
          cellValue = r[field]?.toString().toLowerCase() || "";
        }

        if (
          field === "invoiceAmount" ||
          field === "totalPaymentReceived" ||
          field === "discountAllowed" ||
          field === "TDS" ||
          field === "overDueSince"
        ) {
          const filterNum = parseFloat(value);
          if (isNaN(filterNum)) return true;
          return cellValue === filterNum;
        } else if (
          field === "invoiceDate" ||
          field === "dueDate" ||
          field === "invoiceMailedOn" ||
          field === "latestFollowUp"
        ) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
          return cellValue === value;
        } else {
          return cellValue.includes(value.toLowerCase());
        }
      });
    });
  }, [rows, headerFilters]);

  const getLatestFollowUp = (followUps = []) => {
    if (!followUps.length) return null;
    return followUps.reduce((latest, current) =>
      new Date(current.updatedOn) > new Date(latest.updatedOn) ? current : latest
    );
  };

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
              label="Invoice Mailed On"
              field="invoiceMailedOn"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Due Date"
              field="dueDate"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Over Due Since"
              field="overDueSince"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Latest Follow-Up"
              field="latestFollowUp"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Payment Received"
              field="totalPaymentReceived"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Discount Allowed"
              field="discountAllowed"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="TDS"
              field="TDS"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <HeadCell
              label="Remarks"
              field="remarks"
              sortField={sortField}
              sortOrder={sortOrder}
              toggle={toggleSort}
            />
            <th className="px-2 py-1 border border-gray-300 bg-gray-50">Actions</th>
          </tr>
          <tr>
            {[
              "jobSheetNumber",
              "clientCompanyName",
              "clientName",
              "invoiceNumber",
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
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="date"
                value={headerFilters.invoiceDate}
                onChange={(e) => handleFilterChange("invoiceDate", e.target.value)}
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="number"
                value={headerFilters.invoiceAmount}
                onChange={(e) => handleFilterChange("invoiceAmount", e.target.value)}
                placeholder="Amount"
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <select
                value={headerFilters.invoiceMailed}
                onChange={(e) => handleFilterChange("invoiceMailed", e.target.value)}
                className="w-full p-1 text-xs border rounded"
              >
                <option value="">Any</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="date"
                value={headerFilters.invoiceMailedOn}
                onChange={(e) => handleFilterChange("invoiceMailedOn", e.target.value)}
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="date"
                value={headerFilters.dueDate}
                onChange={(e) => handleFilterChange("dueDate", e.target.value)}
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="number"
                value={headerFilters.overDueSince}
                onChange={(e) => handleFilterChange("overDueSince", e.target.value)}
                placeholder="Days"
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="date"
                value={headerFilters.latestFollowUp}
                onChange={(e) => handleFilterChange("latestFollowUp", e.target.value)}
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="number"
                value={headerFilters.totalPaymentReceived}
                onChange={(e) => handleFilterChange("totalPaymentReceived", e.target.value)}
                placeholder="Amount"
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="number"
                value={headerFilters.discountAllowed}
                onChange={(e) => handleFilterChange("discountAllowed", e.target.value)}
                placeholder="Amount"
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="number"
                value={headerFilters.TDS}
                onChange={(e) => handleFilterChange("TDS", e.target.value)}
                placeholder="Amount"
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300">
              <input
                type="text"
                value={headerFilters.remarks}
                onChange={(e) => handleFilterChange("remarks", e.target.value)}
                placeholder="Search…"
                className="w-full p-1 text-xs border rounded"
              />
            </td>
            <td className="px-2 py-1 border border-gray-300"></td>
          </tr>
        </thead>
        <tbody>
          {filteredRows.length > 0 ? (
            filteredRows.map((r) => {
              const latestFU = getLatestFollowUp(r.followUps);
              const rowKey = r._id || `${r.jobSheetNumber}-${r.invoiceNumber}`; // Unique key
              return (
                <tr key={rowKey} className="hover:bg-gray-100">
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
                  <Cell val={r.invoiceNumber} />
                  <Cell val={r.invoiceDate} />
                  <Cell val={r.invoiceAmount} field="invoiceAmount" />
                  <Cell val={r.invoiceMailed} />
                  <Cell val={r.invoiceMailedOn} />
                  <Cell val={r.dueDate} />
                  <Cell val={r.overDueSince} />
                  <td
                    className="px-2 py-1 border border-gray-300 whitespace-normal break-words cursor-pointer text-blue-600 hover:underline"
                    onClick={() => (latestFU ? setSelectedFollowUp(latestFU) : null)}
                  >
                    {latestFU ? fmt(latestFU.date) : "-"}
                  </td>
                  <Cell val={r.totalPaymentReceived} field="totalPaymentReceived" />
                  <Cell val={r.discountAllowed} field="discountAllowed" />
                  <Cell val={r.TDS} field="TDS" />
                  <Cell val={r.remarks} />
                  <td className="px-2 py-1 border border-gray-300">
                    <button onClick={() => onEdit(r)}>
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={16}
                className="text-center py-4 text-gray-500 border border-gray-300"
              >
                No records
              </td>
            </tr>
          )}
        </tbody>
      </table>

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

      <JobSheetGlobal
        jobSheetNumber={selectedJobSheetNumber}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

function Cell({ val, field }) {
  return (
    <td className={`px-2 py-1 border border-gray-300 whitespace-normal break-words ${
      field === "invoiceAmount" || 
      field === "totalPaymentReceived" || 
      field === "discountAllowed" || 
      field === "TDS" 
        ? "text-right" 
        : ""
    }`}>
      {val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
        ? fmt(val)
        : typeof val === "number" && !isNaN(val)
        ? formatIndianNumber(val)
        : val ?? "-"}
    </td>
  );
}

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
} 