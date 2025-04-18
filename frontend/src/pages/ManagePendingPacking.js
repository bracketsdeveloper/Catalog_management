"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import PendingPackingTable from "../components/packing/PendingPackingTable";
import PendingPackingModal from "../components/packing/PendingPackingModal";
import FollowUpsViewerModal from "../components/packing/FollowUpsViewerModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManagePendingPacking() {
  const token = localStorage.getItem("token");

  /* ---------------------------------------------------------------- */
  /* state                                                            */
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followRow, setFollowRow] = useState(null);

  /* activeTab: "open" | "closed" */
  const [activeTab, setActiveTab] = useState("open");

  /* ---------------------------------------------------------------- */
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line
  }, []);

  async function fetchRows() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/packing-pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      /* compute latest follow‑up for each row */
      const data = (Array.isArray(res.data) ? res.data : []).map((r) => ({
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
      setRows(data);
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------------------------------------------------------- */
  /* derive open / closed sets                                         */
  const { openRows, closedRows } = useMemo(() => {
    /* group rows by jobSheetNumber */
    const groups = {};
    rows.forEach((r) => {
      groups[r.jobSheetNumber] = groups[r.jobSheetNumber] || [];
      groups[r.jobSheetNumber].push(r);
    });

    const closedJobsheetNumbers = new Set(
      Object.entries(groups)
        .filter(([_, arr]) => arr.every((item) => item.status === "Completed"))
        .map(([jsNum]) => jsNum)
    );

    const closed = rows.filter((r) => closedJobsheetNumbers.has(r.jobSheetNumber));
    const open = rows.filter((r) => !closedJobsheetNumbers.has(r.jobSheetNumber));
    return { openRows: open, closedRows: closed };
  }, [rows]);

  /* ---------------------------------------------------------------- */
  /* search + sort apply to whichever view is active                  */
  const viewRows = activeTab === "open" ? openRows : closedRows;

  const filtered = viewRows.filter((r) =>
    Object.values(r)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField] ?? "";
    const bVal = b[sortField] ?? "";
    return sortOrder === "asc"
      ? aVal > bVal
        ? 1
        : -1
      : aVal < bVal
      ? 1
      : -1;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  /* ---------------------------------------------------------------- */
  /* modal handlers                                                   */
  const openEdit = (row) => {
    setSelectedRow(row);
    setEditModalOpen(true);
  };
  const openFollowUps = (row) => {
    setFollowRow(row);
    setFollowModalOpen(true);
  };
  const afterSave = () => {
    setEditModalOpen(false);
    fetchRows();
  };

  /* ---------------------------------------------------------------- */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Pending Packing
      </h1>

      {/* ------------ search + tab buttons ------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border border-purple-300 rounded p-2 w-full md:w-1/3 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-3 py-1 rounded text-xs ${
              activeTab === "open"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Open Pending Packing ({openRows.length})
          </button>
          {/* <button
            onClick={() => setActiveTab("closed")}
            className={`px-3 py-1 rounded text-xs ${
              activeTab === "closed"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Closed Pending Packing ({closedRows.length})
          </button> */}
        </div>
      </div>

      {/* table */}
      <PendingPackingTable
        rows={sorted}
        sortField={sortField}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        onEdit={openEdit}
        onShowFollowUps={openFollowUps}
      />

      {/* modals */}
      {editModalOpen && selectedRow && (
        <PendingPackingModal
          row={selectedRow}
          onClose={() => setEditModalOpen(false)}
          onSaved={afterSave}
        />
      )}
      {followModalOpen && followRow && (
        <FollowUpsViewerModal
          row={followRow}
          onClose={() => setFollowModalOpen(false)}
        />
      )}
    </div>
  );
}
