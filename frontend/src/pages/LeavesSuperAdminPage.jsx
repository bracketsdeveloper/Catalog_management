// src/pages/TimeOffAdmin.jsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

/* ---------- API ---------- */
const API = process.env.REACT_APP_BACKEND_URL;
function authHeaders() {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

const LeavesAPI = {
  list: (params) => axios.get(`${API}/api/hrms/leaves`, { ...authHeaders(), params }),
  setStatus: (id, status) =>
    axios.patch(`${API}/api/hrms/leaves/${id}/status`, { status }, authHeaders()),
};

const RHAPI = {
  list: (params) => axios.get(`${API}/api/hrms/rh/requests`, { ...authHeaders(), params }),
  setStatus: (id, status) =>
    axios.patch(`${API}/api/hrms/rh/${id}/status`, { status }, authHeaders()),
};

const EmployeesAPI = {
  getByEmployeeId: (employeeId) =>
    axios.get(`${API}/api/hrms/employees/${encodeURIComponent(employeeId)}`, authHeaders()),
};

/* ---------- constants ---------- */
const STATUSES = ["applied", "pending", "approved", "rejected", "cancelled"];
const LEAVES_SORT_KEYS = ["startDate", "endDate", "createdAt", "updatedAt"];
const RH_SORT_KEYS = ["holidayDate", "createdAt", "updatedAt"];

/* ---------- helpers ---------- */
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}-${month}-${year}`;
}

function daysBetween(a, b) {
  const A = new Date(a),
    B = new Date(b);
  if (isNaN(A) || isNaN(B)) return "";
  return Math.max(1, Math.ceil((B - A) / (1000 * 60 * 60 * 24)) + 1);
}

function resolveEmployee(row) {
  const e = row?.employee || {};
  return {
    name: e.name || row.employeeName || "-",
    employeeId: e.employeeId || row.employeeId || "-",
    role: e.role || row.employeeRole || "",
    department: e.department || row.employeeDepartment || "",
  };
}

/* =======================================================================
   PAGE
   ======================================================================= */
export default function TimeOffAdmin() {
  const [tab, setTab] = useState("leaves");

  /* Global search */
  const [q, setQ] = useState("");

  /* Sorting */
  const [sortBy, setSortBy] = useState("startDate");
  const [dir, setDir] = useState("desc");

  /* Pagination */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  /* Leaves header filters - directly applied */
  const [L_employeeId, setL_employeeId] = useState("");
  const [L_employeeName, setL_employeeName] = useState("");
  const [L_type, setL_type] = useState("");
  const [L_status, setL_status] = useState("");
  const [L_from, setL_from] = useState("");
  const [L_to, setL_to] = useState("");

  /* RH header filters - directly applied */
  const [R_employeeId, setR_employeeId] = useState("");
  const [R_employeeName, setR_employeeName] = useState("");
  const [R_status, setR_status] = useState("");
  const [R_holidayName, setR_holidayName] = useState("");
  const [R_from, setR_from] = useState("");
  const [R_to, setR_to] = useState("");

  /* Raw data from API */
  const [L_rawRows, setL_rawRows] = useState([]);
  const [L_loading, setL_loading] = useState(false);

  const [R_rawRows, setR_rawRows] = useState([]);
  const [R_loading, setR_loading] = useState(false);

  const empCacheRef = useRef(new Map());

  /* ===================== EXTRACT FILTER OPTIONS FROM DATA ===================== */
  const L_filterOptions = useMemo(() => {
    const employeesMap = new Map();
    const types = new Set();
    const statuses = new Set();

    L_rawRows.forEach((r) => {
      const emp = resolveEmployee(r);
      if (emp.employeeId && emp.employeeId !== "-") {
        employeesMap.set(emp.employeeId, emp.name !== "-" ? emp.name : emp.employeeId);
      }
      if (r.type) types.add(r.type);
      if (r.status) statuses.add(r.status);
    });

    return {
      employees: Array.from(employeesMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      types: Array.from(types).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [L_rawRows]);

  const R_filterOptions = useMemo(() => {
    const employeesMap = new Map();
    const statuses = new Set();
    const holidayNames = new Set();

    R_rawRows.forEach((r) => {
      const emp = resolveEmployee(r);
      if (emp.employeeId && emp.employeeId !== "-") {
        employeesMap.set(emp.employeeId, emp.name !== "-" ? emp.name : emp.employeeId);
      }
      if (r.status) statuses.add(r.status);
      if (r.holidayName) holidayNames.add(r.holidayName);
    });

    return {
      employees: Array.from(employeesMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      statuses: Array.from(statuses).sort(),
      holidayNames: Array.from(holidayNames).sort(),
    };
  }, [R_rawRows]);

  /* ===================== CLIENT-SIDE FILTERING ===================== */
  const L_filteredRows = useMemo(() => {
    let rows = [...L_rawRows];

    // Global search
    if (q.trim()) {
      const search = q.toLowerCase().trim();
      rows = rows.filter((r) => {
        const emp = resolveEmployee(r);
        return (
          emp.name.toLowerCase().includes(search) ||
          emp.employeeId.toLowerCase().includes(search) ||
          (r.purpose || "").toLowerCase().includes(search) ||
          (r.type || "").toLowerCase().includes(search) ||
          (r.status || "").toLowerCase().includes(search)
        );
      });
    }

    // Employee Name filter
    if (L_employeeName) {
      rows = rows.filter((r) => {
        const emp = resolveEmployee(r);
        return emp.name.toLowerCase().includes(L_employeeName.toLowerCase());
      });
    }

    // Employee ID filter
    if (L_employeeId) {
      rows = rows.filter((r) => {
        const emp = resolveEmployee(r);
        return emp.employeeId === L_employeeId;
      });
    }

    // Type filter
    if (L_type) {
      rows = rows.filter((r) => r.type === L_type);
    }

    // Status filter
    if (L_status) {
      rows = rows.filter((r) => r.status === L_status);
    }

    // Date From filter
    if (L_from) {
      const fromDate = new Date(L_from);
      fromDate.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => {
        const startDate = new Date(r.startDate);
        return startDate >= fromDate;
      });
    }

    // Date To filter
    if (L_to) {
      const toDate = new Date(L_to);
      toDate.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => {
        const endDate = new Date(r.endDate);
        return endDate <= toDate;
      });
    }

    // Sorting
    rows.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy.includes("Date") || sortBy === "createdAt" || sortBy === "updatedAt") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }

      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [L_rawRows, q, L_employeeName, L_employeeId, L_type, L_status, L_from, L_to, sortBy, dir]);

  const R_filteredRows = useMemo(() => {
    let rows = [...R_rawRows];

    // Global search
    if (q.trim()) {
      const search = q.toLowerCase().trim();
      rows = rows.filter((r) => {
        const emp = resolveEmployee(r);
        return (
          emp.name.toLowerCase().includes(search) ||
          emp.employeeId.toLowerCase().includes(search) ||
          (r.holidayName || "").toLowerCase().includes(search) ||
          (r.note || "").toLowerCase().includes(search) ||
          (r.status || "").toLowerCase().includes(search)
        );
      });
    }

    // Employee Name filter
    if (R_employeeName) {
      rows = rows.filter((r) => {
        const emp = resolveEmployee(r);
        return emp.name.toLowerCase().includes(R_employeeName.toLowerCase());
      });
    }

    // Employee ID filter
    if (R_employeeId) {
      rows = rows.filter((r) => {
        const emp = resolveEmployee(r);
        return emp.employeeId === R_employeeId;
      });
    }

    // Status filter
    if (R_status) {
      rows = rows.filter((r) => r.status === R_status);
    }

    // Holiday Name filter
    if (R_holidayName) {
      rows = rows.filter((r) => r.holidayName === R_holidayName);
    }

    // Date From filter
    if (R_from) {
      const fromDate = new Date(R_from);
      fromDate.setHours(0, 0, 0, 0);
      rows = rows.filter((r) => {
        const holidayDate = new Date(r.holidayDate);
        return holidayDate >= fromDate;
      });
    }

    // Date To filter
    if (R_to) {
      const toDate = new Date(R_to);
      toDate.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => {
        const holidayDate = new Date(r.holidayDate);
        return holidayDate <= toDate;
      });
    }

    // Sorting
    const sortKey = sortBy === "startDate" ? "holidayDate" : sortBy;
    rows.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey.includes("Date") || sortKey === "createdAt" || sortKey === "updatedAt") {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }

      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [R_rawRows, q, R_employeeName, R_employeeId, R_status, R_holidayName, R_from, R_to, sortBy, dir]);

  /* ===================== PAGINATION ===================== */
  const totalPages = useMemo(() => {
    const total = tab === "leaves" ? L_filteredRows.length : R_filteredRows.length;
    return Math.max(1, Math.ceil(total / limit));
  }, [tab, L_filteredRows.length, R_filteredRows.length, limit]);

  const L_paginatedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return L_filteredRows.slice(start, start + limit);
  }, [L_filteredRows, page, limit]);

  const R_paginatedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return R_filteredRows.slice(start, start + limit);
  }, [R_filteredRows, page, limit]);

  /* Reset page when filters change */
  useEffect(() => {
    setPage(1);
  }, [q, L_employeeId, L_employeeName, L_type, L_status, L_from, L_to, R_employeeId, R_employeeName, R_status, R_holidayName, R_from, R_to]);

  /* ===================== HYDRATE EMPLOYEE NAMES ===================== */
  async function hydrateMissingEmployeeNames(rows, setRows) {
    try {
      const missingIds = [];
      for (const r of rows) {
        const emp = resolveEmployee(r);
        const hasName = emp.name && emp.name !== "-" && String(emp.name).trim().length > 0;
        const id = (emp.employeeId || "").trim();
        if (!hasName && id && id !== "-") {
          if (!empCacheRef.current.has(id)) missingIds.push(id);
        }
      }
      const uniq = [...new Set(missingIds)];
      if (!uniq.length) return rows;

      for (const eid of uniq) {
        try {
          const { data } = await EmployeesAPI.getByEmployeeId(eid);
          empCacheRef.current.set(eid, {
            name: data?.personal?.name || "",
            role: data?.org?.role || "",
            department: data?.org?.department || "",
          });
        } catch {
          empCacheRef.current.set(eid, { name: "", role: "", department: "" });
        }
      }

      const patched = rows.map((r) => {
        const emp = resolveEmployee(r);
        const id = (emp.employeeId || "").trim();
        const cacheHit = id ? empCacheRef.current.get(id) : null;
        if ((!emp.name || emp.name === "-") && cacheHit?.name) {
          return {
            ...r,
            employee: {
              ...(r.employee || {}),
              employeeId: id || r.employeeId,
              name: cacheHit.name,
              role: cacheHit.role || "",
              department: cacheHit.department || "",
            },
          };
        }
        return r;
      });

      setRows(patched);
      return patched;
    } catch {
      return rows;
    }
  }

  /* ===================== FETCH DATA ===================== */
  async function fetchLeaves() {
    try {
      setL_loading(true);
      const { data } = await LeavesAPI.list({
        limit: 1000,
        includeEmployee: "1",
      });
      const baseRows = data.rows || [];
      setL_rawRows(baseRows);
      hydrateMissingEmployeeNames(baseRows, setL_rawRows);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load leaves");
    } finally {
      setL_loading(false);
    }
  }

  async function fetchRH() {
    try {
      setR_loading(true);
      const { data } = await RHAPI.list({
        limit: 1000,
      });
      const baseRows = data.rows || [];
      setR_rawRows(baseRows);
      hydrateMissingEmployeeNames(baseRows, setR_rawRows);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load RH requests");
    } finally {
      setR_loading(false);
    }
  }

  useEffect(() => {
    fetchLeaves();
    fetchRH();
  }, []);

  /* ===================== SORTING ===================== */
  function toggleSort(col) {
    if (sortBy === col) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setDir("desc");
    }
  }

  /* ===================== RESET FILTERS ===================== */
  function resetLeavesFilters() {
    setL_employeeId("");
    setL_employeeName("");
    setL_type("");
    setL_status("");
    setL_from("");
    setL_to("");
    setQ("");
  }

  function resetRHFilters() {
    setR_employeeId("");
    setR_employeeName("");
    setR_status("");
    setR_holidayName("");
    setR_from("");
    setR_to("");
    setQ("");
  }

  /* ===================== STATUS UPDATES ===================== */
  async function updateLeaveStatus(id, newStatus) {
    try {
      await LeavesAPI.setStatus(id, newStatus);
      setL_rawRows((prev) => prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r)));
      toast.success("Leave status updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update");
    }
  }

  async function updateRHStatus(id, newStatus) {
    try {
      await RHAPI.setStatus(id, newStatus);
      setR_rawRows((prev) => prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r)));
      toast.success("RH status updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update");
    }
  }

  /* ===================== CHECK IF FILTERS ACTIVE ===================== */
  const hasLeavesFilters = q || L_employeeId || L_employeeName || L_type || L_status || L_from || L_to;
  const hasRHFilters = q || R_employeeId || R_employeeName || R_status || R_holidayName || R_from || R_to;

  /* ===================== RENDER ===================== */
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Time Off — Super Admin</h1>

      {/* Tabs */}
      <div className="inline-flex overflow-hidden rounded-lg border mb-4">
        <button
          className={`px-4 py-2 text-sm ${tab === "leaves" ? "bg-blue-600 text-white" : "bg-white"}`}
          onClick={() => {
            setTab("leaves");
            setPage(1);
            setSortBy("startDate");
          }}
        >
          Leave Applications ({L_rawRows.length})
        </button>
        <button
          className={`px-4 py-2 text-sm ${tab === "rh" ? "bg-blue-600 text-white" : "bg-white"}`}
          onClick={() => {
            setTab("rh");
            setPage(1);
            setSortBy("holidayDate");
          }}
        >
          Restricted Holidays ({R_rawRows.length})
        </button>
      </div>

      {/* Global Search & Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs block mb-1">Search</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Search by name, ID, purpose, status..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs block mb-1">Per page</label>
          <select
            className="border rounded px-3 py-2"
            value={limit}
            onChange={(e) => {
              setLimit(+e.target.value);
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <button
          className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200"
          onClick={() => {
            if (tab === "leaves") fetchLeaves();
            else fetchRH();
          }}
        >
          Refresh
        </button>
      </div>

      {/* ===================== LEAVES TABLE ===================== */}
      {tab === "leaves" && (
        <div className="border rounded overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
          <table className="table-auto w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border px-2 py-2 text-left">Employee</th>
                <th className="border px-2 py-2 text-left">Emp ID</th>
                <th
                  className="border px-2 py-2 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("startDate")}
                >
                  Start {sortBy === "startDate" && (dir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="border px-2 py-2 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("endDate")}
                >
                  End {sortBy === "endDate" && (dir === "asc" ? "↑" : "↓")}
                </th>
                <th className="border px-2 py-2 text-left">Days</th>
                <th className="border px-2 py-2 text-left">Type</th>
                <th className="border px-2 py-2 text-left">Status</th>
                <th className="border px-2 py-2 text-left">Purpose</th>
                <th
                  className="border px-2 py-2 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("createdAt")}
                >
                  Created {sortBy === "createdAt" && (dir === "asc" ? "↑" : "↓")}
                </th>
              </tr>

              {/* Filter Row */}
              <tr className="bg-gray-100">
                <th className="border px-1 py-1">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    placeholder="Filter name..."
                    value={L_employeeName}
                    onChange={(e) => setL_employeeName(e.target.value)}
                  />
                </th>
                <th className="border px-1 py-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={L_employeeId}
                    onChange={(e) => setL_employeeId(e.target.value)}
                  >
                    <option value="">All</option>
                    {L_filterOptions.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.id}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="border px-1 py-1">
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={L_from}
                    onChange={(e) => setL_from(e.target.value)}
                  />
                </th>
                <th className="border px-1 py-1">
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={L_to}
                    onChange={(e) => setL_to(e.target.value)}
                  />
                </th>
                <th className="border px-1 py-1">
                  <span className="text-gray-400 font-normal">—</span>
                </th>
                <th className="border px-1 py-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={L_type}
                    onChange={(e) => setL_type(e.target.value)}
                  >
                    <option value="">All</option>
                    {L_filterOptions.types.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </th>
                <th className="border px-1 py-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={L_status}
                    onChange={(e) => setL_status(e.target.value)}
                  >
                    <option value="">All</option>
                    {L_filterOptions.statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </th>
                <th className="border px-1 py-1">
                  <span className="text-gray-400 font-normal">—</span>
                </th>
                <th className="border px-1 py-1">
                  {hasLeavesFilters && (
                    <button
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={resetLeavesFilters}
                    >
                      Clear All
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {L_loading ? (
                <tr>
                  <td colSpan={9} className="border px-2 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : L_paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="border px-2 py-8 text-center text-gray-500">
                    No leaves found
                  </td>
                </tr>
              ) : (
                L_paginatedRows.map((r) => {
                  const emp = resolveEmployee(r);
                  return (
                    <tr key={r._id} className="hover:bg-blue-50">
                      <td className="border px-2 py-2">
                        <div className="font-medium">{emp.name}</div>
                        {(emp.role || emp.department) && (
                          <div className="text-xs text-gray-500">
                            {emp.role}{emp.department ? ` • ${emp.department}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="border px-2 py-2">{emp.employeeId}</td>
                      <td className="border px-2 py-2">{fmtDate(r.startDate)}</td>
                      <td className="border px-2 py-2">{fmtDate(r.endDate)}</td>
                      <td className="border px-2 py-2">{r.days ?? daysBetween(r.startDate, r.endDate)}</td>
                      <td className="border px-2 py-2 capitalize">{r.type}</td>
                      <td className="border px-2 py-2">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={r.status}
                          onChange={(e) => updateLeaveStatus(r._id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border px-2 py-2 max-w-[200px] truncate" title={r.purpose}>
                        {r.purpose || "-"}
                      </td>
                      <td className="border px-2 py-2">{fmtDate(r.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== RH TABLE ===================== */}
      {tab === "rh" && (
        <div className="border rounded overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
          <table className="table-auto w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border px-2 py-2 text-left">Employee</th>
                <th className="border px-2 py-2 text-left">Emp ID</th>
                <th className="border px-2 py-2 text-left">Holiday</th>
                <th
                  className="border px-2 py-2 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("holidayDate")}
                >
                  Date {sortBy === "holidayDate" && (dir === "asc" ? "↑" : "↓")}
                </th>
                <th className="border px-2 py-2 text-left">Status</th>
                <th className="border px-2 py-2 text-left">Note</th>
                <th
                  className="border px-2 py-2 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("createdAt")}
                >
                  Created {sortBy === "createdAt" && (dir === "asc" ? "↑" : "↓")}
                </th>
              </tr>

              {/* Filter Row */}
              <tr className="bg-gray-100">
                <th className="border px-1 py-1">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    placeholder="Filter name..."
                    value={R_employeeName}
                    onChange={(e) => setR_employeeName(e.target.value)}
                  />
                </th>
                <th className="border px-1 py-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={R_employeeId}
                    onChange={(e) => setR_employeeId(e.target.value)}
                  >
                    <option value="">All</option>
                    {R_filterOptions.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.id}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="border px-1 py-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={R_holidayName}
                    onChange={(e) => setR_holidayName(e.target.value)}
                  >
                    <option value="">All Holidays</option>
                    {R_filterOptions.holidayNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </th>
                <th className="border px-1 py-1">
                  <div className="flex gap-1">
                    <input
                      type="date"
                      className="w-1/2 border rounded px-1 py-1 text-xs font-normal"
                      value={R_from}
                      onChange={(e) => setR_from(e.target.value)}
                      title="From"
                    />
                    <input
                      type="date"
                      className="w-1/2 border rounded px-1 py-1 text-xs font-normal"
                      value={R_to}
                      onChange={(e) => setR_to(e.target.value)}
                      title="To"
                    />
                  </div>
                </th>
                <th className="border px-1 py-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm font-normal"
                    value={R_status}
                    onChange={(e) => setR_status(e.target.value)}
                  >
                    <option value="">All</option>
                    {R_filterOptions.statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </th>
                <th className="border px-1 py-1">
                  <span className="text-gray-400 font-normal">—</span>
                </th>
                <th className="border px-1 py-1">
                  {hasRHFilters && (
                    <button
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={resetRHFilters}
                    >
                      Clear All
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {R_loading ? (
                <tr>
                  <td colSpan={7} className="border px-2 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : R_paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border px-2 py-8 text-center text-gray-500">
                    No RH requests found
                  </td>
                </tr>
              ) : (
                R_paginatedRows.map((r) => {
                  const emp = resolveEmployee(r);
                  return (
                    <tr key={r._id} className="hover:bg-blue-50">
                      <td className="border px-2 py-2">
                        <div className="font-medium">{emp.name}</div>
                        {(emp.role || emp.department) && (
                          <div className="text-xs text-gray-500">
                            {emp.role}{emp.department ? ` • ${emp.department}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="border px-2 py-2">{emp.employeeId}</td>
                      <td className="border px-2 py-2">{r.holidayName || "-"}</td>
                      <td className="border px-2 py-2">{fmtDate(r.holidayDate)}</td>
                      <td className="border px-2 py-2">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={r.status}
                          onChange={(e) => updateRHStatus(r._id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border px-2 py-2 max-w-[200px] truncate" title={r.note}>
                        {r.note || "-"}
                      </td>
                      <td className="border px-2 py-2">{fmtDate(r.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== PAGINATION ===================== */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {tab === "leaves" ? (
            <>
              Showing {L_paginatedRows.length ? (page - 1) * limit + 1 : 0}–
              {(page - 1) * limit + L_paginatedRows.length} of {L_filteredRows.length}
              {hasLeavesFilters && L_filteredRows.length !== L_rawRows.length && (
                <span className="text-blue-600"> (filtered from {L_rawRows.length})</span>
              )}
            </>
          ) : (
            <>
              Showing {R_paginatedRows.length ? (page - 1) * limit + 1 : 0}–
              {(page - 1) * limit + R_paginatedRows.length} of {R_filteredRows.length}
              {hasRHFilters && R_filteredRows.length !== R_rawRows.length && (
                <span className="text-blue-600"> (filtered from {R_rawRows.length})</span>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="px-2 py-1 text-sm">
            Page {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}