"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import DeliveryReportsTable from "../components/delivery/DeliveryReportsTable";
import FollowUpsViewerModal from "../components/packing/FollowUpsViewerModal";
import ExcelViewerModal from "../components/delivery/ExcelViewerModal";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManageDeliveryCompleted() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });

  /* viewer modals */
  const [fuRow, setFuRow] = useState(null);
  const [excelRow, setExcelRow] = useState(null);

  /* ── fetch once ── */
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BACKEND}/api/admin/delivery-completed`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRows(res.data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  /* search + sort helpers */
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

  /* ── UI ── */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Delivery Completed
      </h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-purple-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />
        <span className="text-gray-500 text-xs self-center">
          {rows.length} rows
        </span>
      </div>

      {/* read‑only table */}
      <DeliveryReportsTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        showEdit={false}           /* hides Actions col */
        onEdit={() => {}}          /* noop */
        onShowFollowUps={setFuRow}
        onShowExcel={setExcelRow}
      />

      {fuRow && (
        <FollowUpsViewerModal row={fuRow} onClose={() => setFuRow(null)} />
      )}
      {excelRow && (
        <ExcelViewerModal row={excelRow} onClose={() => setExcelRow(null)} />
      )}
    </div>
  );
}
