// pages/ManageInvoiceFollowUp.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
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
  const [showFilters, setShowFilters] = useState(false);
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
        (!filters.jobSheetNumber.from ||
          r.jobSheetNumber >= filters.jobSheetNumber.from) &&
        (!filters.jobSheetNumber.to ||
          r.jobSheetNumber <= filters.jobSheetNumber.to);

      const matchesOrderDate =
        (!filters.orderDate.from ||
          new Date(r.orderDate) >= new Date(filters.orderDate.from)) &&
        (!filters.orderDate.to ||
          new Date(r.orderDate) <= new Date(filters.orderDate.to));

      const matchesDispatchedOn =
        (!filters.dispatchedOn.from ||
          new Date(r.dispatchedOn) >= new Date(filters.dispatchedOn.from)) &&
        (!filters.dispatchedOn.to ||
          new Date(r.dispatchedOn) <= new Date(filters.dispatchedOn.to));

      return (
        matchesSearch &&
        matchesJobSheetNumber &&
        matchesOrderDate &&
        matchesDispatchedOn
      );
    });
  }, [rows, search, filters]);

  /* Sort */
  const sortedRows = useMemo(() => {
    if (!sort.field) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sort.field] ?? "";
      const bv = b[sort.field] ?? "";
      return sort.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
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

  const clearFilters = () =>
    setFilters({
      jobSheetNumber: { from: "", to: "" },
      orderDate: { from: "", to: "" },
      dispatchedOn: { from: "", to: "" },
    });

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      sortedRows.map((r) => ({
        "Order Date": fmt(r.orderDate),
        "Job Sheet #": r.jobSheetNumber,
        Client: r.clientCompanyName,
        Event: r.eventName,
        "Quotation #": r.quotationNumber,
        "CRM Name": r.crmName,
        Product: r.product,
        "Partial Qty": r.partialQty,
        "Dispatched On": fmt(r.dispatchedOn),
        "Delivered Through": r.deliveredThrough,
        "PO Status": r.poStatus,
        "Invoice Generated": r.invoiceGenerated,
        "Invoice #": r.invoiceNumber,
        "Pending From (days)": r.pendingFromDays,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "InvoiceFollowUp");
    XLSX.writeFile(wb, "invoice_followup.xlsx");
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
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded"
        >
          Filters
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded"
        >
          Export to Excel
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border border-purple-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Job Sheet # */}
            <div>
              <label className="block mb-1 font-semibold">
                Job Sheet # From
              </label>
              <input
                type="text"
                value={filters.jobSheetNumber.from}
                onChange={(e) =>
                  handleFilterChange(
                    "jobSheetNumber",
                    "from",
                    e.target.value.trim()
                  )
                }
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Job Sheet # To</label>
              <input
                type="text"
                value={filters.jobSheetNumber.to}
                onChange={(e) =>
                  handleFilterChange(
                    "jobSheetNumber",
                    "to",
                    e.target.value.trim()
                  )
                }
                className="border w-full p-1 rounded"
              />
            </div>

            {/* Order Date */}
            <div>
              <label className="block mb-1 font-semibold">
                Order Date From
              </label>
              <input
                type="date"
                value={filters.orderDate.from}
                onChange={(e) =>
                  handleFilterChange("orderDate", "from", e.target.value)
                }
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Order Date To</label>
              <input
                type="date"
                value={filters.orderDate.to}
                onChange={(e) =>
                  handleFilterChange("orderDate", "to", e.target.value)
                }
                className="border w-full p-1 rounded"
              />
            </div>

            {/* Dispatched On */}
            <div>
              <label className="block mb-1 font-semibold">
                Dispatched On From
              </label>
              <input
                type="date"
                value={filters.dispatchedOn.from}
                onChange={(e) =>
                  handleFilterChange("dispatchedOn", "from", e.target.value)
                }
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">
                Dispatched On To
              </label>
              <input
                type="date"
                value={filters.dispatchedOn.to}
                onChange={(e) =>
                  handleFilterChange("dispatchedOn", "to", e.target.value)
                }
                className="border w-full p-1 rounded"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowFilters(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded"
            >
              Clear
            </button>
          </div>
        </div>
      )}

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

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}
