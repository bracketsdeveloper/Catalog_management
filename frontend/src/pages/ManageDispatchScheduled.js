// pages/ManageDispatchScheduled.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import DispatchScheduledTable from "../components/dispatch/DispatchScheduledTable.js";
import DispatchScheduledModal from "../components/dispatch/DispatchScheduledModal.js";
import { Link } from "react-router-dom";
import { FunnelIcon } from "@heroicons/react/24/outline";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManageDispatchScheduled() {
  const token = localStorage.getItem("token");

  /* raw data */
  const [rows, setRows] = useState([]);

  /* UI state */
  const [activeTab, setActiveTab] = useState("open"); // open | closed
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [editRow, setEditRow] = useState(null);

  /* New states */
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [headerFilters, setHeaderFilters] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [clientOptions, setClientOptions] = useState([]);
  const [modeOfDeliveryOptions, setModeOfDeliveryOptions] = useState([]);
  const [advancedFilters, setAdvancedFilters] = useState({
    jobSheetCreatedDate: { from: '', to: '' },
    expectedDeliveryDate: { from: '', to: '' },
    sentOn: { from: '', to: '' },
    clientCompanyName: '',
    status: '',
    modeOfDelivery: ''
  });

  /* Main filters */
  const [showMainFilters, setShowMainFilters] = useState(false);
  const [mainFilters, setMainFilters] = useState({
    jobSheetCreatedDate: { from: '', to: '' },
    expectedDeliveryDate: { from: '', to: '' },
    sentOn: { from: '', to: '' },
    clientCompanyName: '',
    status: '',
    modeOfDelivery: ''
  });

  /* Add new state for filter modal */
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  /* ---------------------------------------------------------------- */
  useEffect(() => {
    fetchRows();
    setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    // eslint-disable-next-line
  }, []);

  async function fetchRows() {
    const res = await axios.get(`${BACKEND_URL}/api/admin/dispatch-schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.data || [];
    setRows(data);
    
    // Get unique values for dropdowns
    setClientOptions(getUniqueValues(data, 'clientCompanyName'));
    setModeOfDeliveryOptions(getUniqueValues(data, 'modeOfDelivery'));
  }

  /* split rows by status ------------------------------------------- */
  const { openRows, closedRows } = useMemo(() => {
    const open = rows.filter((r) => r.status !== "sent");
    const closed = rows.filter((r) => r.status === "sent");
    return { openRows: open, closedRows: closed };
  }, [rows]);

  const viewRows = activeTab === "open" ? openRows : closedRows;

  /* search + sort -------------------------------------------------- */
  const filtered = useMemo(() => {
    return viewRows.filter(row => {
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

      // Main filters
      const inDateRange = (date, range) => {
        if (!date) return true;
        if (!range.from && !range.to) return true;
        const d = new Date(date);
        if (range.from && d < new Date(range.from)) return false;
        if (range.to && d > new Date(range.to)) return false;
        return true;
      };

      // Check date ranges
      if (!inDateRange(row.jobSheetCreatedDate, mainFilters.jobSheetCreatedDate)) return false;
      if (!inDateRange(row.expectedDeliveryDate, mainFilters.expectedDeliveryDate)) return false;
      if (!inDateRange(row.sentOn, mainFilters.sentOn)) return false;

      // Check dropdowns
      if (mainFilters.clientCompanyName && row.clientCompanyName !== mainFilters.clientCompanyName) return false;
      if (!inDateRange(row.jobSheetCreatedDate, advancedFilters.jobSheetCreatedDate)) return false;
      if (!inDateRange(row.expectedDeliveryDate, advancedFilters.expectedDeliveryDate)) return false;
      if (!inDateRange(row.sentOn, advancedFilters.sentOn)) return false;
      
      if (advancedFilters.clientCompanyName && 
          !row.clientCompanyName?.toLowerCase().includes(advancedFilters.clientCompanyName.toLowerCase())) {
        return false;
      }
      
      if (advancedFilters.status && row.status !== advancedFilters.status) return false;
      
      if (advancedFilters.modeOfDelivery && 
          !row.modeOfDelivery?.toLowerCase().includes(advancedFilters.modeOfDelivery.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [viewRows, search, headerFilters, advancedFilters]);

  const sorted = [...filtered].sort((a, b) => {
    if (!sort.field) return 0;
    const av = a[sort.field] ?? "";
    const bv = b[sort.field] ?? "";
    return sort.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
  });

  const toggleSort = (field) =>
    setSort(
      sort.field === field
        ? { field, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );

  /* Excel export (Closed tab only) --------------------------------- */
  const exportClosed = () => {
    const data = closedRows.map((r) => ({
      "Batch / Full": r.batchType,
      "Job Sheet Created": toDate(r.jobSheetCreatedDate),
      "Job Sheet #": r.jobSheetNumber,
      "Expected Delivery": toDate(r.expectedDeliveryDate),
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      Validated: r.jobSheetValidated,
      "Dispatch Qty": r.dispatchQty,
      "Sent On": toDate(r.sentOn),
      "Mode of Delivery": r.modeOfDelivery,
      "DC#": r.dcNumber,
      Status: r.status,
      Remarks: r.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ClosedDispatch");
    XLSX.writeFile(wb, "Closed_Dispatch.xlsx");
  };

  /* Helper function */
  const getUniqueValues = (data, key) => {
    const values = new Set(data.map(item => item[key]).filter(Boolean));
    return Array.from(values).sort();
  };

  /* ---------------------------------------------------------------- */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Dispatch Scheduled
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
          onClick={() => setIsFilterModalOpen(true)}
          className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs flex items-center gap-1"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
        </button>

        <button
          onClick={() => setActiveTab("open")}
          className={`px-3 py-1 rounded text-xs ${
            activeTab === "open"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Open ({openRows.length})
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={`px-3 py-1 rounded text-xs ${
            activeTab === "closed"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Closed ({closedRows.length})
        </button>

        {activeTab === "closed" && closedRows.length > 0 && isSuperAdmin && (
          <button
            onClick={exportClosed}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
          >
            Export to Excel
          </button>
        )}
      </div>

      {/* Table */}
      <DispatchScheduledTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
        showEdit={activeTab === "open"}
      />

      {/* Edit modal */}
      {editRow && (
        <DispatchScheduledModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}

      {/* Add Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={mainFilters}
        setFilters={setMainFilters}
        clientOptions={clientOptions}
        modeOfDeliveryOptions={modeOfDeliveryOptions}
      />
    </div>
  );
}

function toDate(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

function FilterModal({ isOpen, onClose, filters, setFilters, clientOptions, modeOfDeliveryOptions }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-purple-700">Filters</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Filters */}
          <div className="space-y-4">
            <h3 className="font-medium">Date Filters</h3>
            {[
              ['jobSheetCreatedDate', 'Job Sheet Created Date'],
              ['expectedDeliveryDate', 'Expected Delivery Date'],
              ['sentOn', 'Sent On Date'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium">{label}</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500">From</label>
                    <input
                      type="date"
                      className="border rounded p-1.5 text-sm w-full"
                      value={filters[key].from}
                      onChange={e => setFilters(prev => ({
                        ...prev,
                        [key]: { ...prev[key], from: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">To</label>
                    <input
                      type="date"
                      className="border rounded p-1.5 text-sm w-full"
                      value={filters[key].to}
                      onChange={e => setFilters(prev => ({
                        ...prev,
                        [key]: { ...prev[key], to: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dropdown Filters */}
          <div className="space-y-4">
            <h3 className="font-medium">Other Filters</h3>
            
            {/* Client Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Client</label>
              <select
                className="border rounded p-1.5 text-sm w-full"
                value={filters.clientCompanyName}
                onChange={e => setFilters(prev => ({
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
                className="border rounded p-1.5 text-sm w-full"
                value={filters.status}
                onChange={e => setFilters(prev => ({
                  ...prev,
                  status: e.target.value
                }))}
              >
                <option value="">All Status</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            {/* Mode of Delivery Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Mode of Delivery</label>
              <select
                className="border rounded p-1.5 text-sm w-full"
                value={filters.modeOfDelivery}
                onChange={e => setFilters(prev => ({
                  ...prev,
                  modeOfDelivery: e.target.value
                }))}
              >
                <option value="">All Modes</option>
                {modeOfDeliveryOptions.map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => {
              setFilters({
                jobSheetCreatedDate: { from: '', to: '' },
                expectedDeliveryDate: { from: '', to: '' },
                sentOn: { from: '', to: '' },
                clientCompanyName: '',
                status: '',
                modeOfDelivery: ''
              });
            }}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Clear Filters
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}