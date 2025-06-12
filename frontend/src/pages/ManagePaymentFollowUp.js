"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import PaymentFollowUpTable from "../components/paymentfollowup/PaymentFollowUpTable";
import PaymentFollowUpModal from "../components/paymentfollowup/PaymentFollowUpModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManagePaymentFollowUp() {
  const token = localStorage.getItem("token");
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const hasExportPermission = localStorage
    .getItem("permissions")
    ?.includes("invoice-followup-export");

  /* Raw data */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* UI state */
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "invoiceNumber", dir: "asc" });
  const [editRow, setEditRow] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    invoiceDate: { from: "", to: "" },
    dueDate: { from: "", to: "" },
    invoiceMailed: "",
  });

  /* Fetch data */
  useEffect(() => {
    fetchRows();
  }, [search]);

  async function fetchRows() {
    setLoading(true);
    setError("");
    setRows([]); // Clear rows before fetching
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/payment-followup`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search },
      });
      console.log("API Response:", res.data);
      if (!res.data || res.data.length === 0) {
        setError("No Payment Follow-Up records found.");
        setRows([]);
      } else {
        // Deduplicate rows by jobSheetNumber and invoiceNumber
        const seen = new Set();
        const deduplicatedRows = res.data.filter((row) => {
          const key = `${row.jobSheetNumber}-${row.invoiceNumber}`;
          if (seen.has(key)) {
            console.warn("Duplicate row detected:", row);
            return false;
          }
          seen.add(key);
          return true;
        });
        console.log("Deduplicated Rows:", deduplicatedRows.length);
        setRows(deduplicatedRows);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.message || "Failed to fetch Payment Follow-Up");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  /* Search + filter */
  const filtered = useMemo(() => {
    console.log("Applying filters with search:", search, "filters:", filters);
    return rows.filter((r) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        r.jobSheetNumber?.toLowerCase().includes(searchLower) ||
        r.clientCompanyName?.toLowerCase().includes(searchLower) ||
        r.clientName?.toLowerCase().includes(searchLower) ||
        r.invoiceNumber?.toLowerCase().includes(searchLower) ||
        r.remarks?.toLowerCase().includes(searchLower);

      const matchesInvoiceDate =
        (!filters.invoiceDate.from ||
          (r.invoiceDate &&
            new Date(r.invoiceDate).toISOString().split("T")[0] >=
              filters.invoiceDate.from)) &&
        (!filters.invoiceDate.to ||
          (r.invoiceDate &&
            new Date(r.invoiceDate).toISOString().split("T")[0] <=
              filters.invoiceDate.to));

      const matchesDueDate =
        (!filters.dueDate.from ||
          (r.dueDate &&
            new Date(r.dueDate).toISOString().split("T")[0] >=
              filters.dueDate.from)) &&
        (!filters.dueDate.to ||
          (r.dueDate &&
            new Date(r.dueDate).toISOString().split("T")[0] <=
              filters.dueDate.to));

      const matchesInvoiceMailed =
        !filters.invoiceMailed ||
        r.invoiceMailed?.toLowerCase() === filters.invoiceMailed.toLowerCase();

      return matchesSearch && matchesInvoiceDate && matchesDueDate && matchesInvoiceMailed;
    });
  }, [rows, search, filters]);

  /* Sorting */
  const sorted = useMemo(() => {
    console.log("Sorting by:", sort);
    if (!sort.field) return filtered;
    return [...filtered].sort((a, b) => {
      let av = a[sort.field] ?? "";
      let bv = b[sort.field] ?? "";

      if (sort.field === "latestFollowUp") {
        const aFU = a.followUps?.reduce(
          (latest, current) =>
            new Date(current.updatedOn) > new Date(latest.updatedOn)
              ? current
              : latest,
          a.followUps?.[0]
        );
        const bFU = b.followUps?.reduce(
          (latest, current) =>
            new Date(current.updatedOn) > new Date(latest.updatedOn)
              ? current
              : latest,
          b.followUps?.[0]
        );
        av = aFU ? new Date(aFU.date) : new Date(0);
        bv = bFU ? new Date(bFU.date) : new Date(0);
      } else if (
        sort.field === "invoiceDate" ||
        sort.field === "dueDate" ||
        sort.field === "invoiceMailedOn"
      ) {
        av = av ? new Date(av) : new Date(0);
        bv = bv ? new Date(bv) : new Date(0);
      } else if (
        sort.field === "invoiceAmount" ||
        sort.field === "totalPaymentReceived" ||
        sort.field === "discountAllowed" ||
        sort.field === "TDS" ||
        sort.field === "overDueSince"
      ) {
        av = parseFloat(av) || 0;
        bv = parseFloat(bv) || 0;
      } else {
        av = av.toString().toLowerCase();
        bv = bv.toString().toLowerCase();
      }

      return sort.dir === "asc" ? (av > bv ? 1 : av < bv ? -1 : 0) : av < bv ? 1 : av > bv ? -1 : 0;
    });
  }, [filtered, sort]);

  const toggleSort = (field) => {
    console.log("Toggling sort for:", field);
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  };

  const handleFilterChange = (field, subField, value) => {
    console.log(`Filter change: ${field}${subField ? `.${subField}` : ""} = ${value}`);
    setFilters((prev) => ({
      ...prev,
      [field]: subField ? { ...prev[field], [subField]: value } : value,
    }));
  };

  const clearFilters = () => {
    console.log("Clearing filters");
    setFilters({
      invoiceDate: { from: "", to: "" },
      dueDate: { from: "", to: "" },
      invoiceMailed: "",
    });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      sorted.map((r) => ({
        "Job Sheet #": r.jobSheetNumber,
        "Client Company": r.clientCompanyName,
        "Client Name": r.clientName,
        "Invoice #": r.invoiceNumber,
        "Invoice Date": fmt(r.invoiceDate),
        "Invoice Amount": r.invoiceAmount,
        "Invoice Mailed": r.invoiceMailed,
        "Invoice Mailed On": fmt(r.invoiceMailedOn),
        "Due Date": fmt(r.dueDate),
        "Over Due Since": r.overDueSince,
        "Latest Follow-Up": r.followUps?.length
          ? fmt(
              r.followUps.reduce((latest, cur) =>
                new Date(cur.updatedOn) > new Date(latest.updatedOn) ? cur : latest
              ).date
            )
          : "-",
        "Payment Received": r.totalPaymentReceived || 0,
        "Discount Allowed": r.discountAllowed,
        TDS: r.TDS,
        Remarks: r.remarks,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "PaymentFollowUp");
    XLSX.writeFile(wb, "payment_followup.xlsx");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-blue-700">
        Payment Follow-Up
      </h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => {
            console.log("Search term:", e.target.value);
            setSearch(e.target.value);
          }}
          placeholder="Search…"
          className="border border-blue-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded"
        >
          Filters
        </button>
        {(isSuperAdmin || hasExportPermission) && (
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded"
          >
            Export to Excel
          </button>
        )}
      </div>

      {showFilters && (
        <div className="border border-blue-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-semibold">Invoice Date From</label>
              <input
                type="date"
                value={filters.invoiceDate.from}
                onChange={(e) => handleFilterChange("invoiceDate", "from", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Invoice Date To</label>
              <input
                type="date"
                value={filters.invoiceDate.to}
                onChange={(e) => handleFilterChange("invoiceDate", "to", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Due Date From</label>
              <input
                type="date"
                value={filters.dueDate.from}
                onChange={(e) => handleFilterChange("dueDate", "from", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Due Date To</label>
              <input
                type="date"
                value={filters.dueDate.to}
                onChange={(e) => handleFilterChange("dueDate", "to", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Invoice Mailed</label>
              <select
                value={filters.invoiceMailed}
                onChange={(e) => handleFilterChange("invoiceMailed", null, e.target.value)}
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
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

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <PaymentFollowUpTable
          rows={sorted}
          sortField={sort.field}
          sortOrder={sort.dir}
          toggleSort={toggleSort}
          onEdit={(r) => setEditRow(r)}
        />
      )}

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

function fmt(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}