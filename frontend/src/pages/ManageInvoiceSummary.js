// pages/ManageInvoicesSummary.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import InvoicesSummaryTable from "../components/invoicesummary/InvoiceSummaryTable";
import InvoicesSummaryModal from "../components/invoicesummary/InvoiceSummaryModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManageInvoicesSummary() {
  const token = localStorage.getItem("token");

  /* Raw data */
  const [rows, setRows] = useState([]);

  /* UI state */
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [editRow, setEditRow] = useState(null);
  const [filters, setFilters] = useState({
    jobSheetNumber: { from: "", to: "" },
    clientCompanyName: { from: "", to: "" },
    eventName: { from: "", to: "" },
    invoiceNumber: { from: "", to: "" },
  });
  const [tempFilters, setTempFilters] = useState({
    jobSheetNumber: { from: "", to: "" },
    clientCompanyName: { from: "", to: "" },
    eventName: { from: "", to: "" },
    invoiceNumber: { from: "", to: "" },
  });

  /* Fetch data */
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line
  }, []);

  async function fetchRows() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/invoices-summary`, {
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
      clientCompanyName: { from: "", to: "" },
      eventName: { from: "", to: "" },
      invoiceNumber: { from: "", to: "" },
    };
    setTempFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  /* Search and filter */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = search
        ? JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
        : true;

      const matchesJobSheetNumber =
        (!filters.jobSheetNumber.from || (r.jobSheetNumber && r.jobSheetNumber >= filters.jobSheetNumber.from)) &&
        (!filters.jobSheetNumber.to || (r.jobSheetNumber && r.jobSheetNumber <= filters.jobSheetNumber.to));

      const matchesClientCompanyName =
        (!filters.clientCompanyName.from || (r.clientCompanyName && r.clientCompanyName >= filters.clientCompanyName.from)) &&
        (!filters.clientCompanyName.to || (r.clientCompanyName && r.clientCompanyName <= filters.clientCompanyName.to));

      const matchesEventName =
        (!filters.eventName.from || (r.eventName && r.eventName >= filters.eventName.from)) &&
        (!filters.eventName.to || (r.eventName && r.eventName <= filters.eventName.to));

      const matchesInvoiceNumber =
        (!filters.invoiceNumber.from || (r.invoiceNumber && r.invoiceNumber >= filters.invoiceNumber.from)) &&
        (!filters.invoiceNumber.to || (r.invoiceNumber && r.invoiceNumber <= filters.invoiceNumber.to));

      return (
        matchesSearch &&
        matchesJobSheetNumber &&
        matchesClientCompanyName &&
        matchesEventName &&
        matchesInvoiceNumber
      );
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
        Invoices Summary
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          {/* Client Company Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client Company Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="From"
                value={tempFilters.clientCompanyName.from}
                onChange={(e) => handleFilterChange("clientCompanyName", "from", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
              <input
                type="text"
                placeholder="To"
                value={tempFilters.clientCompanyName.to}
                onChange={(e) => handleFilterChange("clientCompanyName", "to", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
            </div>
          </div>
          {/* Event Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Event Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="From"
                value={tempFilters.eventName.from}
                onChange={(e) => handleFilterChange("eventName", "from", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
              <input
                type="text"
                placeholder="To"
                value={tempFilters.eventName.to}
                onChange={(e) => handleFilterChange("eventName", "to", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
            </div>
          </div>
          {/* Invoice Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="From"
                value={tempFilters.invoiceNumber.from}
                onChange={(e) => handleFilterChange("invoiceNumber", "from", e.target.value)}
                className="border border-gray-300 rounded p-1.5 text-xs w-full"
              />
              <input
                type="text"
                placeholder="To"
                value={tempFilters.invoiceNumber.to}
                onChange={(e) => handleFilterChange("invoiceNumber", "to", e.target.value)}
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
      <InvoicesSummaryTable
        rows={sortedRows}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
      />

      {/* Edit modal */}
      {editRow && (
        <InvoicesSummaryModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}
    </div>
  );
}