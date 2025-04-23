// pages/ManageDispatchScheduled.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import DispatchScheduledTable from "../components/dispatch/DispatchScheduledTable.js";
import DispatchScheduledModal from "../components/dispatch/DispatchScheduledModal.js";
import { Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManageDispatchScheduled() {
  const token = localStorage.getItem("token");

  /* raw data */
  const [rows, setRows] = useState([]);

  /* UI state */
  const [activeTab, setActiveTab] = useState("open"); // open | closed
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [editRow, setEditRow] = useState(null);

  /* ---------------------------------------------------------------- */
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line
  }, []);

  async function fetchRows() {
    const res = await axios.get(`${BACKEND_URL}/api/admin/dispatch-schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRows(res.data || []);
  }

  /* split rows by status ------------------------------------------- */
  const { openRows, closedRows } = useMemo(() => {
    const open = rows.filter((r) => r.status !== "sent");
    const closed = rows.filter((r) => r.status === "sent");
    return { openRows: open, closedRows: closed };
  }, [rows]);

  const viewRows = activeTab === "open" ? openRows : closedRows;

  /* search + sort -------------------------------------------------- */
  const filtered = viewRows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!sort.field) return 0;
    const av = a[sort.field] ?? "";
    const bv = b[sort.field] ?? "";
    return sort.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
  });

  const toggleSort = (field) =>
    setSort(
      sort.field === field
        ? { field, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );

  /* Excel export (Closed tab only) --------------------------------- */
  const exportClosed = () => {
    const data = closedRows.map((r) => ({
      "Batch / Full": r.batchType,
      "Job Sheet Created": toDate(r.jobSheetCreatedDate),
      "Job Sheet #": r.jobSheetNumber,
      "Expected Delivery": toDate(r.expectedDeliveryDate),
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      Validated: r.jobSheetValidated,
      "Dispatch Qty": r.dispatchQty,
      "Sent On": toDate(r.sentOn),
      "Mode of Delivery": r.modeOfDelivery,
      "DC#": r.dcNumber,
      Status: r.status,
      Remarks: r.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ClosedDispatch");
    XLSX.writeFile(wb, "Closed_Dispatch.xlsx");
  };

  /* ---------------------------------------------------------------- */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Dispatch Scheduled
      </h1>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-purple-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />

        <button
          onClick={() => setActiveTab("open")}
          className={`px-3 py-1 rounded text-xs ${
            activeTab === "open"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Open ({openRows.length})
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={`px-3 py-1 rounded text-xs ${
            activeTab === "closed"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Closed ({closedRows.length})
        </button>

        {activeTab === "closed" && closedRows.length > 0 && (
          <button
            onClick={exportClosed}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
          >
            Export to Excel
          </button>
        )}
      </div>

      {/* Table */}
      <DispatchScheduledTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
        showEdit={activeTab === "open"}
      />

      {/* Edit modal */}
      {editRow && (
        <DispatchScheduledModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}
    </div>
  );
}

function toDate(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}