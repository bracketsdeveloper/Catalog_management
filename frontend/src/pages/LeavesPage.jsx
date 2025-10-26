// src/pages/hrms/LeavesPage.jsx
import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import FiltersBar from "../components/common/FiltersBar";
import EmployeeSelect from "../components/hrms/EmployeeSelect";
import LeaveCreateDialog from "../components/hrms/LeaveCreateDialog";
import Badge from "../components/common/Badge";
import { HRMS } from "../api/hrmsClient";

export default function LeavesPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [rows, setRows] = useState([]);
  const isAdmin = true; // gate approvals as per your auth

  const refresh = () => {
    if (!employeeId) return setRows([]);
    HRMS.listLeaves(employeeId).then(r=>setRows(r.data || [])).catch(()=>setRows([]));
  };

  useEffect(()=>{ refresh(); }, [employeeId]);

  const approve = async (id) => { await HRMS.decideLeave(id, "approved"); refresh(); };
  const reject = async (id) => { await HRMS.decideLeave(id, "rejected"); refresh(); };

  return (
    <div className="p-6">
      <PageHeader
        title="Leaves"
        actions={[ employeeId && <LeaveCreateDialog key="add" employeeId={employeeId} onCreated={refresh} /> ]}
      />
      <FiltersBar>
        <div>
          <div className="text-xs">Employee</div>
          <EmployeeSelect value={employeeId} onChange={setEmployeeId} />
        </div>
      </FiltersBar>

      <div className="overflow-x-auto border rounded">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1 text-left">Type</th>
              <th className="border px-2 py-1 text-left">Start</th>
              <th className="border px-2 py-1 text-left">End</th>
              <th className="border px-2 py-1 text-left">Days</th>
              <th className="border px-2 py-1 text-left">Purpose</th>
              <th className="border px-2 py-1 text-left">Status</th>
              <th className="border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l=>(
              <tr key={l._id} className="hover:bg-gray-50">
                <td className="border px-2 py-1 capitalize">{l.type}</td>
                <td className="border px-2 py-1">{String(l.startDate).slice(0,10)}</td>
                <td className="border px-2 py-1">{String(l.endDate).slice(0,10)}</td>
                <td className="border px-2 py-1">{l.days}</td>
                <td className="border px-2 py-1">{l.purpose || "-"}</td>
                <td className="border px-2 py-1">
                  <Badge color={
                    l.status === "approved" ? "green" :
                    l.status === "rejected" ? "red" : "yellow"
                  }>
                    {l.status}
                  </Badge>
                </td>
                <td className="border px-2 py-1">
                  {isAdmin && l.status === "pending" && (
                    <div className="flex gap-2">
                      <button className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white"
                        onClick={()=>approve(l._id)}>Approve</button>
                      <button className="text-xs px-2 py-0.5 rounded bg-red-600 text-white"
                        onClick={()=>reject(l._id)}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="border px-2 py-4 text-center text-gray-500" colSpan={7}>No leaves</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
