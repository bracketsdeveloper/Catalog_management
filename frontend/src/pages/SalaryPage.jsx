// src/pages/hrms/SalaryPage.jsx
import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import FiltersBar from "../components/common/FiltersBar";
import RangePicker from "../components/common/RangePicker";
import Badge from "../components/common/Badge";
import { HRMS } from "../api/hrmsClient";

export default function SalaryPage() {
  const [mode, setMode] = useState("monthly");
  const [month, setMonth] = useState(getLastMonth());
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [range, setRange] = useState("last-1m"); // for cumulative

  const load = () => {
    const params = mode === "monthly"
      ? { mode, month }
      : (range === "custom" ? { mode: "cumulative", from: custom.from, to: custom.to } : { mode: "cumulative", range });
    HRMS.calcSalary(params).then(r => setRows(r.data.rows || [])).catch(()=>setRows([]));
  };

  useEffect(()=>{ load(); }, [mode, month, range, custom.from, custom.to]);

  const finalize = async () => {
    await HRMS.finalizeSalary({ rows, periodLabel: mode === "monthly" ? month : range });
    load();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Salary Calculation"
        actions={[
          <button key="fin" onClick={finalize} className="px-3 py-1 text-xs rounded bg-indigo-600 text-white">
            Finalize Accruals
          </button>
        ]}
      />

      <FiltersBar>
        <div className="flex items-center gap-3">
          <label className="text-sm">
            <input type="radio" name="mode" className="mr-1" checked={mode==="monthly"} onChange={()=>setMode("monthly")} />
            Monthly
          </label>
          <label className="text-sm">
            <input type="radio" name="mode" className="mr-1" checked={mode!=="monthly"} onChange={()=>setMode("cumulative")} />
            Cumulative
          </label>
        </div>

        {mode === "monthly" ? (
          <div>
            <div className="text-xs">Month</div>
            <input type="month" className="border rounded px-2 py-1 text-sm" value={month} onChange={(e)=>setMonth(e.target.value)} />
          </div>
        ) : (
          <div>
            <div className="text-xs">Range</div>
            <RangePicker value={range} onChange={setRange} custom={custom} setCustom={setCustom} />
          </div>
        )}

        <button className="px-3 py-1 text-xs rounded border" onClick={load}>Recalculate</button>
      </FiltersBar>

      <div className="overflow-x-auto border rounded">
        <table className="table-auto w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {["Employee","Role","Department","# Working Days","# Days Worked","Hours",
                "Earned +","Sick +","Additional +","Deduction","Remarks"].map(h=>(
                <th key={h} className="border px-2 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.employeeId} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.name} ({r.employeeId})</td>
                <td className="border px-2 py-1">{r.role || "-"}</td>
                <td className="border px-2 py-1">{r.department || "-"}</td>
                <td className="border px-2 py-1">{r.workingDays}</td>
                <td className="border px-2 py-1">{r.daysWorked}</td>
                <td className="border px-2 py-1">{r.totalHours}</td>
                <td className="border px-2 py-1">{r.allocation.earnedToAdd || 0}</td>
                <td className="border px-2 py-1">{r.allocation.sickToAdd || 0}</td>
                <td className="border px-2 py-1">{r.allocation.additionalToAdd || 0}</td>
                <td className="border px-2 py-1">
                  {r.salary.salaryDeductionDays > 0
                    ? <Badge color="red">{r.salary.salaryDeductionDays} day</Badge>
                    : <Badge color="green">Full</Badge>}
                </td>
                <td className="border px-2 py-1">{r.salary.remarks}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="border px-2 py-4 text-center text-gray-500" colSpan={11}>No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getLastMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
