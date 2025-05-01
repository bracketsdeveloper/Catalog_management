// pages/ManageInvoicesSummary.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    jobSheetNumber: { from: "", to: "" },
    invoiceDate: { from: "", to: "" },
    invoiceMailed: "",
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
      alert("Failed to fetch Invoices Summary");
    }
  }

  /* Search + filter */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = JSON.stringify(r)
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesJobSheetNumber =
        (!filters.jobSheetNumber.from ||
          r.jobSheetNumber >= filters.jobSheetNumber.from) &&
        (!filters.jobSheetNumber.to ||
          r.jobSheetNumber <= filters.jobSheetNumber.to);

      const matchesInvoiceDate =
        (!filters.invoiceDate.from ||
          new Date(r.invoiceDate) >= new Date(filters.invoiceDate.from)) &&
        (!filters.invoiceDate.to ||
          new Date(r.invoiceDate) <= new Date(filters.invoiceDate.to));

      const matchesInvoiceMailed =
        !filters.invoiceMailed ||
        r.invoiceMailed?.toLowerCase() === filters.invoiceMailed.toLowerCase();

      return (
        matchesSearch &&
        matchesJobSheetNumber &&
        matchesInvoiceDate &&
        matchesInvoiceMailed
      );
    });
  }, [rows, search, filters]);

  const sorted = useMemo(() => {
    if (!sort.field) return filtered;
    return [...filtered].sort((a, b) => {
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

  const handleFilterChange = (field, subField, value) => {
    if (subField) {
      setFilters((p) => ({ ...p, [field]: { ...p[field], [subField]: value } }));
    } else {
      setFilters((p) => ({ ...p, [field]: value }));
    }
  };

  const clearFilters = () =>
    setFilters({
      jobSheetNumber: { from: "", to: "" },
      invoiceDate: { from: "", to: "" },
      invoiceMailed: "",
    });

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      sorted.map((r) => ({
        "Job Sheet #": r.jobSheetNumber,
        Client: r.clientCompanyName,
        Event: r.eventName,
        "Invoice #": r.invoiceNumber,
        "Invoice Date": fmt(r.invoiceDate),
        "Invoice Amount": r.invoiceAmount,
        "Invoice Mailed": r.invoiceMailed,
        "Uploaded on Portal": r.invoiceUploadedOnPortal,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "InvoicesSummary");
    XLSX.writeFile(wb, "invoices_summary.xlsx");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-[#Ff8045]">
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
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white text-xs px-4 py-2 rounded"
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

            {/* Invoice Date */}
            <div>
              <label className="block mb-1 font-semibold">
                Invoice Date From
              </label>
              <input
                type="date"
                value={filters.invoiceDate.from}
                onChange={(e) =>
                  handleFilterChange("invoiceDate", "from", e.target.value)
                }
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Invoice Date To</label>
              <input
                type="date"
                value={filters.invoiceDate.to}
                onChange={(e) =>
                  handleFilterChange("invoiceDate", "to", e.target.value)
                }
                className="border w-full p-1 rounded"
              />
            </div>

            {/* Invoice Mailed */}
            <div>
              <label className="block mb-1 font-semibold">Invoice Mailed</label>
              <select
                value={filters.invoiceMailed}
                onChange={(e) =>
                  handleFilterChange("invoiceMailed", null, e.target.value)
                }
                className="border w-full p-1 rounded"
              >
                <option value="">Any</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
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
      <InvoicesSummaryTable
        rows={sorted}
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

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}
