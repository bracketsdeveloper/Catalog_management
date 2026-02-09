import React from "react";

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

export default function SalaryPreviewTable({ loading, rows, onRowClick }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">Salary Preview</div>
        <div className="text-xs text-gray-500">{rows?.length || 0} employees</div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-600">Loading…</div>
      ) : rows?.length ? (
        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-right">Salary Offered</th>
                <th className="px-3 py-2 text-right">To be paid for (days)</th>
                <th className="px-3 py-2 text-right">Gross Salary</th>
                <th className="px-3 py-2 text-right">Expected Hours</th>
                <th className="px-3 py-2 text-right">Hours Worked</th>
                <th className="px-3 py-2 text-right">Missed Hours</th>
                <th className="px-3 py-2 text-right">Hourly Deduction</th>
                <th className="px-3 py-2 text-right">PF & Tax</th>
                <th className="px-3 py-2 text-right">Incentive</th>
                <th className="px-3 py-2 text-right">Bonus</th>
                <th className="px-3 py-2 text-right">Damages</th>
                <th className="px-3 py-2 text-right">Advance</th>
                <th className="px-3 py-2 text-right">Take Home</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.employeeId}-${r.periodStart}-${r.periodEnd}`}
                  className="border-t hover:bg-blue-50 cursor-pointer"
                  onClick={() => onRowClick?.(r)}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.employeeName || r.employeeId}</div>
                    <div className="text-xs text-gray-500">{r.employeeId} • {r.department || "-"} • {r.role || "-"}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{money(r.salaryOffered)}</td>
                  <td className="px-3 py-2 text-right">{Number(r.payableDays || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{money(r.grossSalary)}</td>

                  <td className="px-3 py-2 text-right">{Number(r.expectedHours || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{Number(r.actualHours || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{Number(r.missedHours || 0).toFixed(2)}</td>

                  <td className="px-3 py-2 text-right text-red-700 font-semibold">{money(r.hourlyDeduction)}</td>

                  <td className="px-3 py-2 text-right">{money(r.pfTaxDeduction)}</td>
                  <td className="px-3 py-2 text-right">{money(r.incentive)}</td>
                  <td className="px-3 py-2 text-right">{money(r.bonus)}</td>
                  <td className="px-3 py-2 text-right">{money(r.damages)}</td>
                  <td className="px-3 py-2 text-right">{money(r.advanceRecovery)}</td>

                  <td className="px-3 py-2 text-right font-bold text-gray-900">{money(r.takeHome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-gray-600">No data</div>
      )}
    </div>
  );
}
