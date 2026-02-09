import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { HRMS } from "../api/hrmsClient";
import SalaryPreviewTable from "../components/salary/SalaryPreviewTable";
import SalaryRecordModal from "../components/salary/SalaryRecordModal";

const todayISO = () => new Date().toISOString().split("T")[0];

function addDaysISO(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function SalaryModulePage() {
  const [startDate, setStartDate] = useState(addDaysISO(todayISO(), -13)); // default last 14 days
  const [endDate, setEndDate] = useState(todayISO());
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);

  const [previewRows, setPreviewRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate };
      if (employeeId.trim()) params.employeeId = employeeId.trim();
      const res = await HRMS.previewSalary(params);
      setPreviewRows(res?.data?.results || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load salary preview");
      setPreviewRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      await HRMS.generateSalary({
        startDate,
        endDate,
        employeeId: employeeId.trim() || undefined,
        frequency: "custom",
        overrides: {} // you can pass pf/tax/etc here later
      });
      toast.success("Salary records generated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate salary records");
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = useMemo(() => `${startDate} → ${endDate}`, [startDate, endDate]);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Salary Module</h1>
          <p className="text-sm text-gray-600 mt-1">
            Hourly shortfall deduction: <b>₹500 × ceil(missed hours per week)</b> (expected hours excludes leaves & holidays)
          </p>
          <p className="text-xs text-gray-500 mt-1">Period: {periodLabel}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchPreview}
            disabled={loading}
            className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            Refresh Preview
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Generate Records
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID (optional)</label>
          <input
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="e.g. EMP001"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchPreview}
            disabled={loading}
            className="w-full px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black disabled:opacity-60"
          >
            Preview
          </button>
        </div>
      </div>

      <div className="mt-6">
        <SalaryPreviewTable
          loading={loading}
          rows={previewRows}
          onRowClick={(row) => setSelected(row)}
        />
      </div>

      {selected && (
        <SalaryRecordModal
          record={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
