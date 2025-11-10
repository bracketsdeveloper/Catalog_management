// src/pages/hrms/AttendancePage.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import PageHeader from "../components/common/PageHeader";
import FiltersBar from "../components/common/FiltersBar";
import RangePicker from "../components/common/RangePicker";
import ExportButton from "../components/common/ExportButton";
import EmployeeSelect from "../components/hrms/EmployeeSelect";
import { StatCard } from "../components/common/StatCard";
import { HRMS } from "../api/hrmsClient";
import { toast } from "react-toastify";

/* ========================= Upload Attendance Modal ========================= */
function UploadAttendanceModal({ onClose, onImported }) {
  const dialogRef = useRef(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // {imported, skipped, errors[]}

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const ae = document.activeElement;
    if (!ae || ae === document.body) dialogRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const upload = async () => {
    if (!file) {
      toast.error("Pick a .xls, .xlsx or .csv file.");
      return;
    }
    const api = process.env.REACT_APP_BACKEND_URL;
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);

    setSubmitting(true);
    try {
      const res = await fetch(`${api}/api/hrms/attendance/import-file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      setResult(data);
      toast.success(`Imported: ${data.imported}, Skipped: ${data.skipped}`);
      onImported && onImported();
    } catch (e) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 sm:p-4"
      onClick={onBackdrop}
      aria-modal="true"
      role="dialog"
      aria-labelledby="upload-attendance-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white rounded-lg w-full max-w-lg outline-none shadow-lg
                   max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 id="upload-attendance-title" className="text-base sm:text-lg font-semibold">
            Upload daily attendance
          </h2>
          <button className="text-sm text-gray-600 hover:underline" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 py-4 space-y-4 overflow-y-auto">
          <div className="text-xs text-gray-600">
            Accepted formats: .xls, .xlsx, .csv. The column “E Code” will be used as Employee ID. 
            Include columns for Date, In Time, Out Time, and (optionally) Hours.
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">Select file</label>
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm border rounded px-2 py-1"
            />
          </div>

          {result && (
            <div className="border rounded p-3 bg-gray-50 text-xs">
              <div className="font-semibold mb-2">Import summary</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Imported: <b>{result.imported}</b></div>
                <div>Skipped: <b>{result.skipped}</b></div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold">Errors</div>
                  <ul className="list-disc list-inside">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t">
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 text-xs rounded border" onClick={onClose} disabled={submitting}>
              Close
            </button>
            <button
              className="px-3 py-1 text-xs rounded bg-emerald-600 text-white disabled:opacity-60"
              onClick={upload}
              disabled={submitting || !file}
            >
              {submitting ? "Uploading…" : "Upload & Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================= Mark Attendance Modal (manual) ========================= */
function MarkAttendanceModal({ onClose, onSaved }) {
  const dialogRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]); // [{employeeId, name, dept, status}]
  const [filterQ, setFilterQ] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await HRMS.listEmployees({ active: "true", limit: 1000 });
        const list = (r.data.rows || []).map((e) => ({
          employeeId: e?.personal?.employeeId || "",
          name: e?.personal?.name || "",
          dept: e?.org?.department || "",
          status: "Present",
        }));
        setRows(list);
      } catch {
        setRows([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const ae = document.activeElement;
    if (!ae || ae === document.body) dialogRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const setAll = (val) => {
    setRows((prev) => prev.map((r) => ({ ...r, status: val })));
  };

  const updateRow = (idx, status) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], status };
      return copy;
    });
  };

  const filtered = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.employeeId.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.dept.toLowerCase().includes(q)
    );
  }, [rows, filterQ]);

  const save = async () => {
    const records = rows
      .filter((r) => r.employeeId)
      .map((r) => ({ employeeId: r.employeeId, status: r.status }));

    if (!date) {
      toast.error("Please pick a date.");
      return;
    }
    if (!records.length) {
      toast.error("No employees to save.");
      return;
    }

    setSaving(true);
    try {
      await HRMS.markAttendanceBulk({ date, records });
      toast.success("Attendance saved.");
      onSaved && onSaved(date);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 sm:p-4"
      onClick={onBackdrop}
      aria-modal="true"
      role="dialog"
      aria-labelledby="mark-attendance-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white rounded-lg w-full max-w-5xl outline-none shadow-lg
                   max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10">
          <h2 id="mark-attendance-title" className="text-base sm:text-lg font-semibold">
            Mark Attendance
          </h2>
          <button className="text-sm text-gray-600 hover:underline" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Controls */}
        <div className="px-4 sm:px-5 py-3 border-b sticky top-[48px] sm:top-[52px] bg-white z-10">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Search</label>
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="Name / ID / Dept"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Set all to</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                onChange={(e) => setAll(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose…
                </option>
                <option value="Present">Present</option>
                <option value="Leave">Leave</option>
                <option value="WFH">WFH</option>
              </select>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 py-3 overflow-y-auto">
          <div className="overflow-x-auto border rounded">
            <table className="table-auto w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left">Employee ID</th>
                  <th className="border px-2 py-1 text-left">Name</th>
                  <th className="border px-2 py-1 text-left">Department</th>
                  <th className="border px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.employeeId || idx} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{r.employeeId}</td>
                    <td className="border px-2 py-1">{r.name}</td>
                    <td className="border px-2 py-1">{r.dept || "-"}</td>
                    <td className="border px-2 py-1">
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={r.status}
                        onChange={(e) => updateRow(idx, e.target.value)}
                      >
                        <option value="Present">Present</option>
                        <option value="Leave">Leave</option>
                        <option value="WFH">WFH</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td className="border px-2 py-4 text-center text-gray-500" colSpan={4}>
                      No employees
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t sticky bottom-0 bg-white z-10">
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 text-xs rounded border" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================== Page =============================== */
export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState("");
  const [range, setRange] = useState("last-1m");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchData = () => {
    if (!employeeId) return;
    const params = range === "custom" ? { range, from: custom.from, to: custom.to } : { range };
    HRMS.getAttendance(employeeId, params)
      .then((r) => setData(r.data))
      .catch(() => setData(null));
  };

  useEffect(() => {
    fetchData();
  }, [employeeId, range, custom.from, custom.to]);

  const rows = data?.rows || [];
  const redRow = (r) => !r.isHoliday && !r.isWeekend && (!r.hours || r.hours === 0);
  const yellowRow = (r) => r.isHoliday || r.isWeekend;

  return (
    <div className="p-6">
      <PageHeader
        title="Attendance"
        actions={[
          <button
            key="upload"
            className="px-3 py-1 text-xs rounded border"
            onClick={() => setUploadOpen(true)}
          >
            Upload attendance
          </button>,
          <button
            key="mark"
            className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
            onClick={() => setMarkOpen(true)}
          >
            Mark Attendance
          </button>,
          <ExportButton
            key="exp"
            onClick={() => employeeId && HRMS.exportAttendance(employeeId).then(dlBlob)}
          />
        ]}
      />

      <FiltersBar>
        <div>
          <div className="text-xs">Employee</div>
          <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
        </div>
        <div>
          <div className="text-xs">Range</div>
          <RangePicker value={range} onChange={setRange} custom={custom} setCustom={setCustom} />
        </div>
        <button className="px-3 py-1 text-xs rounded border" onClick={fetchData}>
          Refresh
        </button>
      </FiltersBar>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Days Worked / Total"
          value={`${data?.summary?.daysWorked || 0} / ${data?.summary?.totalDays || 0}`}
        />
        <StatCard label="Hours Worked (sum)" value={data?.summary?.totalHours || 0} />
        <StatCard
          label="Sundays & Holidays"
          value={(data?.summary?.holidays || 0) + (data?.summary?.weekends || 0)}
        />
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="table-auto w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Date", "Day", "Login", "Logout", "# of hours"].map((h) => (
                <th key={h} className="border px-2 py-1 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.employeeId}-${r.date}`}
                className={`${redRow(r) ? "bg-red-100" : yellowRow(r) ? "bg-yellow-100" : ""} hover:bg-gray-50`}
              >
                <td className="border px-2 py-1">{String(r.date).slice(0, 10)}</td>
                <td className="border px-2 py-1">{r.dayName || ""}</td>
                <td className="border px-2 py-1">{r.login || "-"}</td>
                <td className="border px-2 py-1">{r.logout || "-"}</td>
                <td className="border px-2 py-1">{r.hours || 0}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="border px-2 py-4 text-center text-gray-500" colSpan={5}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {uploadOpen && (
        <UploadAttendanceModal
          onClose={() => setUploadOpen(false)}
          onImported={() => {
            if (employeeId) fetchData();
          }}
        />
      )}

      {markOpen && (
        <MarkAttendanceModal
          onClose={() => setMarkOpen(false)}
          onSaved={() => {
            setMarkOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function dlBlob(res) {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance.xlsx";
  a.click();
  window.URL.revokeObjectURL(url);
}
