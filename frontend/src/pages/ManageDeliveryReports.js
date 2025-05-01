// pages/ManageDeliveryReports.js
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import DeliveryReportsTable from "../components/delivery/DeliveryReportsTable";
import DeliveryReportsModal from "../components/delivery/DeliveryReportsModal";
import ExcelViewerModal from "../components/delivery/ExcelViewerModal";
import FollowUpsViewerModal from "../components/packing/FollowUpsViewerModal";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManageDeliveryReports() {
  const token = localStorage.getItem("token");

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });

  const [editRow, setEditRow] = useState(null);
  const [fuRow, setFuRow] = useState(null);
  const [excelRow, setExcelRow] = useState(null);

  /* ---------------------------------------------------------------- */
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRows() {
    const res = await axios.get(`${BACKEND}/api/admin/delivery-reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const mapped = (res.data || []).map((r) => ({
      ...r,
      latestFollowUp:
        r.followUp?.length
          ? new Date(
              r.followUp.reduce(
                (max, f) =>
                  new Date(f.followUpDate) > new Date(max)
                    ? f.followUpDate
                    : max,
                r.followUp[0].followUpDate
              )
            )
          : null,
    }));
    setRows(mapped);
  }

  /* search + sort */
  const filtered = rows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    if (!sort.field) return 0;
    const av = a[sort.field] ?? "";
    const bv = b[sort.field] ?? "";
    return sort.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
  });
  const toggleSort = (f) =>
    setSort(
      sort.field === f
        ? { field: f, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { field: f, dir: "asc" }
    );

  /* export all rows */
  const exportAll = () => {
    const data = rows.map((r) => ({
      "Batch / Full": r.batchType,
      "Job Sheet #": r.jobSheetNumber,
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      "Dispatch Qty": r.dispatchQty,
      "Sent Through": r.deliveredSentThrough,
      "DC#": r.dcNumber,
      "Delivered On": date(r.deliveredOn),
      "Latest Follow-up": r.latestFollowUp ? date(r.latestFollowUp) : "",
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveryReports");
    XLSX.writeFile(wb, "Delivery_Reports.xlsx");
  };

  /* ---------------------------------------------------------------- */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-[#Ff8045]">
        Delivery Reports
      </h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-purple-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />
        {rows.length > 0 && (
          <button
            onClick={exportAll}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
          >
            Export to Excel
          </button>
        )}
      </div>

      <DeliveryReportsTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
        onShowFollowUps={(r) => setFuRow(r)}
        onShowExcel={(r) => setExcelRow(r)}
      />

      {editRow && (
        <DeliveryReportsModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}
      {fuRow && (
        <FollowUpsViewerModal row={fuRow} onClose={() => setFuRow(null)} />
      )}
      {excelRow && (
        <ExcelViewerModal row={excelRow} onClose={() => setExcelRow(null)} />
      )}
    </div>
  );
}

function date(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}