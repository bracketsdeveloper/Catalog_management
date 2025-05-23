"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import PendingPackingTable from "../components/packing/PendingPackingTable";
import PendingPackingModal from "../components/packing/PendingPackingModal";
import FollowUpsViewerModal from "../components/packing/FollowUpsViewerModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManagePendingPacking() {
  const token = localStorage.getItem("token");

  /* ---------------------------------------------------------------- */
  /* state                                                            */
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followRow, setFollowRow] = useState(null);

  /* activeTab: "open" | "closed" */
  const [activeTab, setActiveTab] = useState("open");

  const [headerFilters, setHeaderFilters] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    jobSheetCreatedDate: { from: '', to: '' },
    expectedDeliveryDate: { from: '', to: '' },
    brandedProductExpectedOn: { from: '', to: '' },
    clientCompanyName: '',
    status: '',
    qcDoneBy: ''
  });

  const [clientOptions, setClientOptions] = useState([]);
  const [qcDoneByOptions, setQcDoneByOptions] = useState([]);

  const canExport = isSuperAdmin || permissions.includes("packing-delivery-export");

  /* ---------------------------------------------------------------- */
  useEffect(() => {
    fetchRows();
    setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
    try {
      const p = JSON.parse(localStorage.getItem("permissions") || "[]");
      setPermissions(p);
    } catch {}
    // eslint-disable-next-line
  }, []);

  const exportToExcel = () => {
    if (!canExport) {
      alert("You don't have permission to export packing/delivery records.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const sheetData = sorted.map((r) => ({
      "Job Sheet Created": r.jobSheetCreatedDate ? new Date(r.jobSheetCreatedDate).toLocaleDateString() : "",
      "Job Sheet #": r.jobSheetNumber,
      "Expected Delivery": r.expectedDeliveryDate ? new Date(r.expectedDeliveryDate).toLocaleDateString() : "",
      "Client": r.clientCompanyName,
      "Event": r.eventName,
      "Product": r.product,
      "Validated": r.jobSheetValidated,
      "Branded Product Expected On": r.brandedProductExpectedOn ? new Date(r.brandedProductExpectedOn).toLocaleDateString() : "",
      "Qty Ordered": r.qtyOrdered,
      "Qty to Deliver": r.qtyToBeDelivered,
      "Qty Rejected": r.qtyRejected,
      "QC Done By": r.qcDoneBy,
      "Status": r.status,
      "Latest Follow-up": r.latestFollowUp ? new Date(r.latestFollowUp).toLocaleDateString() : "",
    }));
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), "Pending Packing");
    XLSX.writeFile(wb, "pending_packing.xlsx");
  };

  async function fetchRows() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/admin/packing-pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      /* compute latest follow‑up for each row */
      const data = (Array.isArray(res.data) ? res.data : []).map((r) => ({
        ...r,
        latestFollowUp:
          r.followUp?.length
            ? new Date(
                r.followUp.reduce(
                  (max, f) =>
                    new Date(f.followUpDate) > new Date(max)
                      ? f.followUpDate
                      : max,
                  r.followUp[0].followUpDate
                )
              )
            : null,
      }));
      setRows(data);

      // Set the options for dropdowns
      setClientOptions(getUniqueValues(data, 'clientCompanyName'));
      setQcDoneByOptions(getUniqueValues(data, 'qcDoneBy'));
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------------------------------------------------------- */
  /* derive open / closed sets                                         */
  const { openRows, closedRows } = useMemo(() => {
    /* group rows by jobSheetNumber */
    const groups = {};
    rows.forEach((r) => {
      groups[r.jobSheetNumber] = groups[r.jobSheetNumber] || [];
      groups[r.jobSheetNumber].push(r);
    });

    const closedJobsheetNumbers = new Set(
      Object.entries(groups)
        .filter(([_, arr]) => arr.every((item) => item.status === "Completed"))
        .map(([jsNum]) => jsNum)
    );

    const closed = rows.filter((r) => closedJobsheetNumbers.has(r.jobSheetNumber));
    const open = rows.filter((r) => !closedJobsheetNumbers.has(r.jobSheetNumber));
    return { openRows: open, closedRows: closed };
  }, [rows]);

  /* ---------------------------------------------------------------- */
  /* search + sort apply to whichever view is active                  */
  const viewRows = activeTab === "open" ? openRows : closedRows;

  const filtered = useMemo(() => {
    return viewRows.filter(row => {
      // Global search
      if (!Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase())) {
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
  }, [viewRows, search, headerFilters, advancedFilters]);

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField] ?? "";
    const bVal = b[sortField] ?? "";
    return sortOrder === "asc"
      ? aVal > bVal
        ? 1
        : -1
      : aVal < bVal
      ? 1
      : -1;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  /* ---------------------------------------------------------------- */
  /* modal handlers                                                   */
  const openEdit = (row) => {
    setSelectedRow(row);
    setEditModalOpen(true);
  };
  const openFollowUps = (row) => {
    setFollowRow(row);
    setFollowModalOpen(true);
  };
  const afterSave = () => {
    setEditModalOpen(false);
    fetchRows();
  };

  const handleHeaderFilterChange = (key, value) => {
    setHeaderFilters(prev => ({ ...prev, [key]: value }));
  };

  const getUniqueValues = (data, key) => {
    const values = new Set(data.map(item => item[key]).filter(Boolean));
    return Array.from(values).sort();
  };

  /* ---------------------------------------------------------------- */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Pending Packing
      </h1>

      {/* ------------ search + tab buttons ------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border border-purple-300 rounded p-2 w-full md:w-1/3 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-3 py-1 rounded text-xs ${
              activeTab === "open"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Open Pending Packing ({openRows.length})
          </button>
          
          {canExport && (
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
            >
              Export to Excel
            </button>
          )}
        </div>
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
                  <option key={client} value={client}>
                    {client}
                  </option>
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
                {/* Add other status options as needed */}
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
                  <option key={qc} value={qc}>
                    {qc}
                  </option>
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

      {/* Add Filter Toggle Button */}
      <button
        onClick={() => setShowAdvancedFilters(prev => !prev)}
        className="mb-4 bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs"
      >
        {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {/* table */}
      <PendingPackingTable
        rows={sorted}
        sortField={sortField}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        onEdit={openEdit}
        onShowFollowUps={openFollowUps}
        headerFilters={headerFilters}
        onHeaderFilterChange={handleHeaderFilterChange}
        clientOptions={clientOptions}
        qcDoneByOptions={qcDoneByOptions}
      />

      {/* modals */}
      {editModalOpen && selectedRow && (
        <PendingPackingModal
          row={selectedRow}
          onClose={() => setEditModalOpen(false)}
          onSaved={afterSave}
        />
      )}
      {followModalOpen && followRow && (
        <FollowUpsViewerModal
          row={followRow}
          onClose={() => setFollowModalOpen(false)}
        />
      )}
    </div>
  );
}
