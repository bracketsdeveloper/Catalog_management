"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import SampleOutModal from "../components/samples/SampleOutModal";
import SampleOutTable from "../components/samples/SampleOutTable";

export default function SamplesOut() {
  /* STATE */
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState("sent");
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  /* header-level sort state */
  const [sort, setSort] = useState({ field: "", dir: "asc" });
  const toggleSort = (field) => {
    setSort((s) => ({
      field,
      dir: s.field === field && s.dir === "asc" ? "desc" : "asc"
    }));
  };

  /* filter panel */
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    company: "",
    sentBy: "",
    status: ""
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const hasExportPermission = localStorage
    .getItem("permissions")
    ?.includes("export-samples");

  /* FETCH */
  const fetchAll = async () => {
    try {
      let url = `${BACKEND_URL}/api/admin/sample-outs`;
      if (search.trim()) url += `?search=${encodeURIComponent(search)}`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setList(data);
    } catch (err) {
      console.error("Failed to fetch sample-outs:", err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [search]);

  /* CREATE / EDIT */
  const openCreate = () => {
    setEditData(null);
    setModalOpen(true);
  };
  const openEdit = async (so) => {
    try {
      const { data } = await axios.get(
        `${BACKEND_URL}/api/admin/sample-outs/${so._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditData(data);
      setModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch sample-out:", err);
      alert("Error fetching sample-out details");
    }
  };

  /* FILTER & SEARCH LOGIC */
  const inRange = (d, f, t) => {
    if (!f && !t) return true;
    const ts = new Date(d).setHours(0, 0, 0, 0);
    if (f && ts < new Date(f).setHours(0, 0, 0, 0)) return false;
    if (t && ts > new Date(t).setHours(23, 59, 59, 999)) return false;
    return true;
  };

  const matchesFilters = (so) =>
    (viewFilter === "sent" ? !so.receivedBack : so.receivedBack) &&
    inRange(so.sampleOutDate, filters.dateFrom, filters.dateTo) &&
    (!filters.company ||
      so.clientCompanyName
        ?.toLowerCase()
        .includes(filters.company.toLowerCase())) &&
    (!filters.sentBy ||
      so.sentByName?.toLowerCase().includes(filters.sentBy.toLowerCase())) &&
    (!filters.status || so.sampleOutStatus === filters.status);

  const filtered = list.filter(matchesFilters);

  /* EXPORT → EXCEL */
  const handleExport = () => {
    if (!filtered.length) {
      alert("Nothing to export");
      return;
    }
    const rows = filtered.map((r) => ({
      "Out Date": new Date(r.sampleOutDate).toLocaleDateString("en-GB"),
      Company: r.clientCompanyName,
      Client: r.clientName,
      "Sent By": r.sentByName,
      "Sample Ref": r.sampleReferenceCode,
      "Opportunity #": r.opportunityNumber || "", // NEW in export
      Product: r.productName,
      Brand: r.brand,
      Qty: r.qty,
      Color: r.color,
      Status: r.sampleOutStatus || "",
      "Received Back": r.receivedBack ? "Yes" : "No",
      Returned: r.returned ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample-Outs");
    XLSX.writeFile(wb, "sample-outs.xlsx");
  };

  return (
    <div className="p-6">
      {/* search / toolbar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          type="text"
          placeholder="Search anything…"
          className="border p-2 rounded flex-grow md:flex-grow-0 md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {["sent", "received"].map((k) => (
          <button
            key={k}
            onClick={() => setViewFilter(k)}
            className={`px-4 py-2 rounded ${
              viewFilter === k
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}

        <button
          onClick={() => setShowFilters((s) => !s)}
          className="px-4 py-2 bg-slate-600 text-white rounded"
        >
          Filters
        </button>

        {(isSuperAdmin || hasExportPermission) && (
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 text-white rounded"
          >
            Export Excel
          </button>
        )}

        <button
          onClick={openCreate}
          className="ml-auto bg-green-600 text-white px-4 py-2 rounded"
        >
          + Sample Out
        </button>
      </div>

      {/* filter panel */}
      {showFilters && (
        <div className="border rounded p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50">
          <div>
            <label className="block text-xs mb-1">From (Out Date)</label>
            <input
              type="date"
              className="border p-1 rounded w-full"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs mb-1">To (Out Date)</label>
            <input
              type="date"
              className="border p-1 rounded w-full"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Company</label>
            <input
              className="border p-1 rounded w-full"
              value={filters.company}
              onChange={(e) =>
                setFilters((f) => ({ ...f, company: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Sent By</label>
            <input
              className="border p-1 rounded w-full"
              value={filters.sentBy}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sentBy: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Status</label>
            <select
              className="border p-1 rounded w-full"
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="">All</option>
              <option value="sent">Sent</option>
              <option value="not sent">Not Sent</option>
            </select>
          </div>
        </div>
      )}

      {/* table */}
      <SampleOutTable
        data={filtered}
        sortField={sort.field}
        sortOrder={sort.dir}
        toggleSort={toggleSort}
        onEdit={openEdit}
      />

      {/* modal */}
      {modalOpen && (
        <SampleOutModal
          initialData={editData}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}