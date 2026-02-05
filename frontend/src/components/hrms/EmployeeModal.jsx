import { useEffect, useMemo, useRef, useState } from "react";
import { HRMS } from "../../api/hrmsClient";
import { toast } from "react-toastify";

// Time picker component for 12-hour format
function TimePicker12Hr({ value, onChange, label }) {
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: "09", minute: "00", period: "AM" };
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      return {
        hour: match[1].padStart(2, "0"),
        minute: match[2],
        period: match[3].toUpperCase(),
      };
    }
    return { hour: "09", minute: "00", period: "AM" };
  };

  const { hour, minute, period } = parseTime(value);

  const handleChange = (field, val) => {
    const current = parseTime(value);
    current[field] = val;
    const formatted = `${current.hour.padStart(2, "0")}:${current.minute} ${current.period}`;
    onChange(formatted);
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div>
      <label className="text-xs">{label}</label>
      <div className="flex gap-1">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={hour}
          onChange={(e) => handleChange("hour", e.target.value)}
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="self-center">:</span>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={minute}
          onChange={(e) => handleChange("minute", e.target.value)}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={period}
          onChange={(e) => handleChange("period", e.target.value)}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function buildDefaultMonthlyLeaveAllocation() {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months.map((m) => ({
    month: m,
    earned: 0,
    sick: 0,
    additional: 0,
    special: 0,
  }));
}

function normalizeMonthlyLeaveAllocation(input) {
  const base = buildDefaultMonthlyLeaveAllocation();
  if (!Array.isArray(input) || input.length !== 12) return base;

  // map by month label if possible
  const map = new Map(input.map((x) => [String(x?.month || "").trim(), x]));
  return base.map((row) => {
    const got = map.get(row.month) || {};
    return {
      month: row.month,
      earned: Number.isFinite(+got.earned) ? +got.earned : 0,
      sick: Number.isFinite(+got.sick) ? +got.sick : 0,
      additional: Number.isFinite(+got.additional) ? +got.additional : 0,
      special: Number.isFinite(+got.special) ? +got.special : 0,
    };
  });
}

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

    // Asset checkboxes
    mousepad: Boolean(initial?.assets?.mousepad) || false,
    mouse: Boolean(initial?.assets?.mouse) || false,
    mobileCharger: Boolean(initial?.assets?.mobileCharger) || false,
    neckband: Boolean(initial?.assets?.neckband) || false,
    bottle: Boolean(initial?.assets?.bottle) || false,
    diary: Boolean(initial?.assets?.diary) || false,
    pen: Boolean(initial?.assets?.pen) || false,
    laptopBag: Boolean(initial?.assets?.laptopBag) || false,
    rainCoverIssued: Boolean(initial?.assets?.rainCoverIssued) || false,
    idCardsIssued: Boolean(initial?.assets?.idCardsIssued) || false,

    // Additional products array
    additionalProducts: Array.isArray(initial?.assets?.additionalProducts)
      ? initial.assets.additionalProducts
      : [],
  }));

  const [financial, setFinancial] = useState(() => ({
    bankName: initial?.financial?.bankName || "",
    bankAccountNumber: initial?.financial?.bankAccountNumber || "",
    currentCTC: initial?.financial?.currentCTC ?? "",
    currentTakeHome: initial?.financial?.currentTakeHome ?? "",
    lastRevisedSalaryAt: initial?.financial?.lastRevisedSalaryAt
      ? initial.financial.lastRevisedSalaryAt.slice(0, 10)
      : "",
    nextAppraisalOn: initial?.financial?.nextAppraisalOn
      ? initial.financial.nextAppraisalOn.slice(0, 10)
      : "",
  }));

  const [schedule, setSchedule] = useState(() => ({
    expectedLoginTime: initial?.schedule?.expectedLoginTime || "",
    expectedLogoutTime: initial?.schedule?.expectedLogoutTime || "",
  }));

  const [biometricId, setBiometricId] = useState(initial?.biometricId || "");

  // Additional products state
  const [newAdditionalProduct, setNewAdditionalProduct] = useState("");
  const [additionalProducts, setAdditionalProducts] = useState(
    Array.isArray(initial?.assets?.additionalProducts) ? initial.assets.additionalProducts : []
  );

  // ✅ NEW: monthly leave allocation (per employee)
  const [monthlyLeaveAllocation, setMonthlyLeaveAllocation] = useState(() =>
    normalizeMonthlyLeaveAllocation(initial?.leaveMonthlyAllocation)
  );

  const [mappedUserId, setMappedUserId] = useState(initial?.mappedUser?._id || "");
  const [mappedUserLabel, setMappedUserLabel] = useState(
    initial?.mappedUser
      ? `${initial.mappedUser.name}${
          initial.mappedUser.email
            ? " — " + initial.mappedUser.email
            : initial.mappedUser.phone
              ? " — " + initial.mappedUser.phone
              : ""
        }`
      : ""
  );

  const [userQuery, setUserQuery] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setShowUserList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = userQuery.trim();
    if (mappedUserId) return;
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

  // Add additional product
  const addAdditionalProduct = () => {
    if (!newAdditionalProduct.trim()) return;
    const updatedProducts = [...additionalProducts, newAdditionalProduct.trim()];
    setAdditionalProducts(updatedProducts);
    setAssets((prev) => ({ ...prev, additionalProducts: updatedProducts }));
    setNewAdditionalProduct("");
  };

  // Remove additional product
  const removeAdditionalProduct = (index) => {
    const updatedProducts = additionalProducts.filter((_, i) => i !== index);
    setAdditionalProducts(updatedProducts);
    setAssets((prev) => ({ ...prev, additionalProducts: updatedProducts }));
  };

  // ✅ NEW: update monthly leaves (by month index + field)
  const updateMonthlyLeave = (idx, field, value) => {
    setMonthlyLeaveAllocation((prev) => {
      const next = [...prev];
      const v = value === "" ? "" : value;
      next[idx] = {
        ...next[idx],
        [field]: v,
      };
      return next;
    });
  };

  const sanitizeMonthlyLeaveAllocation = () => {
    // ensure numbers, no negatives, fixed to 2 decimals if needed
    return monthlyLeaveAllocation.map((m) => ({
      month: m.month,
      earned: Math.max(0, Number.isFinite(+m.earned) ? +(+m.earned).toFixed(2) : 0),
      sick: Math.max(0, Number.isFinite(+m.sick) ? +(+m.sick).toFixed(2) : 0),
      additional: Math.max(0, Number.isFinite(+m.additional) ? +(+m.additional).toFixed(2) : 0),
      special: Math.max(0, Number.isFinite(+m.special) ? +(+m.special).toFixed(2) : 0),
    }));
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
          additionalProducts: additionalProducts,
        },
        financial: {
          ...financial,
          currentCTC: financial.currentCTC !== "" ? Number(financial.currentCTC) : undefined,
          currentTakeHome: financial.currentTakeHome !== "" ? Number(financial.currentTakeHome) : undefined,
          lastRevisedSalaryAt: financial.lastRevisedSalaryAt ? new Date(financial.lastRevisedSalaryAt) : undefined,
          nextAppraisalOn: financial.nextAppraisalOn ? new Date(financial.nextAppraisalOn) : undefined,
        },
        schedule,
        biometricId: biometricId || "",
        mappedUser: mappedUserId || undefined,

        // ✅ NEW: send monthly leave allocation to backend
        leaveMonthlyAllocation: sanitizeMonthlyLeaveAllocation(),
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

  // Asset checkbox configuration
  const assetCheckboxes = [
    { key: "mousepad", label: "Mousepad", icon: "🖱️" },
    { key: "mouse", label: "Mouse", icon: "🐭" },
    { key: "mobileCharger", label: "Mobile Charger", icon: "🔌" },
    { key: "neckband", label: "Neckband", icon: "🎧" },
    { key: "bottle", label: "Bottle", icon: "💧" },
    { key: "diary", label: "Diary", icon: "📔" },
    { key: "pen", label: "Pen", icon: "🖊️" },
    { key: "laptopBag", label: "Laptop Bag", icon: "💼" },
    { key: "rainCoverIssued", label: "Rain Cover", icon: "☔" },
    { key: "idCardsIssued", label: "ID Cards", icon: "🪪" },
  ];

  const monthlyTotals = useMemo(() => {
    const sum = { earned: 0, sick: 0, additional: 0, special: 0 };
    for (const m of monthlyLeaveAllocation) {
      sum.earned += Number.isFinite(+m.earned) ? +m.earned : 0;
      sum.sick += Number.isFinite(+m.sick) ? +m.sick : 0;
      sum.additional += Number.isFinite(+m.additional) ? +m.additional : 0;
      sum.special += Number.isFinite(+m.special) ? +m.special : 0;
    }
    return {
      earned: +sum.earned.toFixed(2),
      sick: +sum.sick.toFixed(2),
      additional: +sum.additional.toFixed(2),
      special: +sum.special.toFixed(2),
    };
  }, [monthlyLeaveAllocation]);

  const applySameForAllMonths = (type, value) => {
    const v = value === "" ? 0 : Math.max(0, Number(value));
    setMonthlyLeaveAllocation((prev) =>
      prev.map((m) => ({
        ...m,
        [type]: Number.isFinite(v) ? v : 0,
      }))
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{isEdit ? "Edit Employee" : "Create Employee"}</h2>
          <button onClick={onClose} className="text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Personal Information */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-700 border-b pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs">Employee ID *</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={personal.employeeId}
                onChange={(e) => setPersonal((p) => ({ ...p, employeeId: e.target.value }))}
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="text-xs">Name *</label>
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
            <div className="md:col-span-2">
              <label className="text-xs">Medical Issues</label>
              <textarea
                className="w-full border rounded px-2 py-1"
                value={personal.medicalIssues}
                onChange={(e) => setPersonal((p) => ({ ...p, medicalIssues: e.target.value }))}
                rows="2"
              />
            </div>
          </div>
        </div>

        {/* Organization Information */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-700 border-b pb-2">Organization Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Work Schedule */}
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Work Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TimePicker12Hr
              label="Expected Login Time"
              value={schedule.expectedLoginTime}
              onChange={(val) => setSchedule((s) => ({ ...s, expectedLoginTime: val }))}
            />
            <TimePicker12Hr
              label="Expected Logout Time"
              value={schedule.expectedLogoutTime}
              onChange={(val) => setSchedule((s) => ({ ...s, expectedLogoutTime: val }))}
            />
          </div>
          {schedule.expectedLoginTime && schedule.expectedLogoutTime && (
            <div className="mt-2 text-xs text-gray-500">
              Schedule: {schedule.expectedLoginTime} — {schedule.expectedLogoutTime}
            </div>
          )}
        </div>

        {/* ✅ NEW: Monthly Leave Allocation */}
        <div className="mb-6 p-4 border rounded bg-white">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700">Monthly Leave Allocation</h3>
            <div className="text-xs text-gray-500">
              Yearly totals — Earned: {monthlyTotals.earned}, Sick: {monthlyTotals.sick}, Additional:{" "}
              {monthlyTotals.additional}, Special: {monthlyTotals.special}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="border rounded p-2 bg-gray-50">
              <div className="text-xs font-semibold text-gray-600 mb-1">Quick Fill (All Months)</div>
              <div className="flex items-center gap-2">
                <label className="text-xs w-16">Earned</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  defaultValue=""
                  placeholder="e.g. 1.25"
                  onBlur={(e) => applySameForAllMonths("earned", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs w-16">Sick</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  defaultValue=""
                  placeholder="e.g. 1"
                  onBlur={(e) => applySameForAllMonths("sick", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs w-16">Additional</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  defaultValue=""
                  placeholder="e.g. 0"
                  onBlur={(e) => applySameForAllMonths("additional", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs w-16">Special</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  defaultValue=""
                  placeholder="e.g. 0"
                  onBlur={(e) => applySameForAllMonths("special", e.target.value)}
                />
              </div>
              <div className="text-[11px] text-gray-500 mt-2">
                Tip: type a value and click outside the input to apply to all months.
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 border-b">Month</th>
                      <th className="text-left px-3 py-2 border-b">Earned</th>
                      <th className="text-left px-3 py-2 border-b">Sick</th>
                      <th className="text-left px-3 py-2 border-b">Additional</th>
                      <th className="text-left px-3 py-2 border-b">Special</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyLeaveAllocation.map((m, idx) => (
                      <tr key={m.month} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-2 border-b font-medium">{m.month}</td>
                        <td className="px-3 py-2 border-b">
                          <input
                            type="number"
                            className="w-24 border rounded px-2 py-1"
                            value={m.earned}
                            onChange={(e) => updateMonthlyLeave(idx, "earned", e.target.value)}
                            min="0"
                            step="0.25"
                          />
                        </td>
                        <td className="px-3 py-2 border-b">
                          <input
                            type="number"
                            className="w-24 border rounded px-2 py-1"
                            value={m.sick}
                            onChange={(e) => updateMonthlyLeave(idx, "sick", e.target.value)}
                            min="0"
                            step="0.25"
                          />
                        </td>
                        <td className="px-3 py-2 border-b">
                          <input
                            type="number"
                            className="w-24 border rounded px-2 py-1"
                            value={m.additional}
                            onChange={(e) => updateMonthlyLeave(idx, "additional", e.target.value)}
                            min="0"
                            step="0.25"
                          />
                        </td>
                        <td className="px-3 py-2 border-b">
                          <input
                            type="number"
                            className="w-24 border rounded px-2 py-1"
                            value={m.special}
                            onChange={(e) => updateMonthlyLeave(idx, "special", e.target.value)}
                            min="0"
                            step="0.25"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                This is per-employee leave credit setup (Jan–Dec). Your backend should store this on the employee record.
              </div>
            </div>
          </div>
        </div>

        {/* Asset Assignment */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-700 border-b pb-2">Asset Assignment</h3>

          {/* Serial Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs">Laptop Serial</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={assets.laptopSerial}
                onChange={(e) => setAssets((a) => ({ ...a, laptopSerial: e.target.value }))}
                placeholder="e.g., ABC123XYZ"
              />
            </div>
            <div>
              <label className="text-xs">Mobile IMEI</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={assets.mobileImei}
                onChange={(e) => setAssets((a) => ({ ...a, mobileImei: e.target.value }))}
                placeholder="15-digit IMEI"
              />
            </div>
            <div>
              <label className="text-xs">Mobile Number</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={assets.mobileNumber}
                onChange={(e) => setAssets((a) => ({ ...a, mobileNumber: e.target.value }))}
                placeholder="Company mobile number"
              />
            </div>
          </div>

          {/* Asset Checkboxes */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold mb-3 text-gray-600">Equipment Issued</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {assetCheckboxes.map((item) => (
                <div
                  key={item.key}
                  className={`p-3 border rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                    assets[item.key]
                      ? "bg-green-50 border-green-300 ring-1 ring-green-200"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => setAssets((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div
                      className={`text-xs font-medium mt-1 ${
                        assets[item.key] ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {assets[item.key] ? "✓ Issued" : "× Not Issued"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Products */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-2 text-gray-600">Additional Products</h4>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={newAdditionalProduct}
                onChange={(e) => setNewAdditionalProduct(e.target.value)}
                placeholder="e.g., Monitor, Keyboard, Headset, etc."
                onKeyDown={(e) => e.key === "Enter" && addAdditionalProduct()}
              />
              <button
                type="button"
                onClick={addAdditionalProduct}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>

            {additionalProducts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {additionalProducts.map((product, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-2"
                  >
                    {product}
                    <button
                      type="button"
                      onClick={() => removeAdditionalProduct(index)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Financial Information */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-700 border-b pb-2">Financial Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="text-xs">Current CTC (₹)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={financial.currentCTC}
                onChange={(e) => setFinancial((f) => ({ ...f, currentCTC: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs">Current Take Home (₹)</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={financial.currentTakeHome}
                onChange={(e) => setFinancial((f) => ({ ...f, currentTakeHome: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs">Last Revised Salary Date</label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={financial.lastRevisedSalaryAt}
                onChange={(e) => setFinancial((f) => ({ ...f, lastRevisedSalaryAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs">Next Appraisal Date</label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={financial.nextAppraisalOn}
                onChange={(e) => setFinancial((f) => ({ ...f, nextAppraisalOn: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* System & Integration */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-700 border-b pb-2">System & Integration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <button onClick={onClose} className="border px-4 py-2 rounded hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={disabled}
            className={`px-4 py-2 text-white rounded ${
              disabled ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isEdit ? "Save Changes" : "Create Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}
