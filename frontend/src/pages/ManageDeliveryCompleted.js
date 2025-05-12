"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { Dialog } from "@headlessui/react";
import DeliveryReportsTable from "../components/delivery/DeliveryReportsTable";
import FollowUpsViewerModal from "../components/packing/FollowUpsViewerModal";
import ExcelViewerModal from "../components/delivery/ExcelViewerModal";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManageDeliveryCompleted() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    client: "",
    batchType: "",
  });
  const [clientOptions, setClientOptions] = useState([]);
  const [statusOptions] = useState(["Delivered", "Pending", "Alert"]);
  const [batchTypeOptions] = useState(["Batch", "Full"]);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const hasExportPermission = localStorage.getItem("permissions")?.includes("packing-delivery-export");

  /* viewer modals */
  const [fuRow, setFuRow] = useState(null);
  const [excelRow, setExcelRow] = useState(null);

  /* ── fetch once ── */
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND}/api/admin/delivery-completed`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(res.data || []);
      
      // Get unique clients for filter dropdown
      const uniqueClients = [...new Set(res.data.map(r => r.clientCompanyName))].filter(Boolean).sort();
      setClientOptions(uniqueClients);
    } catch (e) {
      console.error(e);
    }
  }

  /* search + sort + filter helpers */
  const filtered = rows.filter((r) => {
    const matchesSearch = JSON.stringify(r).toLowerCase().includes(search.toLowerCase());
    const matchesDateFrom = !filters.dateFrom || new Date(r.deliveredOn) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(r.deliveredOn) <= new Date(filters.dateTo);
    const matchesStatus = !filters.status || r.status === filters.status;
    const matchesClient = !filters.client || r.clientCompanyName === filters.client;
    const matchesBatchType = !filters.batchType || r.batchType === filters.batchType;

    return matchesSearch && matchesDateFrom && matchesDateTo && matchesStatus && matchesClient && matchesBatchType;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sort.field) return 0;
    const av = a[sort.field] ?? "";
    const bv = b[sort.field] ?? "";
    return sort.dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
  });

  const toggleSort = (f) =>
    setSort(
      sort.field === f
        ? { field: f, dir: sort.dir === "asc" ? "desc" : "asc" }
        : { field: f, dir: "asc" }
    );

  /* Export to Excel */
  const exportToExcel = () => {
    const data = filtered.map((r) => ({
      "Batch / Full": r.batchType,
      "Job Sheet #": r.jobSheetNumber,
      "Client": r.clientCompanyName,
      "Event": r.eventName,
      "Product": r.product,
      "Dispatch Qty": r.dispatchQty,
      "Sent Through": r.deliveredSentThrough,
      "DC#": r.dcNumber,
      "Latest Follow-up": r.latestFollowUp ? date(r.latestFollowUp) : "",
      "Delivered On": date(r.deliveredOn),
      "Status": r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveryCompleted");
    XLSX.writeFile(wb, "Delivery_Completed.xlsx");
  };

  /* ── UI ── */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-purple-700">
        Delivery Completed
      </h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="border border-purple-300 rounded p-2 text-xs flex-grow md:flex-none md:w-1/3"
        />
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <FunnelIcon className="w-5 h-5 mr-2" />
          Filters
        </button>
        {rows.length > 0 && (isSuperAdmin || hasExportPermission) && (
          <button
            onClick={exportToExcel}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
          >
            Export to Excel
          </button>
        )}
        <span className="text-gray-500 text-xs self-center">
          {filtered.length} rows
        </span>
      </div>

      {/* Filter Modal */}
      <Dialog open={showFilters} onClose={() => setShowFilters(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium mb-4">Filters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivered Date Range</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="border rounded p-1 text-sm w-full"
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="border rounded p-1 text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                >
                  <option value="">All</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <select
                  value={filters.client}
                  onChange={(e) => setFilters({...filters, client: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                >
                  <option value="">All</option>
                  {clientOptions.map(client => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Type</label>
                <select
                  value={filters.batchType}
                  onChange={(e) => setFilters({...filters, batchType: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
                >
                  <option value="">All</option>
                  {batchTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setFilters({
                    dateFrom: "",
                    dateTo: "",
                    status: "",
                    client: "",
                    batchType: "",
                  });
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* read‑only table */}
      <DeliveryReportsTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        showEdit={false}           /* hides Actions col */
        onEdit={() => {}}          /* noop */
        onShowFollowUps={setFuRow}
        onShowExcel={setExcelRow}
      />

      {fuRow && (
        <FollowUpsViewerModal row={fuRow} onClose={() => setFuRow(null)} />
      )}
      {excelRow && (
        <ExcelViewerModal row={excelRow} onClose={() => setExcelRow(null)} />
      )}
    </div>
  );
}

function date(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}
