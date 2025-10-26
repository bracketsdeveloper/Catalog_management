// src/components/hrms/EmployeeSelect.jsx
import { useEffect, useState } from "react";
import { HRMS } from "../../api/hrmsClient";

export default function EmployeeSelect({ value, onChange }) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    HRMS.listEmployees({ limit: 1000 })
      .then(r => setOptions(r.data.rows || []))
      .catch(() => setOptions([]));
  }, []);
  return (
    <select className="border rounded px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select Employee</option>
      {options.map((e) => (
        <option key={e._id} value={e.personal.employeeId}>
          {e.personal.name} — {e.personal.employeeId}
        </option>
      ))}
    </select>
  );
}
