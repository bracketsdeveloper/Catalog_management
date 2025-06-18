"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import InvoiceFollowUpTable from "../components/invoicefollowup/InvoiceFollowUpTable.js";
import InvoiceFollowUpModal from "../components/invoicefollowup/InvoiceFollowUpModal.js";
import InvoiceFollowUpManual from "../components/invoicefollowup/invoiceFollowupManual.js";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManageInvoiceFollowUp() {
  const token = localStorage.getItem("token");
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const hasExportPermission = localStorage.getItem("permissions")?.includes("invoice-followup-export");

  const [rows, setRows] = useState([]);
  const [view, setView] = useState("old");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [editRow, setEditRow] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    jobSheetNumber: { from: "", to: "" },
    orderDate: { from: "", to: "" },
    dispatchedOn: { from: "", to: "" },
    invoiceGenerated: "",
  });
  const [showPopup, setShowPopup] = useState(false);

  const handleSubmitInvoice = () => {};

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line
  }, [view]);

  async function fetchRows() {
    if (!token) {
      toast.error("No authentication token found. Please log in.");
      window.location.href = "/login"; // Adjust to your login route
      return;
    }
    setLoading(true);
    try {
      if (view === "old") {
        const [invRes, dispRes, jobsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/admin/invoice-followup?view=old`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/api/admin/dispatch-schedule`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/api/admin/jobsheets`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const inv = invRes.data || [];
        const disp = dispRes.data || [];
        const jobs = jobsRes.data || [];
        console.log("Fetched data (old):", { inv, disp, jobs }); // Debug: Log fetched data
        const dispMap = disp.reduce((m, d) => {
          m[d.jobSheetNumber] = d.dispatchQty;
          return m;
        }, {});
        const jsMap = jobs.reduce((m, j) => {
          m[j.jobSheetNumber] = j.clientName;
          return m;
        }, {});
        setRows(
          inv.map(r => {
            const partialQty = dispMap[r.jobSheetNumber] ?? r.partialQty;
            const invoiced = r.invoiceGenerated === "Yes";
            const orderDate = new Date(r.orderDate);
            const today = new Date();
            const pendingFromDays = invoiced ? 0 : Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
            return {
              ...r,
              partialQty: Math.floor(partialQty),
              pendingFromDays,
              remarks: r.remarks || "",
              clientName: jsMap[r.jobSheetNumber] || r.clientName || "-",
            };
          })
        );
      } else {
        const [invRes, jobsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/admin/invoice-followup?view=${view}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/api/admin/jobsheets`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const inv = invRes.data || [];
        const jobs = jobsRes.data || [];
        console.log("Fetched data (new/closed):", { inv, jobs }); // Debug: Log fetched data
        const jsMap = jobs.reduce((acc, curr) => {
          acc[curr.jobSheetNumber] = curr.clientName;
          return acc;
        }, {});
        setRows(
          inv.map(r => ({
            ...r,
            remarks: r.remarks || "",
            clientName: jsMap[r.jobSheetNumber] || r.clientName || "",
          }))
        );
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login"; // Adjust to your login route
      } else {
        toast.error("Failed to fetch data rows");
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const jsn = JSON.stringify(r).toLowerCase();
      const matchesSearch = search ? jsn.includes(search.toLowerCase()) : true;

      const mjnMatch =
        (!filters.jobSheetNumber.from || r.jobSheetNumber >= filters.jobSheetNumber.from) &&
        (!filters.jobSheetNumber.to || r.jobSheetNumber <= filters.jobSheetNumber.to);

      const modMatch =
        (!filters.orderDate.from || new Date(r.orderDate) >= new Date(filters.orderDate.from)) &&
        (!filters.orderDate.to || new Date(r.orderDate) <= new Date(filters.orderDate.to));

      const mdoMatch =
        (!filters.dispatchedOn.from || new Date(r.dispatchedOn) >= new Date(filters.dispatchedOn.from)) &&
        (!filters.dispatchedOn.to || new Date(r.dispatchedOn) <= new Date(filters.dispatchedOn.to));

      const migMatch =
        !filters.invoiceGenerated || r.invoiceGenerated === filters.invoiceGenerated;

      return matchesSearch && mjnMatch && modMatch && mdoMatch && migMatch;
    });
  }, [rows, search, filters]);

  const sortedRows = useMemo(() => {
    if (!sort.field) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sort.field] ?? "";
      const bv = b[sort.field] ?? "";
      return sort.dir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [filteredRows, sort]);

  const toggleSort = field =>
    setSort(
      sort.field === field
        ? { field, dir: sort.dir === "asc" ? "desc" : "asc" }
      : { field, dir: "asc" });

  const handleFilterChange = (field, subField, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: subField ? { ...prev[field], [subField]: value } : value,
    }));
  };

  const clearFilters = () =>
    setFilters({
      jobSheetNumber: { from: "", to: "" },
      orderDate: { from: "", to: "" },
      dispatchedOn: { from: "", to: "" },
      invoiceGenerated: "",
    });

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      sortedRows.map(r => ({
        "Order Date": fmt(r.orderDate),
        "Job Sheet #": r.jobSheetNumber,
        "Client (Co.)": r.clientCompanyName,
        "Client Name": r.clientName,
        Event: r.eventName,
        "Quotation #": r.quotationNumber,
        "Quotation Total": r.quotationTotal,
        "CRM Name": r.crmName,
        Product: r.product,
        "Partial Qty": r.partialQty,
        "Dispatched On": fmt(r.dispatchedOn),
        "Delivered Through": r.deliveredThrough,
        "PO Status": r.poStatus,
        "Invoice Generated": r.invoiceGenerated,
        "Invoice #": r.invoiceNumber,
        "Pending From (days)": r.pendingFromDays,
        Remarks: r.remarks,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "InvoiceFollowUp");
    XLSX.writeFile(wb, `invoice_followup_${view}.xlsx`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold mb-4 text-[#Ff8045]">
          PO Follow-Up
        </h1>
        <button
          onClick={() => setShowPopup(true)}
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded"
        >
          Add Invoice
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-purple-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />
        <button
          onClick={() => setView("new")}
          className={`text-xs px-4 py-2 rounded ${
            view === "new"
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          }`}
        >
          Open Followup (new)
        </button>
        <button
          onClick={() => setView("old")}
          className={`text-xs px-4 py-2 rounded ${
            view === "old"
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          }`}
        >
          Open Followup (old)
        </button>
        <button
          onClick={() => setView("closed")}
          className={`text-xs px-4 py-2 rounded ${
            view === "closed"
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          }`}
        >
          Closed
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white text-xs px-4 py-2 rounded"
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
        <div className="border border-purple-200 rounded-lg p-4 mb-4 text-xs bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block mb-1 font-semibold">Job Sheet # From</label>
              <input
                type="text"
                value={filters.jobSheetNumber.from}
                onChange={e => handleFilterChange("jobSheetNumber", "from", e.target.value.trim())}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Job Sheet # To</label>
              <input
                type="text"
                value={filters.jobSheetNumber.to}
                onChange={e => handleFilterChange("jobSheetNumber", "to", e.target.value.trim())}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Order Date From</label>
              <input
                type="date"
                value={filters.orderDate.from}
                onChange={e => handleFilterChange("orderDate", "from", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Order Date To</label>
              <input
                type="date"
                value={filters.orderDate.to}
                onChange={e => handleFilterChange("orderDate", "to", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Dispatched On From</label>
              <input
                type="date"
                value={filters.dispatchedOn.from}
                onChange={e => handleFilterChange("dispatchedOn", "from", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Dispatched On To</label>
              <input
                type="date"
                value={filters.dispatchedOn.to}
                onChange={e => handleFilterChange("dispatchedOn", "to", e.target.value)}
                className="border w-full p-1 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold">Invoice Generated</label>
              <select
                value={filters.invoiceGenerated}
                onChange={e => handleFilterChange("invoiceGenerated", null, e.target.value)}
                className="border w-full p-1 rounded"
              >
                <option value="">All</option>
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

      {showPopup && <InvoiceFollowUpManual onClose={() => setShowPopup(false)} />}

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <InvoiceFollowUpTable
          rows={sortedRows}
          sortField={sort.field}
          sortOrder={sort.dir}
          toggleSort={toggleSort}
          onEdit={r => setEditRow(r)}
          view={view}
        />
      )}

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