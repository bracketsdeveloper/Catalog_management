// src/components/hrms/EmployeeModal.jsx
import { useEffect, useRef, useState, memo } from "react";
import { HRMS } from "../../api/hrmsClient";
import { toast } from "react-toastify";

/* ---------- Stable field wrapper (DO NOT define inside component) ---------- */
const Row = memo(function Row({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
});

export default function EmployeeModal({ onClose, onSaved }) {
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const dialogRef = useRef(null);

  const [personal, setPersonal] = useState({
    employeeId: "",
    name: "",
    dob: "",
    address: "",
    phone: "",
    emergencyPhone: "",
    aadhar: "",
    bloodGroup: "",
    dateOfJoining: "",
    medicalIssues: ""
  });

  const [org, setOrg] = useState({ role: "", department: "" });

  const [assets, setAssets] = useState({
    laptopSerial: "",
    mobileImei: "",
    mobileNumber: "",
    idCardsIssued: false
  });

  const [financial, setFinancial] = useState({
    bankName: "",
    bankAccountNumber: "",
    currentCTC: "",
    currentTakeHome: "",
    lastRevisedSalaryAt: "",
    nextAppraisalOn: ""
  });

  // Close on ESC, lock body scroll, and only focus once if nothing is focused
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const ae = document.activeElement;
    if (!ae || ae === document.body) {
      dialogRef.current?.focus({ preventScroll: true });
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const save = async () => {
    if (!personal.employeeId.trim() || !personal.name.trim()) {
      toast.error("Employee ID and Name are required.");
      return;
    }
    try {
      await HRMS.upsertEmployee({
        personal: {
          ...personal,
          dob: personal.dob ? new Date(personal.dob) : undefined,
          dateOfJoining: personal.dateOfJoining ? new Date(personal.dateOfJoining) : undefined
        },
        org,
        assets: { ...assets, idCardsIssued: Boolean(assets.idCardsIssued) },
        financial: isSuperAdmin
          ? {
              ...financial,
              currentCTC: financial.currentCTC ? Number(financial.currentCTC) : undefined,
              currentTakeHome: financial.currentTakeHome ? Number(financial.currentTakeHome) : undefined,
              lastRevisedSalaryAt: financial.lastRevisedSalaryAt ? new Date(financial.lastRevisedSalaryAt) : undefined,
              nextAppraisalOn: financial.nextAppraisalOn ? new Date(financial.nextAppraisalOn) : undefined
            }
          : {}
      });
      toast.success("Employee saved.");
      onSaved && onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Failed to save.");
    }
  };

  // Backdrop click to close (use onClick, not onMouseDown)
  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 sm:p-4"
      onClick={onBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="employee-modal-title"
    >
      {/* Wrapper controls width; inner content scrolls */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white rounded-lg w-full max-w-5xl outline-none shadow-lg
                   max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (sticky) */}
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10">
          <h2 id="employee-modal-title" className="text-base sm:text-lg font-semibold">
            Create Employee
          </h2>
          <button
            className="text-sm text-gray-600 hover:underline"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-4 sm:px-5 py-4 overflow-y-auto">
          {/* Personal */}
          <section className="mb-5">
            <h3 className="font-semibold text-sm mb-2">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Row label="Employee ID">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.employeeId}
                  onChange={(e)=>setPersonal(p=>({...p, employeeId:e.target.value}))}
                />
              </Row>
              <Row label="Name">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.name}
                  onChange={(e)=>setPersonal(p=>({...p, name:e.target.value}))}
                />
              </Row>
              <Row label="DOB">
                <input
                  autoComplete="off"
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.dob}
                  onChange={(e)=>setPersonal(p=>({...p, dob:e.target.value}))}
                />
              </Row>
              <Row label="Address">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.address}
                  onChange={(e)=>setPersonal(p=>({...p, address:e.target.value}))}
                />
              </Row>
              <Row label="Phone">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.phone}
                  onChange={(e)=>setPersonal(p=>({...p, phone:e.target.value}))}
                />
              </Row>
              <Row label="Emergency Phone">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.emergencyPhone}
                  onChange={(e)=>setPersonal(p=>({...p, emergencyPhone:e.target.value}))}
                />
              </Row>
              <Row label="Aadhar">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.aadhar}
                  onChange={(e)=>setPersonal(p=>({...p, aadhar:e.target.value}))}
                />
              </Row>
              <Row label="Blood Group">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.bloodGroup}
                  onChange={(e)=>setPersonal(p=>({...p, bloodGroup:e.target.value}))}
                />
              </Row>
              <Row label="Date of Joining">
                <input
                  autoComplete="off"
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.dateOfJoining}
                  onChange={(e)=>setPersonal(p=>({...p, dateOfJoining:e.target.value}))}
                />
              </Row>
              <Row label="Medical Issues">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={personal.medicalIssues}
                  onChange={(e)=>setPersonal(p=>({...p, medicalIssues:e.target.value}))}
                />
              </Row>
            </div>
          </section>

          {/* Org */}
          <section className="mb-5">
            <h3 className="font-semibold text-sm mb-2">Organisational Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Row label="Role">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={org.role}
                  onChange={(e)=>setOrg(o=>({...o, role:e.target.value}))}
                />
              </Row>
              <Row label="Department">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={org.department}
                  onChange={(e)=>setOrg(o=>({...o, department:e.target.value}))}
                />
              </Row>
            </div>
          </section>

          {/* Assets */}
          <section className="mb-5">
            <h3 className="font-semibold text-sm mb-2">Assets Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Row label="Laptop Serial">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={assets.laptopSerial}
                  onChange={(e)=>setAssets(a=>({...a, laptopSerial:e.target.value}))}
                />
              </Row>
              <Row label="Mobile IMEI">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={assets.mobileImei}
                  onChange={(e)=>setAssets(a=>({...a, mobileImei:e.target.value}))}
                />
              </Row>
              <Row label="Mobile Number">
                <input
                  autoComplete="off"
                  className="border rounded px-2 py-1 text-sm"
                  value={assets.mobileNumber}
                  onChange={(e)=>setAssets(a=>({...a, mobileNumber:e.target.value}))}
                />
              </Row>
              <Row label="ID Cards Issued">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={assets.idCardsIssued ? "true" : "false"}
                  onChange={(e)=>setAssets(a=>({...a, idCardsIssued: e.target.value === "true"}))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </Row>
            </div>
          </section>

          {/* Financial (Super Admin only) */}
          {isSuperAdmin && (
            <section className="mb-2">
              <h3 className="font-semibold text-sm mb-2">Financial Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Row label="Bank">
                  <input
                    autoComplete="off"
                    className="border rounded px-2 py-1 text-sm"
                    value={financial.bankName}
                    onChange={(e)=>setFinancial(f=>({...f, bankName:e.target.value}))}
                  />
                </Row>
                <Row label="Account Number">
                  <input
                    autoComplete="off"
                    className="border rounded px-2 py-1 text-sm"
                    value={financial.bankAccountNumber}
                    onChange={(e)=>setFinancial(f=>({...f, bankAccountNumber:e.target.value}))}
                  />
                </Row>
                <Row label="Current CTC">
                  <input
                    autoComplete="off"
                    type="number"
                    className="border rounded px-2 py-1 text-sm"
                    value={financial.currentCTC}
                    onChange={(e)=>setFinancial(f=>({...f, currentCTC:e.target.value}))}
                  />
                </Row>
                <Row label="Take Home">
                  <input
                    autoComplete="off"
                    type="number"
                    className="border rounded px-2 py-1 text-sm"
                    value={financial.currentTakeHome}
                    onChange={(e)=>setFinancial(f=>({...f, currentTakeHome:e.target.value}))}
                  />
                </Row>
                <Row label="Last Revised">
                  <input
                    autoComplete="off"
                    type="date"
                    className="border rounded px-2 py-1 text-sm"
                    value={financial.lastRevisedSalaryAt}
                    onChange={(e)=>setFinancial(f=>({...f, lastRevisedSalaryAt:e.target.value}))}
                  />
                </Row>
                <Row label="Next Appraisal">
                  <input
                    autoComplete="off"
                    type="date"
                    className="border rounded px-2 py-1 text-sm"
                    value={financial.nextAppraisalOn}
                    onChange={(e)=>setFinancial(f=>({...f, nextAppraisalOn:e.target.value}))}
                  />
                </Row>
              </div>
            </section>
          )}
        </div>

        {/* Footer (sticky) */}
        <div className="px-4 sm:px-5 py-3 border-t sticky bottom-0 bg-white z-10">
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 text-xs rounded border" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
              onClick={save}
            >
              Save Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
