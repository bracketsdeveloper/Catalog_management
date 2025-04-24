// pages/ManagePaymentFollowUp.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import PaymentFollowUpTable from "../components/paymentfollowup/PaymentFollowUpTable";
import PaymentFollowUpModal from "../components/paymentfollowup/PaymentFollowUpModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManagePaymentFollowUp() {
  const token = localStorage.getItem("token");

  /* Raw data */
  const [rows, setRows] = useState([]);

  /* UI state */
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [editRow, setEditRow] = useState(null);

  /* Fetch data */
  useEffect(() => {
    fetchRows();
  }, []);

  async function fetchRows() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/payment-followup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch Payment Follow-Up");
    }
  }

  /* Search + sort */
  const filtered = useMemo(() => {
    return rows.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (!sort.field) return 0;
      const av = a[sort.field] ?? "";
      const bv = b[sort.field] ?? "";
      return sort.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
  }, [filtered, sort]);

  const toggleSort = (field) =>
    setSort(
      sort.field === field
        ? { field, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Payment Follow-Up
      </h1>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-purple-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />
      </div>

      {/* Table */}
      <PaymentFollowUpTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
      />

      {/* Edit modal */}
      {editRow && (
        <PaymentFollowUpModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}
    </div>
  );
}