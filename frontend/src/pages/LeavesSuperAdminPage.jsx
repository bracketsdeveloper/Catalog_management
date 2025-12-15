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
const LEAVE_TYPES = ["earned", "sick", "additional", "special"];
const STATUSES = ["applied", "pending", "approved", "rejected", "cancelled"];

/* Sort whitelists must match backend route logic */
const LEAVES_SORT_KEYS = ["startDate", "endDate", "createdAt", "updatedAt"];
const RH_SORT_KEYS = ["holidayDate", "createdAt", "updatedAt"];

/* ---------- helpers ---------- */
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  
  return `${day}-${month}-${year}`;
}

function daysBetween(a, b) {
  const A = new Date(a),
    B = new Date(b);
  if (isNaN(A) || isNaN(B)) return "";
  return Math.max(1, Math.ceil((B - A) / (1000 * 60 * 60 * 24)) + 1);
}

/** Normalize employee object coming from backend hydration */
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
  const [tab, setTab] = useState("leaves"); // "leaves" | "rh"

  /* Shared query state */
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("startDate"); // default valid for "leaves"
  const [dir, setDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  /* Leaves filters (applied) */
  const [L_employeeId, setL_employeeId] = useState("");
  const [L_employeeName, setL_employeeName] = useState("");
  const [L_type, setL_type] = useState("");
  const [L_status, setL_status] = useState("");
  const [L_from, setL_from] = useState("");
  const [L_to, setL_to] = useState("");

  /* Leaves header filter inputs (staged) */
  const [LF_employeeId, setLF_employeeId] = useState("");
  const [LF_employeeName, setLF_employeeName] = useState("");
  const [LF_type, setLF_type] = useState("");
  const [LF_status, setLF_status] = useState("");
  const [LF_from, setLF_from] = useState("");
  const [LF_to, setLF_to] = useState("");

  /* RH filters (applied) */
  const [R_employeeId, setR_employeeId] = useState("");
  const [R_employeeName, setR_employeeName] = useState("");
  const [R_status, setR_status] = useState("");
  const [R_from, setR_from] = useState("");
  const [R_to, setR_to] = useState("");

  /* RH header filter inputs (staged) */
  const [RF_employeeId, setRF_employeeId] = useState("");
  const [RF_employeeName, setRF_employeeName] = useState("");
  const [RF_status, setRF_status] = useState("");
  const [RF_from, setRF_from] = useState("");
  const [RF_to, setRF_to] = useState("");

  /* Data state: Leaves */
  const [L_rows, setL_rows] = useState([]);
  const [L_total, setL_total] = useState(0);
  const [L_loading, setL_loading] = useState(false);

  /* Data state: RH */
  const [R_rows, setR_rows] = useState([]);
  const [R_total, setR_total] = useState(0);
  const [R_loading, setR_loading] = useState(false);

  /* Simple cache to avoid re-fetching the same employee again and again */
  const empCacheRef = useRef(new Map()); // key: employeeId -> value: {name, role, department}

  /* Pagination calc */
  const totalPages = useMemo(() => {
    const total = tab === "leaves" ? L_total : R_total;
    return Math.max(1, Math.ceil(total / limit));
  }, [tab, L_total, R_total, limit]);

  /* Validate and normalize sortBy on tab switch or manual edits */
  useEffect(() => {
    const keys = tab === "leaves" ? LEAVES_SORT_KEYS : RH_SORT_KEYS;
    if (!keys.includes(sortBy)) {
      setSortBy(tab === "leaves" ? "startDate" : "holidayDate");
      setDir("desc");
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* Fetch and hydrate missing employee names by employeeId (server already hydrates when possible).
     This is a fallback for rows where employee.name is still empty but we have employeeId. */
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

      const chunks = [];
      const CHUNK_SIZE = 8;
      for (let i = 0; i < uniq.length; i += CHUNK_SIZE) {
        chunks.push(uniq.slice(i, i + CHUNK_SIZE));
      }

      for (const batch of chunks) {
        const fetches = batch.map((eid) =>
          EmployeesAPI.getByEmployeeId(eid)
            .then(({ data }) => {
              const name = data?.personal?.name || "";
              const role = data?.org?.role || "";
              const department = data?.org?.department || "";
              empCacheRef.current.set(eid, { name, role, department });
            })
            .catch(() => {
              empCacheRef.current.set(eid, { name: "", role: "", department: "" });
            })
        );
        await Promise.all(fetches);
      }

      const patched = rows.map((r) => {
        const emp = resolveEmployee(r);
        const id = (emp.employeeId || "").trim();
        const cacheHit = id ? empCacheRef.current.get(id) : null;
        if (!emp.name || emp.name === "-") {
          if (cacheHit && cacheHit.name) {
            return {
              ...r,
              employee: {
                ...(r.employee || {}),
                employeeId: id || r.employeeId,
                name: cacheHit.name,
                role: cacheHit.role || (r.employee?.role || ""),
                department: cacheHit.department || (r.employee?.department || ""),
              },
            };
          }
        }
        return r;
      });

      setRows(patched);
      return patched;
    } catch {
      return rows;
    }
  }

  /* Fetch leaves */
  async function fetchLeaves() {
    try {
      setL_loading(true);
      const safeSort = LEAVES_SORT_KEYS.includes(sortBy) ? sortBy : "startDate";
      const { data } = await LeavesAPI.list({
        q,
        employeeId: L_employeeId,
        employeeName: L_employeeName,
        type: L_type,
        status: L_status,
        from: L_from,
        to: L_to,
        sortBy: safeSort,
        dir,
        page,
        limit,
        includeEmployee: "1",
      });
      const baseRows = data.rows || [];
      setL_rows(baseRows);
      setL_total(data.total || 0);
      hydrateMissingEmployeeNames(baseRows, setL_rows);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load leaves");
    } finally {
      setL_loading(false);
    }
  }

  /* Fetch RH */
  async function fetchRH() {
    try {
      setR_loading(true);
      const safeSort = RH_SORT_KEYS.includes(sortBy) ? sortBy : "holidayDate";
      const { data } = await RHAPI.list({
        q,
        employeeId: R_employeeId,
        employeeName: R_employeeName,
        status: R_status,
        from: R_from,
        to: R_to,
        sortBy: safeSort,
        dir,
        page,
        limit,
      });
      const baseRows = data.rows || [];
      setR_rows(baseRows);
      setR_total(data.total || 0);
      hydrateMissingEmployeeNames(baseRows, setR_rows);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load restricted holiday requests");
    } finally {
      setR_loading(false);
    }
  }

  /* Load on dependency change */
  useEffect(() => {
    if (tab === "leaves") fetchLeaves();
    if (tab === "rh") fetchRH();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    q,
    sortBy,
    dir,
    page,
    limit,
    L_employeeId,
    L_employeeName,
    L_type,
    L_status,
    L_from,
    L_to,
    R_employeeId,
    R_employeeName,
    R_status,
    R_from,
    R_to,
  ]);

  /* Sorting */
  function toggleSort(col) {
    const keys = tab === "leaves" ? LEAVES_SORT_KEYS : RH_SORT_KEYS;
    if (!keys.includes(col)) return; // ignore invalid for current tab
    if (sortBy === col) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setDir("asc");
    }
  }

  /* Apply/Reset header filters */
  function applyLeavesHeaderFilters() {
    setL_employeeId(LF_employeeId.trim());
    setL_employeeName(LF_employeeName.trim());
    setL_type(LF_type);
    setL_status(LF_status);
    setL_from(LF_from);
    setL_to(LF_to);
    setPage(1);
  }
  function resetLeavesHeaderFilters() {
    setLF_employeeId("");
    setLF_employeeName("");
    setLF_type("");
    setLF_status("");
    setLF_from("");
    setLF_to("");
    setL_employeeId("");
    setL_employeeName("");
    setL_type("");
    setL_status("");
    setL_from("");
    setL_to("");
    setPage(1);
  }

  function applyRHHeaderFilters() {
    setR_employeeId(RF_employeeId.trim());
    setR_employeeName(RF_employeeName.trim());
    setR_status(RF_status);
    setR_from(RF_from);
    setR_to(RF_to);
    setPage(1);
  }
  function resetRHHeaderFilters() {
    setRF_employeeId("");
    setRF_employeeName("");
    setRF_status("");
    setRF_from("");
    setRF_to("");
    setR_employeeId("");
    setR_employeeName("");
    setR_status("");
    setR_from("");
    setR_to("");
    setPage(1);
  }

  /* Status updates */
  async function updateLeaveStatus(id, newStatus) {
    try {
      await LeavesAPI.setStatus(id, newStatus);
      setL_rows((prev) => prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r)));
      toast.success("Leave status updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update leave status");
    }
  }
  async function updateRHStatus(id, newStatus) {
    try {
      await RHAPI.setStatus(id, newStatus);
      setR_rows((prev) => prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r)));
      toast.success("RH status updated");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update RH status");
    }
  }

  /* Tab-specific sort options */
  const sortOptions = tab === "leaves" ? LEAVES_SORT_KEYS : RH_SORT_KEYS;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Time Off — Super Admin</h1>

      {/* Switch tabs */}
      <div className="inline-flex overflow-hidden rounded-lg border mb-4">
        <button
          className={`px-4 py-2 text-sm ${tab === "leaves" ? "bg-blue-600 text-white" : "bg-white"}`}
          onClick={() => {
            setTab("leaves");
            setPage(1);
            setSortBy("startDate"); // valid default for leaves
            setDir("desc");
          }}
        >
          Leave Applications
        </button>
        <button
          className={`px-4 py-2 text-sm ${tab === "rh" ? "bg-blue-600 text-white" : "bg-white"}`}
          onClick={() => {
            setTab("rh");
            setPage(1);
            setSortBy("holidayDate"); // valid default for RH
            setDir("desc");
          }}
        >
          Restricted Holidays
        </button>
      </div>

      {/* Top toolbar */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs block mb-1">Common search</label>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder={
              tab === "leaves"
                ? "Purpose or Employee ID"
                : "Holiday name, note, or Employee ID"
            }
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div>
          <label className="text-xs block mb-1">Sort by</label>
          <select
            className="border rounded px-2 py-1"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {sortOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1">Direction</label>
          <select
            className="border rounded px-2 py-1"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <div>
          <label className="text-xs block mb-1">Per page</label>
          <select
            className="border rounded px-2 py-1"
            value={limit}
            onChange={(e) => {
              setLimit(+e.target.value);
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leaves tab */}
      {tab === "leaves" && (
        <div className="border rounded overflow-x-auto">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-2">Employee</th>
                <th className="border px-2 py-2">Emp ID</th>

                <th
                  className="border px-2 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("startDate")}
                >
                  Start {sortBy === "startDate" ? (dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th
                  className="border px-2 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("endDate")}
                >
                  End {sortBy === "endDate" ? (dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="border px-2 py-2">Days</th>

                <th className="border px-2 py-2">Type</th>
                <th className="border px-2 py-2">Status</th>
                <th className="border px-2 py-2">Purpose</th>

                <th
                  className="border px-2 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("createdAt")}
                >
                  Created {sortBy === "createdAt" ? (dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="border px-2 py-2">Actions</th>
              </tr>

              {/* header filters */}
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">
                  <input
                    className="w-full border rounded px-2 py-1"
                    placeholder="Name"
                    value={LF_employeeName}
                    onChange={(e) => setLF_employeeName(e.target.value)}
                  />
                </th>
                <th className="border px-2 py-1">
                  <input
                    className="w-full border rounded px-2 py-1"
                    placeholder="EMP-0001"
                    value={LF_employeeId}
                    onChange={(e) => setLF_employeeId(e.target.value)}
                  />
                </th>

                <th className="border px-2 py-1">
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1"
                    value={LF_from}
                    onChange={(e) => setLF_from(e.target.value)}
                  />
                </th>
                <th className="border px-2 py-1">
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1"
                    value={LF_to}
                    onChange={(e) => setLF_to(e.target.value)}
                  />
                </th>
                <th className="border px-2 py-1">
                  <span className="text-xs text-gray-400">—</span>
                </th>

                <th className="border px-2 py-1">
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={LF_type}
                    onChange={(e) => setLF_type(e.target.value)}
                  >
                    <option value="">All</option>
                    {LEAVE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="border px-2 py-1">
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={LF_status}
                    onChange={(e) => setLF_status(e.target.value)}
                  >
                    <option value="">All</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="border px-2 py-1">
                  <span className="text-xs text-gray-400">—</span>
                </th>

                <th className="border px-2 py-1">
                  <span className="text-xs text-gray-400">—</span>
                </th>
                <th className="border px-2 py-1">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 border rounded" onClick={applyLeavesHeaderFilters}>
                      Apply
                    </button>
                    <button className="px-2 py-1 border rounded" onClick={resetLeavesHeaderFilters}>
                      Reset
                    </button>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {L_loading ? (
                <tr>
                  <td className="border px-2 py-6 text-center" colSpan={10}>
                    Loading…
                  </td>
                </tr>
              ) : L_rows.length ? (
                L_rows.map((r) => {
                  const emp = resolveEmployee(r);
                  return (
                    <tr key={r._id} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-2 py-1">
                        {emp.name}
                        {emp.role || emp.department ? (
                          <div className="text-xs text-gray-500">
                            {emp.role}
                            {emp.department ? ` • ${emp.department}` : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="border px-2 py-1">{emp.employeeId}</td>

                      <td className="border px-2 py-1">{fmtDate(r.startDate)}</td>
                      <td className="border px-2 py-1">{fmtDate(r.endDate)}</td>
                      <td className="border px-2 py-1">
                        {r.days ?? daysBetween(r.startDate, r.endDate)}
                      </td>

                      <td className="border px-2 py-1">{r.type}</td>
                      <td className="border px-2 py-1">
                        <select
                          className="border rounded px-2 py-1"
                          value={r.status}
                          onChange={(e) => updateLeaveStatus(r._id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border px-2 py-1">{r.purpose || "-"}</td>

                      <td className="border px-2 py-1">{fmtDate(r.createdAt)}</td>
                      <td className="border px-2 py-1">
                        <span className="text-xs text-gray-400">—</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="border px-2 py-6 text-center text-gray-500" colSpan={10}>
                    No leaves found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RH tab */}
      {tab === "rh" && (
        <div className="border rounded overflow-x-auto">
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-2">Employee</th>
                <th className="border px-2 py-2">Emp ID</th>
                <th className="border px-2 py-2">Holiday</th>

                <th
                  className="border px-2 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("holidayDate")}
                >
                  Date {sortBy === "holidayDate" ? (dir === "asc" ? "↑" : "↓") : ""}
                </th>

                <th className="border px-2 py-2">Status</th>
                <th className="border px-2 py-2">Note</th>
                <th
                  className="border px-2 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("createdAt")}
                >
                  Created {sortBy === "createdAt" ? (dir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="border px-2 py-2">Actions</th>
              </tr>

              {/* header filters */}
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">
                  <input
                    className="w-full border rounded px-2 py-1"
                    placeholder="Name"
                    value={RF_employeeName}
                    onChange={(e) => setRF_employeeName(e.target.value)}
                  />
                </th>
                <th className="border px-2 py-1">
                  <input
                    className="w-full border rounded px-2 py-1"
                    placeholder="EMP-0001"
                    value={RF_employeeId}
                    onChange={(e) => setRF_employeeId(e.target.value)}
                  />
                </th>
                <th className="border px-2 py-1">
                  <input
                    className="w-full border rounded px-2 py-1"
                    placeholder="Holiday name"
                    disabled
                  />
                </th>

                <th className="border px-2 py-1">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="border rounded px-2 py-1"
                      value={RF_from}
                      onChange={(e) => setRF_from(e.target.value)}
                    />
                    <input
                      type="date"
                      className="border rounded px-2 py-1"
                      value={RF_to}
                      onChange={(e) => setRF_to(e.target.value)}
                    />
                  </div>
                </th>

                <th className="border px-2 py-1">
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={RF_status}
                    onChange={(e) => setRF_status(e.target.value)}
                  >
                    <option value="">All</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="border px-2 py-1">
                  <span className="text-xs text-gray-400">—</span>
                </th>
                <th className="border px-2 py-1">
                  <span className="text-xs text-gray-400">—</span>
                </th>
                <th className="border px-2 py-1">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 border rounded" onClick={applyRHHeaderFilters}>
                      Apply
                    </button>
                    <button className="px-2 py-1 border rounded" onClick={resetRHHeaderFilters}>
                      Reset
                    </button>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {R_loading ? (
                <tr>
                  <td className="border px-2 py-6 text-center" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : R_rows.length ? (
                R_rows.map((r) => {
                  const emp = resolveEmployee(r);
                  return (
                    <tr key={r._id} className="odd:bg-white even:bg-gray-50">
                      <td className="border px-2 py-1">
                        {emp.name}
                        {emp.role || emp.department ? (
                          <div className="text-xs text-gray-500">
                            {emp.role}
                            {emp.department ? ` • ${emp.department}` : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="border px-2 py-1">{emp.employeeId}</td>
                      <td className="border px-2 py-1">{r.holidayName || "-"}</td>

                      <td className="border px-2 py-1">{fmtDate(r.holidayDate)}</td>

                      <td className="border px-2 py-1">
                        <select
                          className="border rounded px-2 py-1"
                          value={r.status}
                          onChange={(e) => updateRHStatus(r._id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border px-2 py-1">{r.note || "-"}</td>
                      <td className="border px-2 py-1">{fmtDate(r.createdAt)}</td>
                      <td className="border px-2 py-1">
                        <span className="text-xs text-gray-400">—</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="border px-2 py-6 text-center text-gray-500" colSpan={8}>
                    No RH requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {tab === "leaves" ? (
            <>
              Showing {L_rows.length ? (page - 1) * limit + 1 : 0}–
              {(page - 1) * limit + L_rows.length} of {L_total}
            </>
          ) : (
            <>
              Showing {R_rows.length ? (page - 1) * limit + 1 : 0}–
              {(page - 1) * limit + R_rows.length} of {R_total}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="px-2 py-1 text-sm">
            Page {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
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