"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import JobSheetGlobal from "../jobsheet/globalJobsheet";
import PrintQuotation from "../../pages/PrintQuotation";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
  rows = [],
  sortField,
  sortOrder,
  toggleSort,
  onEdit,
  view,
}) {
  const [selectedJobSheetNumber, setSelectedJobSheetNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValues, setSearchValues] = useState({});
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [dispatchRows, setDispatchRows] = useState([]);

  const token = localStorage.getItem("token");

  // Fetch all DispatchSchedule rows
  useEffect(() => {
    async function fetchDispatchRows() {
      if (!token) {
        toast.error("No authentication token found. Please log in.");
        return;
      }
      try {
        const res = await axios.get(`${BACKEND_URL}/api/admin/dispatch-schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Fetched dispatch rows count:", res.data?.length || 0); // Debug: Log count
        setDispatchRows(res.data || []);
      } catch (err) {
        console.error("Error fetching dispatch rows:", err);
        if (err.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
          localStorage.removeItem("token");
          window.location.href = "/login"; // Adjust to your login route
        } else {
          toast.error("Failed to fetch dispatch data");
        }
      }
    }
    fetchDispatchRows();
  }, [token]);

  const handleOpenModal = (jobSheetNumber) => {
    setSelectedJobSheetNumber(jobSheetNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJobSheetNumber(null);
  };

  const handleOpenQuotationModal = (quotationId) => {
    setSelectedQuotationId(quotationId);
    setIsQuotationModalOpen(true);
  };

  const handleCloseQuotationModal = () => {
    setIsQuotationModalOpen(false);
    setSelectedQuotationId(null);
  };

  const handleSearchChange = (field, value) => {
    setSearchValues((prev) => ({ ...prev, [field]: value }));
  };

  // Debug: Log summary and sample mismatches
  useEffect(() => {
    if (view === "new" && dispatchRows.length > 0 && rows.length > 0) {
      const sentDispatches = dispatchRows.filter(d => d.status === "sent").length;
      const matchedRows = rows.filter(r =>
        dispatchRows.some(d =>
          d.status === "sent" &&
          d.jobSheetNumber?.toString().toLowerCase() === r.jobSheetNumber?.toString().toLowerCase() &&
          (d.clientCompanyName || "").toLowerCase().trim() === (r.clientCompanyName || "").toLowerCase().trim() &&
          (d.product || "").toLowerCase().trim() === (r.product || "").toLowerCase().trim() &&
          Number(d.dispatchQty || 0) === Number(r.partialQty || 0)
        )
      ).length;

      // Log sample mismatches (first non-matching sent dispatch for first row)
      if (sentDispatches > 0 && matchedRows === 0 && rows[0]) {
        const sampleDispatch = dispatchRows.find(d => d.status === "sent");
        if (sampleDispatch) {
          console.log("Sample mismatch for first row:", {
            invoice: {
              jobSheetNumber: rows[0].jobSheetNumber,
              clientCompanyName: rows[0].clientCompanyName,
              product: rows[0].product,
              partialQty: rows[0].partialQty,
              partialQtyType: typeof rows[0].partialQty,
            },
            dispatch: {
              jobSheetNumber: sampleDispatch.jobSheetNumber,
              clientCompanyName: sampleDispatch.clientCompanyName,
              product: sampleDispatch.product,
              dispatchQty: sampleDispatch.dispatchQty,
              dispatchQtyType: typeof sampleDispatch.dispatchQty,
              status: sampleDispatch.status,
            },
          });
        }
      }

      console.log("Dispatch summary:", {
        sentDispatches,
        matchedRows,
        totalRows: rows.length,
        totalDispatches: dispatchRows.length,
      });
    }
  }, [view, dispatchRows, rows]);

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
            <HeadCell
              label="Remarks"
              field="remarks"
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
              "remarks",
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
              .map((r, index) => {
                // Check if there's a matching DispatchSchedule row with status "sent"
                const hasSentDispatch = dispatchRows.some((d) =>
                  d.status === "sent" &&
                  d.jobSheetNumber?.toString().toLowerCase() === r.jobSheetNumber?.toString().toLowerCase() &&
                  (d.clientCompanyName || "").toLowerCase().trim() === (r.clientCompanyName || "").toLowerCase().trim() &&
                  (d.product || "").toLowerCase().trim() === (r.product || "").toLowerCase().trim() &&
                  Number(d.dispatchQty || 0) === Number(r.partialQty || 0)
                );

                // Determine row background color
                const bgClass =
                  view === "new" && hasSentDispatch
                    ? "bg-red-300" // Stronger red for visibility
                    : r.invoiceGenerated === "Yes"
                    ? "bg-green-100" // Green if invoice generated
                    : ""; // Default (no color)

                return (
                  <tr
                    key={r._id || `row-${index}`} // Ensure unique key
                    className={`hover:bg-gray-100 ${bgClass}`}
                  >
                    <Cell val={r.orderDate} />
                    <td className="px-2 py-1 border border-gray-300">
                      <button
                        className="text-blue-500 hover:text-blue-700"
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
                    <td className="px-2 py-1 border border-gray-300">
                      <button
                        className="text-blue-500 hover:text-blue-700"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenQuotationModal(r.quotationId);
                        }}
                      >
                        {r.quotationNumber}
                      </button>
                    </td>
                    <Cell val={r.quotationTotal} />
                    <Cell val={r.crmName} />
                    <Cell val={r.product} />
                    <Cell val={r.partialQty} field="partialQty" />
                    <Cell val={r.dispatchedOn} />
                    <Cell val={r.deliveredThrough} />
                    <Cell val={r.poStatus} />
                    <Cell val={r.invoiceGenerated} />
                    <Cell val={r.invoiceNumber} />
                    <Cell val={r.pendingFromDays} field="pendingFromDays" />
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
            <tr key="no-records">
              <td
                colSpan={18}
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

      {isQuotationModalOpen && selectedQuotationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-[90vw] h-[90vh] overflow-hidden relative">
            <button
              onClick={handleCloseQuotationModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <iframe
              src={`/admin-dashboard/print-quotation/${selectedQuotationId}`}
              className="w-full h-full border-0"
              title="Quotation Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ val, field }) {
  return (
    <td className="px-2 py-1 border border-gray-300 whitespace-normal break-words">
      {val instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(val)
        ? fmt(val)
        : typeof val === "number" && !isNaN(val)
        ? field === "partialQty" || field === "pendingFromDays"
          ? Math.floor(val)
          : val.toFixed(2)
        : val ?? "-"}
    </td>
  );
}

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}