import React from "react";

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

export default function SalaryRecordModal({ record, onClose }) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {record.employeeName || record.employeeId}
            </div>
            <div className="text-sm text-gray-600">
              {record.employeeId} • {record.department || "-"} • {record.role || "-"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Period: {String(record.periodStart).slice(0, 10)} → {String(record.periodEnd).slice(0, 10)}
            </div>
          </div>

          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
        </div>

        <div className="p-5 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Info label="Salary Offered" value={money(record.salaryOffered)} />
            <Info label="To be paid for (days)" value={Number(record.payableDays || 0).toFixed(2)} />
            <Info label="Gross Salary" value={money(record.grossSalary)} />
            <Info label="Hourly Deduction" value={money(record.hourlyDeduction)} strong red />
            <Info label="Expected Hours" value={Number(record.expectedHours || 0).toFixed(2)} />
            <Info label="Worked Hours" value={Number(record.actualHours || 0).toFixed(2)} />
            <Info label="Missed Hours" value={Number(record.missedHours || 0).toFixed(2)} />
            <Info label="Take Home" value={money(record.takeHome)} strong />
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-900 mb-2">Weekly Hourly Deduction Breakdown</div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Week</th>
                    <th className="px-3 py-2 text-right">Expected</th>
                    <th className="px-3 py-2 text-right">Worked</th>
                    <th className="px-3 py-2 text-right">Missed</th>
                    <th className="px-3 py-2 text-right">Deduction</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.weeks || []).map((w, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        {String(w.weekStart).slice(0, 10)} → {String(w.weekEnd).slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 text-right">{Number(w.expectedHours || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(w.actualHours || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{Number(w.missedHours || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-700">{money(w.hourlyDeduction)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{w.notes || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              Deduction rule: <b>₹500 × ceil(missedHoursInWeek)</b>. Expected hours exclude approved leaves + PUBLIC holidays (+ approved RH).
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex justify-end bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, strong, red }) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 ${strong ? "font-semibold" : ""} ${red ? "text-red-700" : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}
