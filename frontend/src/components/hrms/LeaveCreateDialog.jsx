// src/components/hrms/LeaveCreateDialog.jsx
import { useState } from "react";
import { HRMS } from "../../api/hrmsClient";

export default function LeaveCreateDialog({ employeeId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "special", startDate: "", endDate: "", purpose: "" });
  const create = async () => {
    await HRMS.createLeave({ employeeId, ...form });
    setOpen(false);
    onCreated && onCreated();
  };
  return (
    <>
      <button className="px-3 py-1 text-xs rounded bg-emerald-600 text-white" onClick={() => setOpen(true)}>
        + Add Leave
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded p-4 w-full max-w-md">
            <div className="text-sm font-semibold mb-2">Create Leave</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-xs">Type</label>
                <select
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="special">Special</option>
                  <option value="additional">Additional</option>
                  <option value="sick">Sick</option>
                </select>
              </div>
              <div>
                <label className="text-xs">Start</label>
                <input type="date" className="border rounded w-full px-2 py-1 text-sm"
                  value={form.startDate} onChange={(e)=>setForm(f=>({...f,startDate:e.target.value}))}/>
              </div>
              <div>
                <label className="text-xs">End</label>
                <input type="date" className="border rounded w-full px-2 py-1 text-sm"
                  value={form.endDate} onChange={(e)=>setForm(f=>({...f,endDate:e.target.value}))}/>
              </div>
              <div className="col-span-2">
                <label className="text-xs">Purpose</label>
                <input className="border rounded w-full px-2 py-1 text-sm"
                  value={form.purpose} onChange={(e)=>setForm(f=>({...f,purpose:e.target.value}))}/>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-1 text-xs rounded border" onClick={()=>setOpen(false)}>Cancel</button>
              <button className="px-3 py-1 text-xs rounded bg-emerald-600 text-white" onClick={create}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
