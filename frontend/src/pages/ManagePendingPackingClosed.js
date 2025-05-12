"use client";
import React, { useEffect, useState, useMemo } from "react";
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const canExport = isSuperAdmin || permissions.includes("packing-delivery-export");
  
  // Add states for filters
  const [headerFilters, setHeaderFilters] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [clientOptions, setClientOptions] = useState([]);
  const [qcDoneByOptions, setQcDoneByOptions] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState({
    jobSheetCreatedDate: { from: '', to: '' },
    expectedDeliveryDate: { from: '', to: '' },
    brandedProductExpectedOn: { from: '', to: '' },
    clientCompanyName: '',
    status: '',
    qcDoneBy: ''
  });

  useEffect(() => {
    fetchRows();
    try {
      const p = JSON.parse(localStorage.getItem("permissions") || "[]");
      setPermissions(p);
      setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    } catch {}
    // eslint-disable-next-line
  }, []);

  // Add helper function for unique values
  const getUniqueValues = (data, key) => {
    const values = new Set(data.map(item => item[key]).filter(Boolean));
    return Array.from(values).sort();
  };

  async function fetchRows() {
    const res = await axios.get(`${BACKEND}/api/admin/packing-pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { closed } = splitOpenClosed(res.data || []);
    setRows(closed);

    // Get unique values for dropdowns
    setClientOptions(getUniqueValues(closed, 'clientCompanyName'));
    setQcDoneByOptions(getUniqueValues(closed, 'qcDoneBy'));
  }

  /* search + sort + filters */
  const filtered = useMemo(() => {
    return rows.filter(row => {
      // Global search
      if (!JSON.stringify(row).toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Header filters
      if (!Object.entries(headerFilters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = String(row[key] || '').toLowerCase();
        return cellValue.includes(value.toLowerCase());
      })) {
        return false;
      }

      // Advanced filters
      const inDateRange = (date, range) => {
        if (!date) return true;
        if (!range.from && !range.to) return true;
        const d = new Date(date);
        if (range.from && d < new Date(range.from)) return false;
        if (range.to && d > new Date(range.to)) return false;
        return true;
      };

      if (!inDateRange(row.jobSheetCreatedDate, advancedFilters.jobSheetCreatedDate)) return false;
      if (!inDateRange(row.expectedDeliveryDate, advancedFilters.expectedDeliveryDate)) return false;
      if (!inDateRange(row.brandedProductExpectedOn, advancedFilters.brandedProductExpectedOn)) return false;
      
      if (advancedFilters.clientCompanyName && 
          !row.clientCompanyName?.toLowerCase().includes(advancedFilters.clientCompanyName.toLowerCase())) {
        return false;
      }
      
      if (advancedFilters.status && row.status !== advancedFilters.status) return false;
      
      if (advancedFilters.qcDoneBy && 
          !row.qcDoneBy?.toLowerCase().includes(advancedFilters.qcDoneBy.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [rows, search, headerFilters, advancedFilters]);

  const sorted = [...filtered].sort((a, b) => {
    if (!sort.field) return 0;
    const av = a[sort.field] ?? "";
    const bv = b[sort.field] ?? "";
    return sort.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
  });

  /* export */
  const exportToExcel = () => {
    if (!canExport) {
      alert("You don't have permission to export packing/delivery records.");
      return;
    }

    const data = sorted.map((r) => ({
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
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-[#Ff8045]">
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
          className="px-3 py-1 bg-[#Ff8045] hover:bg-[#Ff8045]/90 rounded text-xs text-white"
        >
          ← Open Pending Packing
        </Link>
        {canExport && rows.length > 0 && (
          <button
            onClick={exportToExcel}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
          >
            Export to Excel
          </button>
        )}
        <button
          onClick={() => setShowAdvancedFilters(prev => !prev)}
          className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs"
        >
          {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Filters */}
            {[
              ['jobSheetCreatedDate', 'Job Sheet Created'],
              ['expectedDeliveryDate', 'Expected Delivery'],
              ['brandedProductExpectedOn', 'Branded Product Expected'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium">{label}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="border rounded p-1 text-xs"
                    placeholder="From"
                    value={advancedFilters[key].from}
                    onChange={e => setAdvancedFilters(prev => ({
                      ...prev,
                      [key]: { ...prev[key], from: e.target.value }
                    }))}
                  />
                  <input
                    type="date"
                    className="border rounded p-1 text-xs"
                    placeholder="To"
                    value={advancedFilters[key].to}
                    onChange={e => setAdvancedFilters(prev => ({
                      ...prev,
                      [key]: { ...prev[key], to: e.target.value }
                    }))}
                  />
                </div>
              </div>
            ))}

            {/* Client Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Client</label>
              <select
                className="border rounded p-1 text-xs w-full"
                value={advancedFilters.clientCompanyName}
                onChange={e => setAdvancedFilters(prev => ({
                  ...prev,
                  clientCompanyName: e.target.value
                }))}
              >
                <option value="">All Clients</option>
                {clientOptions.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Status</label>
              <select
                className="border rounded p-1 text-xs w-full"
                value={advancedFilters.status}
                onChange={e => setAdvancedFilters(prev => ({
                  ...prev,
                  status: e.target.value
                }))}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* QC Done By Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">QC Done By</label>
              <select
                className="border rounded p-1 text-xs w-full"
                value={advancedFilters.qcDoneBy}
                onChange={e => setAdvancedFilters(prev => ({
                  ...prev,
                  qcDoneBy: e.target.value
                }))}
              >
                <option value="">All QC Staff</option>
                {qcDoneByOptions.map(qc => (
                  <option key={qc} value={qc}>{qc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setAdvancedFilters({
                jobSheetCreatedDate: { from: '', to: '' },
                expectedDeliveryDate: { from: '', to: '' },
                brandedProductExpectedOn: { from: '', to: '' },
                clientCompanyName: '',
                status: '',
                qcDoneBy: ''
              })}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

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
        onEdit={() => {}}
        onShowFollowUps={(r) => setFuRow(r)}
        showEdit={false}
        headerFilters={headerFilters}
        onHeaderFilterChange={(key, value) => setHeaderFilters(prev => ({ ...prev, [key]: value }))}
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
