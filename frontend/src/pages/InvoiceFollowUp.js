// pages/ManageInvoiceFollowUp.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import InvoiceFollowUpTable from "../components/invoicefollowup/InvoiceFollowUpTable";
import InvoiceFollowUpModal from "../components/invoicefollowup/InvoiceFollowUpModal";

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
  const [tempFilters, setTempFilters] = useState({
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

  /* Update temp filter state */
  const handleFilterChange = (field, subField, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [field]: { ...prev[field], [subField]: value },
    }));
  };

  /* Apply filters */
  const applyFilters = () => {
    setFilters(tempFilters);
  };

  /* Clear filters */
  const clearFilters = () => {
    const emptyFilters = {
      jobSheetNumber: { from: "", to: "" },
      orderDate: { from: "", to: "" },
      dispatchedOn: { from: "", to: "" },
    };
    setTempFilters(emptyFilters);
    setFilters(emptyFilters);
  };

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

      {/* Filter Section */}
      <div className="mb-6 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Job Sheet # */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job Sheet #</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="From"
                value={tempFilters.jobSheetNumber.from}
                onChange={(e) => handleFilterChange("jobSheetNumber", "from", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
              <input
                type="text"
                placeholder="To"
                value={tempFilters.jobSheetNumber.to}
                onChange={(e) => handleFilterChange("jobSheetNumber", "to", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
            </div>
          </div>
          {/* Order Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Order Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={tempFilters.orderDate.from}
                onChange={(e) => handleFilterChange("orderDate", "from", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
              <input
                type="date"
                value={tempFilters.orderDate.to}
                onChange={(e) => handleFilterChange("orderDate", "to", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
            </div>
          </div>
          {/* Dispatched On */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dispatched On</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={tempFilters.dispatchedOn.from}
                onChange={(e) => handleFilterChange("dispatchedOn", "from", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
              <input
                type="date"
                value={tempFilters.dispatchedOn.to}
                onChange={(e) => handleFilterChange("dispatchedOn", "to", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
          >
            Clear Filters
          </button>
          <button
            onClick={applyFilters}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <InvoiceFollowUpTable
        rows={sortedRows}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
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