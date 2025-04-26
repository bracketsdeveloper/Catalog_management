// pages/ManageInvoiceFollowUp.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import InvoiceFollowUpTable from "../components/invoicefollowup/InvoiceFollowUpTable.js";
import InvoiceFollowUpModal from "../components/invoicefollowup/InvoiceFollowUpModal.js";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManageInvoiceFollowUp() {
  const token = localStorage.getItem("token");

  /* Raw data */
  const [rows, setRows] = useState([]);

  /* UI state */
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [editRow, setEditRow] = useState(null);
  const [filters, setFilters] = useState({
    jobSheetNumber: { from: "", to: "" },
    orderDate: { from: "", to: "" },
    dispatchedOn: { from: "", to: "" },
  });

  /* Fetch data */
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line
  }, []);

  async function fetchRows() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/invoice-followup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Error fetching data");
    }
  }

  /* Search and filter */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Search
      const matchesSearch = search
        ? JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
        : true;

      // Filters
      const matchesJobSheetNumber =
        (!filters.jobSheetNumber.from || r.jobSheetNumber >= filters.jobSheetNumber.from) &&
        (!filters.jobSheetNumber.to || r.jobSheetNumber <= filters.jobSheetNumber.to);

      const matchesOrderDate =
        (!filters.orderDate.from || new Date(r.orderDate) >= new Date(filters.orderDate.from)) &&
        (!filters.orderDate.to || new Date(r.orderDate) <= new Date(filters.orderDate.to));

      const matchesDispatchedOn =
        (!filters.dispatchedOn.from || new Date(r.dispatchedOn) >= new Date(filters.dispatchedOn.from)) &&
        (!filters.dispatchedOn.to || new Date(r.dispatchedOn) <= new Date(filters.dispatchedOn.to));

      return matchesSearch && matchesJobSheetNumber && matchesOrderDate && matchesDispatchedOn;
    });
  }, [rows, search, filters]);

  /* Sort */
  const sortedRows = useMemo(() => {
    if (!sort.field) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sort.field] ?? "";
      const bv = b[sort.field] ?? "";
      return sort.dir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [filteredRows, sort]);

  const toggleSort = (field) =>
    setSort(
      sort.field === field
        ? { field, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );

  const handleFilterChange = (field, subField, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: { ...prev[field], [subField]: value },
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Invoices Follow-Up
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
      <InvoiceFollowUpTable
        rows={sortedRows}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Edit modal */}
      {editRow && (
        <InvoiceFollowUpModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}
    </div>
  );
}