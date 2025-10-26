// src/pages/hrms/WfhPage.jsx
import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import FiltersBar from "../components/common/FiltersBar";
import EmployeeSelect from "../components/hrms/EmployeeSelect";
import { HRMS } from "../api/hrmsClient";

export default function WfhPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState("");

  const normalizeRows = (data) => {
    // Accept either an array or { rows: [...] }
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
  };

  const refresh = () =>
    HRMS.listWfh({ date })
      .then(r => setRows(normalizeRows(r.data)))
      .catch(() => setRows([]));

  useEffect(() => { refresh(); }, [date]);

  const save = async () => {
    if (!employeeId || !date) return;
    await HRMS.upsertWfh({ employeeId, date, reason });
    setEmployeeId(""); setReason("");
    refresh();
  };

  return (
    <div className="p-6">
      <PageHeader title="Work From Home" />
      <FiltersBar>
        <div>
          <div className="text-xs">Date</div>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs">Add WFH</div>
          <div className="flex gap-2">
            <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Reason"
              value={reason}
              onChange={(e)=>setReason(e.target.value)}
            />
            <button
              className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
              onClick={save}
            >
              Save
            </button>
          </div>
        </div>
      </FiltersBar>

      <div className="overflow-x-auto border rounded">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left">Employee ID</th>
              <th className="border px-2 py-1 text-left">Date</th>
              <th className="border px-2 py-1 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((r) => (
              <tr key={r._id || `${r.employeeId}-${String(r.date).slice(0,10)}`} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.employeeId}</td>
                <td className="border px-2 py-1">{String(r.date).slice(0,10)}</td>
                <td className="border px-2 py-1">{r.reason || "-"}</td>
              </tr>
            )) : (
              <tr>
                <td className="border px-2 py-4 text-center text-gray-500" colSpan={3}>
                  No WFH entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
