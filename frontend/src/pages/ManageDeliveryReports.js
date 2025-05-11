// pages/ManageDeliveryReports.js
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import DeliveryReportsTable from "../components/delivery/DeliveryReportsTable";
import DeliveryReportsModal from "../components/delivery/DeliveryReportsModal";
import ExcelViewerModal from "../components/delivery/ExcelViewerModal";
import FollowUpsViewerModal from "../components/packing/FollowUpsViewerModal";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { Dialog } from "@headlessui/react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManageDeliveryReports() {
  const token = localStorage.getItem("token");

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "", dir: "asc" });

  const [editRow, setEditRow] = useState(null);
  const [fuRow, setFuRow] = useState(null);
  const [excelRow, setExcelRow] = useState(null);

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

  /* ---------------------------------------------------------------- */
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uniqueClients = [...new Set(rows.map(r => r.clientCompanyName))].filter(Boolean).sort();
    setClientOptions(uniqueClients);
  }, [rows]);

  async function fetchRows() {
    const res = await axios.get(`${BACKEND}/api/admin/delivery-reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const mapped = (res.data || []).map((r) => ({
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
    setRows(mapped);
  }

  /* search + sort */
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

  /* export all rows */
  const exportAll = () => {
    const data = rows.map((r) => ({
      "Batch / Full": r.batchType,
      "Job Sheet #": r.jobSheetNumber,
      Client: r.clientCompanyName,
      Event: r.eventName,
      Product: r.product,
      "Dispatch Qty": r.dispatchQty,
      "Sent Through": r.deliveredSentThrough,
      "DC#": r.dcNumber,
      "Delivered On": date(r.deliveredOn),
      "Latest Follow-up": r.latestFollowUp ? date(r.latestFollowUp) : "",
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveryReports");
    XLSX.writeFile(wb, "Delivery_Reports.xlsx");
  };

  /* ---------------------------------------------------------------- */
  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 text-[#Ff8045]">
        Delivery Reports
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
        {rows.length > 0 && isSuperAdmin && (
          <button
            onClick={exportAll}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
          >
            Export to Excel
          </button>
        )}
      </div>

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

      <DeliveryReportsTable
        rows={sorted}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={(r) => setEditRow(r)}
        onShowFollowUps={(r) => setFuRow(r)}
        onShowExcel={(r) => setExcelRow(r)}
      />

      {editRow && (
        <DeliveryReportsModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}
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