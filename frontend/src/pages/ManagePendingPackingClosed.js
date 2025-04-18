"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import PendingPackingTable from "../components/packing/PendingPackingTable";
import FollowUpsViewerModal from "../components/packing/FollowUpsViewerModal";
import { splitOpenClosed } from "../utils/packingHelpers";
import { Link } from "react-router-dom";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManagePendingPackingClosed() {
  const token = localStorage.getItem("token");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [fuRow, setFuRow] = useState(null);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line
  }, []);

  async function fetchRows() {
    const res = await axios.get(`${BACKEND}/api/admin/packing-pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { closed } = splitOpenClosed(res.data || []);
    setRows(closed);
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

  /* export */
  const exportToExcel = () => {
    const data = rows.map((r) => ({
      "Job Sheet Created": toDate(r.jobSheetCreatedDate),
      "Job Sheet #": r.jobSheetNumber,
      "Expected Delivery": toDate(r.expectedDeliveryDate),
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      Validated: r.jobSheetValidated,
      "Branded Product Expected On": toDate(r.brandedProductExpectedOn),
      "Qty Ordered": r.qtyOrdered,
      "Qty to Deliver": r.qtyToBeDelivered,
      "Qty Rejected": r.qtyRejected,
      "QC Done By": r.qcDoneBy,
      Status: r.status,
      "Latest Follow‑up": r.latestFollowUp ? toDate(r.latestFollowUp) : "",
      Remarks: r.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ClosedPendingPacking");
    XLSX.writeFile(wb, "Closed_Pending_Packing.xlsx");
  };

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Closed Pending Packing
      </h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-purple-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />
        <Link
          to="/admin-dashboard/pending-packing"
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
        >
          ← Open Pending Packing
        </Link>
        {rows.length > 0 && (
          <button
            onClick={exportToExcel}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
          >
            Export to Excel
          </button>
        )}
      </div>

      <PendingPackingTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={(f) =>
          setSort(
            sort.field === f
              ? { field: f, dir: sort.dir === "asc" ? "desc" : "asc" }
              : { field: f, dir: "asc" }
          )
        }
        onEdit={() => {}}          /* ignored */
        onShowFollowUps={(r) => setFuRow(r)}
        showEdit={false}
      />

      {fuRow && (
        <FollowUpsViewerModal row={fuRow} onClose={() => setFuRow(null)} />
      )}
    </div>
  );
}
function toDate(val) {
  const d = new Date(val);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}
