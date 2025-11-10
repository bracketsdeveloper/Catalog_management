import { useEffect, useMemo, useRef, useState } from "react";
import { HRMS } from "../../api/hrmsClient";
import { toast } from "react-toastify";

export default function EmployeeModal({ onClose, onSaved, initial }) {
  const isEdit = Boolean(initial);

  const [personal, setPersonal] = useState(() => ({
    employeeId: initial?.personal?.employeeId || "",
    name: initial?.personal?.name || "",
    dob: initial?.personal?.dob ? initial.personal.dob.slice(0, 10) : "",
    address: initial?.personal?.address || "",
    phone: initial?.personal?.phone || "",
    emergencyPhone: initial?.personal?.emergencyPhone || "",
    aadhar: initial?.personal?.aadhar || "",
    bloodGroup: initial?.personal?.bloodGroup || "",
    dateOfJoining: initial?.personal?.dateOfJoining ? initial.personal.dateOfJoining.slice(0, 10) : "",
    medicalIssues: initial?.personal?.medicalIssues || "",
  }));

  const [org, setOrg] = useState(() => ({
    role: initial?.org?.role || "",
    department: initial?.org?.department || "",
  }));

  const [assets, setAssets] = useState(() => ({
    laptopSerial: initial?.assets?.laptopSerial || "",
    mobileImei: initial?.assets?.mobileImei || "",
    mobileNumber: initial?.assets?.mobileNumber || "",
    idCardsIssued: Boolean(initial?.assets?.idCardsIssued) || false,
  }));

  const [financial, setFinancial] = useState(() => ({
    bankName: initial?.financial?.bankName || "",
    bankAccountNumber: initial?.financial?.bankAccountNumber || "",
    currentCTC: initial?.financial?.currentCTC ?? "",
    currentTakeHome: initial?.financial?.currentTakeHome ?? "",
    lastRevisedSalaryAt: initial?.financial?.lastRevisedSalaryAt ? initial.financial.lastRevisedSalaryAt.slice(0, 10) : "",
    nextAppraisalOn: initial?.financial?.nextAppraisalOn ? initial.financial.nextAppraisalOn.slice(0, 10) : "",
  }));

  // NEW: biometric + mapping
  const [biometricId, setBiometricId] = useState(initial?.biometricId || "");

  // stable selected user state (decoupled from userOptions)
  const [mappedUserId, setMappedUserId] = useState(initial?.mappedUser?._id || "");
  const [mappedUserLabel, setMappedUserLabel] = useState(
    initial?.mappedUser
      ? `${initial.mappedUser.name}${initial.mappedUser.email ? " — " + initial.mappedUser.email : initial.mappedUser.phone ? " — " + initial.mappedUser.phone : ""}`
      : ""
  );

  // typeahead states
  const [userQuery, setUserQuery] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const dropdownRef = useRef(null);

  // click-outside to close dropdown
  useEffect(() => {
    function onDocClick(e) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setShowUserList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // debounced search, skip if a user is already selected
  useEffect(() => {
    const q = userQuery.trim();
    if (mappedUserId) return; // don’t search while selected
    if (!q) {
      setUserOptions([]);
      setShowUserList(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoadingUsers(true);
        const r = await HRMS.searchUsers(q);
        const rows = r?.data?.rows || [];
        setUserOptions(rows);
        setShowUserList(true);
      } catch {
        setUserOptions([]);
        setShowUserList(false);
      } finally {
        setLoadingUsers(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [userQuery, mappedUserId]);

  const disabled = useMemo(
    () => !personal.employeeId.trim() || !personal.name.trim(),
    [personal.employeeId, personal.name]
  );

  const clearMappedUser = () => {
    setMappedUserId("");
    setMappedUserLabel("");
    setUserQuery("");
    setUserOptions([]);
    setShowUserList(false);
  };

  const save = async () => {
    try {
      const payload = {
        personal: {
          ...personal,
          dob: personal.dob ? new Date(personal.dob) : undefined,
          dateOfJoining: personal.dateOfJoining ? new Date(personal.dateOfJoining) : undefined,
        },
        org,
        assets: {
          ...assets,
          idCardsIssued: Boolean(assets.idCardsIssued),
        },
        financial: {
          ...financial,
          currentCTC: financial.currentCTC !== "" ? Number(financial.currentCTC) : undefined,
          currentTakeHome: financial.currentTakeHome !== "" ? Number(financial.currentTakeHome) : undefined,
          lastRevisedSalaryAt: financial.lastRevisedSalaryAt ? new Date(financial.lastRevisedSalaryAt) : undefined,
          nextAppraisalOn: financial.nextAppraisalOn ? new Date(financial.nextAppraisalOn) : undefined,
        },
        biometricId: biometricId || "",
        mappedUser: mappedUserId || undefined,
      };

      if (isEdit) {
        await HRMS.updateEmployee(personal.employeeId, payload);
        toast.success("Employee updated");
      } else {
        await HRMS.upsertEmployee(payload);
        toast.success("Employee created");
      }
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{isEdit ? "Edit Employee" : "Create Employee"}</h2>
          <button onClick={onClose} className="text-2xl leading-none">×</button>
        </div>

        {/* Personal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Employee ID</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={personal.employeeId}
              onChange={(e) => setPersonal((p) => ({ ...p, employeeId: e.target.value }))}
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="text-xs">Name</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={personal.name}
              onChange={(e) => setPersonal((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">DOB</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={personal.dob}
              onChange={(e) => setPersonal((p) => ({ ...p, dob: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Date of Joining</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={personal.dateOfJoining}
              onChange={(e) => setPersonal((p) => ({ ...p, dateOfJoining: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs">Address</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={personal.address}
              onChange={(e) => setPersonal((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Phone</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={personal.phone}
              onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Emergency Phone</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={personal.emergencyPhone}
              onChange={(e) => setPersonal((p) => ({ ...p, emergencyPhone: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Aadhar</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={personal.aadhar}
              onChange={(e) => setPersonal((p) => ({ ...p, aadhar: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Blood Group</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={personal.bloodGroup}
              onChange={(e) => setPersonal((p) => ({ ...p, bloodGroup: e.target.value }))}
            />
          </div>
        </div>

        {/* Org */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Role</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={org.role}
              onChange={(e) => setOrg((o) => ({ ...o, role: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Department</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={org.department}
              onChange={(e) => setOrg((o) => ({ ...o, department: e.target.value }))}
            />
          </div>
        </div>

        {/* Assets */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Laptop Serial</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={assets.laptopSerial}
              onChange={(e) => setAssets((a) => ({ ...a, laptopSerial: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Mobile IMEI</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={assets.mobileImei}
              onChange={(e) => setAssets((a) => ({ ...a, mobileImei: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Mobile Number</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={assets.mobileNumber}
              onChange={(e) => setAssets((a) => ({ ...a, mobileNumber: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              id="ids"
              type="checkbox"
              checked={assets.idCardsIssued}
              onChange={(e) => setAssets((a) => ({ ...a, idCardsIssued: e.target.checked }))}
            />
            <label htmlFor="ids" className="text-sm">ID Cards Issued</label>
          </div>
        </div>

        {/* Financial */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Bank Name</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={financial.bankName}
              onChange={(e) => setFinancial((f) => ({ ...f, bankName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Bank Account #</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={financial.bankAccountNumber}
              onChange={(e) => setFinancial((f) => ({ ...f, bankAccountNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Current CTC</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1"
              value={financial.currentCTC}
              onChange={(e) => setFinancial((f) => ({ ...f, currentCTC: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Current Take Home</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1"
              value={financial.currentTakeHome}
              onChange={(e) => setFinancial((f) => ({ ...f, currentTakeHome: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Last Revised</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={financial.lastRevisedSalaryAt}
              onChange={(e) => setFinancial((f) => ({ ...f, lastRevisedSalaryAt: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs">Next Appraisal</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={financial.nextAppraisalOn}
              onChange={(e) => setFinancial((f) => ({ ...f, nextAppraisalOn: e.target.value }))}
            />
          </div>
        </div>

        {/* NEW: Biometric + User Mapping */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Biometric ID (eSSL)</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={biometricId}
              onChange={(e) => setBiometricId(e.target.value)}
              placeholder="e.g., 10027"
            />
          </div>

          <div ref={dropdownRef}>
            <label className="text-xs">Map to App User</label>
            <div className="relative">
              <input
                className="w-full border rounded px-2 py-1 pr-16"
                value={mappedUserId ? mappedUserLabel : userQuery}
                placeholder="Type name, email, or phone"
                onChange={(e) => {
                  // typing starts a new search and clears selection
                  if (mappedUserId) {
                    setMappedUserId("");
                    setMappedUserLabel("");
                  }
                  setUserQuery(e.target.value);
                }}
                onFocus={() => {
                  if (!mappedUserId && userOptions.length > 0) setShowUserList(true);
                }}
              />
              {mappedUserId ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 px-2 py-0.5 border rounded"
                  onClick={clearMappedUser}
                  title="Clear selection"
                >
                  Clear
                </button>
              ) : (
                loadingUsers && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    searching…
                  </div>
                )
              )}

              {showUserList && !mappedUserId && userOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
                  {userOptions.map((u) => {
                    const label = `${u.name}${u.email ? " — " + u.email : u.phone ? " — " + u.phone : ""}`;
                    return (
                      <button
                        key={u._id}
                        type="button"
                        className="w-full text-left px-2 py-1 hover:bg-gray-50"
                        onClick={() => {
                          setMappedUserId(u._id);
                          setMappedUserLabel(label);
                          setUserQuery("");
                          setUserOptions([]);
                          setShowUserList(false);
                        }}
                      >
                        <div className="text-sm">{u.name}</div>
                        <div className="text-xs text-gray-500">
                          {u.email || "-"} | {u.phone || "-"} {u.role ? `| ${u.role}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
          <button
            onClick={save}
            disabled={disabled}
            className={`px-4 py-2 text-white rounded ${disabled ? "bg-blue-400" : "bg-blue-600"}`}
          >
            {isEdit ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
