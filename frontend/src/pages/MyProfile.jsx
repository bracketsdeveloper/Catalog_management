import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

/* If you already have these clients, you can replace with your wrappers. */
const API = process.env.REACT_APP_BACKEND_URL;
function authHeaders() {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
}
const MeAPI = {
  getProfile: () => axios.get(`${API}/api/me/profile`, authHeaders()),
  updateProfile: (payload) => axios.put(`${API}/api/me/profile`, payload, authHeaders()),
};
const HRMS = {
  listRestrictedHolidays: () => axios.get(`${API}/api/hrms/holidays/restricted`, authHeaders()),
  myRestrictedHolidayRequests: () => axios.get(`${API}/api/hrms/self/rh`, authHeaders()),
  applyRestrictedHoliday: (holidayId, note = "") =>
    axios.post(`${API}/api/hrms/self/rh`, { holidayId, note }, authHeaders()),
  cancelRestrictedHolidayRequest: (id) =>
    axios.patch(`${API}/api/hrms/self/rh/${id}/cancel`, {}, authHeaders()),

  myLeaves: () => axios.get(`${API}/api/hrms/self/leaves`, authHeaders()),
  applyLeaveSelf: ({ startDate, endDate, purpose }) =>
    axios.post(`${API}/api/hrms/self/leaves`, { startDate, endDate, purpose }, authHeaders()),
  cancelLeave: (id) => axios.patch(`${API}/api/hrms/self/leaves/${id}/cancel`, {}, authHeaders()),
};

function iso(d) { return d ? String(d).slice(0, 10) : ""; }
function daysBetween(a, b) {
  const A = new Date(a), B = new Date(b);
  if (isNaN(A) || isNaN(B)) return 0;
  return Math.max(1, Math.ceil((B - A) / (1000 * 60 * 60 * 24)) + 1);
}

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  // USER
  const [uForm, setUForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
  });

  // EMPLOYEE
  const [ePersonal, setEPersonal] = useState({
    employeeId: "",
    name: "",
    dob: "",
    address: "",
    phone: "",
    emergencyPhone: "",
    aadhar: "",
    bloodGroup: "",
    dateOfJoining: "",
    medicalIssues: "",
  });
  const [eOrg, setEOrg] = useState({ role: "", department: "" });
  const [eAssets, setEAssets] = useState({
    laptopSerial: "",
    mousepad: false,
    mouse: false,
    mobileImei: "",
    mobileNumber: "",
    mobileCharger: false,
    neckband: false,
    bottle: false,
    diary: false,
    pen: false,
    laptopBag: false,
    rainCoverIssued: false,
    idCardsIssued: false,
    additionalProducts: [],
  });
  const [eFinancial, setEFinancial] = useState({
    bankName: "",
    bankAccountNumber: "",
    currentCTC: "",
    currentTakeHome: "",
    lastRevisedSalaryAt: "",
    nextAppraisalOn: "",
  });
  const [biometricId, setBiometricId] = useState("");

  // Modals: Restricted Holidays
  const [openRHoliday, setOpenRHoliday] = useState(false);
  const [restrictedHolidays, setRestrictedHolidays] = useState([]);
  const [myRHReqs, setMyRHReqs] = useState([]);
  const [selectedHolidayId, setSelectedHolidayId] = useState("");
  const [rhNote, setRhNote] = useState("");

  // Modals: Leaves
  const [openLeave, setOpenLeave] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [myLeaves, setMyLeaves] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await MeAPI.getProfile();
        const u = r.data?.user || null;
        const e = r.data?.employee || null;

        setUser(u);
        setEmployee(e);

        setUForm({
          name: u?.name || "",
          email: u?.email || "",
          phone: u?.phone || "",
          address: u?.address || "",
          dateOfBirth: u?.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : "",
        });

        setEPersonal({
          employeeId: e?.personal?.employeeId || "",
          name: e?.personal?.name || u?.name || "",
          dob: e?.personal?.dob ? String(e.personal.dob).slice(0, 10) : "",
          address: e?.personal?.address || "",
          phone: e?.personal?.phone || "",
          emergencyPhone: e?.personal?.emergencyPhone || "",
          aadhar: e?.personal?.aadhar || "",
          bloodGroup: e?.personal?.bloodGroup || "",
          dateOfJoining: e?.personal?.dateOfJoining ? String(e.personal.dateOfJoining).slice(0, 10) : "",
          medicalIssues: e?.personal?.medicalIssues || "",
        });

        setEOrg({ role: e?.org?.role || "", department: e?.org?.department || "" });

        setEAssets({
          laptopSerial: e?.assets?.laptopSerial || "",
          mousepad: !!e?.assets?.mousepad,
          mouse: !!e?.assets?.mouse,
          mobileImei: e?.assets?.mobileImei || "",
          mobileNumber: e?.assets?.mobileNumber || "",
          mobileCharger: !!e?.assets?.mobileCharger,
          neckband: !!e?.assets?.neckband,
          bottle: !!e?.assets?.bottle,
          diary: !!e?.assets?.diary,
          pen: !!e?.assets?.pen,
          laptopBag: !!e?.assets?.laptopBag,
          rainCoverIssued: !!e?.assets?.rainCoverIssued,
          idCardsIssued: !!e?.assets?.idCardsIssued,
          additionalProducts: Array.isArray(e?.assets?.additionalProducts) ? e.assets.additionalProducts : [],
        });

        setEFinancial({
          bankName: e?.financial?.bankName || "",
          bankAccountNumber: e?.financial?.bankAccountNumber || "",
          currentCTC: e?.financial?.currentCTC ?? "",
          currentTakeHome: e?.financial?.currentTakeHome ?? "",
          lastRevisedSalaryAt: e?.financial?.lastRevisedSalaryAt ? String(e.financial.lastRevisedSalaryAt).slice(0, 10) : "",
          nextAppraisalOn: e?.financial?.nextAppraisalOn ? String(e.financial.nextAppraisalOn).slice(0, 10) : "",
        });

        setBiometricId(e?.biometricId || "");
      } catch (e) {
        toast.error(e?.response?.data?.message || e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const disabled = useMemo(() => !uForm?.name?.trim(), [uForm?.name]);

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        user: {
          // email stays locked (server ignores it anyway)
          name: uForm.name,
          phone: uForm.phone,
          address: uForm.address,
          dateOfBirth: uForm.dateOfBirth || undefined,
        },
        employee: {
          createIfMissing: !employee,
          personal: {
            ...ePersonal,
            dob: ePersonal.dob || undefined,
            dateOfJoining: ePersonal.dateOfJoining || undefined,
          },
          org: eOrg,
          assets: eAssets,
          financial: {
            ...eFinancial,
            currentCTC: eFinancial.currentCTC !== "" ? Number(eFinancial.currentCTC) : undefined,
            currentTakeHome: eFinancial.currentTakeHome !== "" ? Number(eFinancial.currentTakeHome) : undefined,
            lastRevisedSalaryAt: eFinancial.lastRevisedSalaryAt || undefined,
            nextAppraisalOn: eFinancial.nextAppraisalOn || undefined,
          },
          biometricId,
        },
      };

      const r = await MeAPI.updateProfile(payload);
      setUser(r.data?.user || null);
      setEmployee(r.data?.employee || null);
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Restricted Holidays modal logic ---------- */
  const openRestrictedHolidays = async () => {
    try {
      const [hol, reqs] = await Promise.all([
        HRMS.listRestrictedHolidays(),
        HRMS.myRestrictedHolidayRequests(),
      ]);
      setRestrictedHolidays(hol.data.rows || []);
      setMyRHReqs(reqs.data.rows || []);
      setSelectedHolidayId("");
      setRhNote("");
      setOpenRHoliday(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load restricted holidays");
    }
  };
  const activeRHCount = useMemo(() => {
    const active = new Set(["applied","pending","approved"]);
    return (myRHReqs || []).filter(x => active.has(x.status)).length;
  }, [myRHReqs]);

  const submitRestrictedHoliday = async () => {
    if (!selectedHolidayId) return toast.warn("Pick a holiday");
    try {
      await HRMS.applyRestrictedHoliday(selectedHolidayId, rhNote);
      const reqs = await HRMS.myRestrictedHolidayRequests();
      setMyRHReqs(reqs.data.rows || []);
      setSelectedHolidayId("");
      setRhNote("");
      toast.success("Applied");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to apply");
    }
  };
  const cancelRH = async (id) => {
    try {
      await HRMS.cancelRestrictedHolidayRequest(id);
      const reqs = await HRMS.myRestrictedHolidayRequests();
      setMyRHReqs(reqs.data.rows || []);
      toast.success("Cancelled");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel");
    }
  };

  /* ---------- Leaves modal logic ---------- */
  const openLeaves = async () => {
    try {
      const r = await HRMS.myLeaves();
      setMyLeaves(r.data.rows || []);
      setFromDate("");
      setToDate("");
      setReason("");
      setOpenLeave(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load leaves");
    }
  };
  const submitLeave = async () => {
    if (!fromDate || !toDate) return toast.warn("Select from and to date");
    try {
      await HRMS.applyLeaveSelf({ startDate: fromDate, endDate: toDate, purpose: reason });
      const r = await HRMS.myLeaves();
      setMyLeaves(r.data.rows || []);
      setFromDate("");
      setToDate("");
      setReason("");
      toast.success("Leave submitted");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit");
    }
  };
  const cancelLeave = async (id) => {
    try {
      await HRMS.cancelLeave(id);
      const r = await HRMS.myLeaves();
      setMyLeaves(r.data.rows || []);
      toast.success("Leave cancelled");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel");
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">My Profile</h1>

      {/* USER */}
      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Name</label>
            <input className="w-full border rounded px-2 py-1"
              value={uForm.name}
              onChange={(e) => setUForm({ ...uForm, name: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Email (read-only)</label>
            <input className="w-full border rounded px-2 py-1 bg-gray-100"
              value={uForm.email}
              disabled/>
          </div>
          <div>
            <label className="text-xs">Phone</label>
            <input className="w-full border rounded px-2 py-1"
              value={uForm.phone}
              onChange={(e) => setUForm({ ...uForm, phone: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Date of Birth</label>
            <input type="date" className="w-full border rounded px-2 py-1"
              value={uForm.dateOfBirth}
              onChange={(e) => setUForm({ ...uForm, dateOfBirth: e.target.value })}/>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs">Address</label>
            <input className="w-full border rounded px-2 py-1"
              value={uForm.address}
              onChange={(e) => setUForm({ ...uForm, address: e.target.value })}/>
          </div>
        </div>
      </section>

      {/* EMPLOYEE: PERSONAL */}
      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Employee — Personal</h2>
        {!employee && <div className="mb-3 text-xs text-gray-600">No employee record linked yet. Saving will create one for you.</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Employee ID</label>
            <input className="w-full border rounded px-2 py-1"
              value={ePersonal.employeeId}
              onChange={(e) => setEPersonal({ ...ePersonal, employeeId: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Name</label>
            <input className="w-full border rounded px-2 py-1"
              value={ePersonal.name}
              onChange={(e) => setEPersonal({ ...ePersonal, name: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">DOB</label>
            <input type="date" className="w-full border rounded px-2 py-1"
              value={ePersonal.dob}
              onChange={(e) => setEPersonal({ ...ePersonal, dob: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Date of Joining</label>
            <input type="date" className="w-full border rounded px-2 py-1"
              value={ePersonal.dateOfJoining}
              onChange={(e) => setEPersonal({ ...ePersonal, dateOfJoining: e.target.value })}/>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs">Address</label>
            <input className="w-full border rounded px-2 py-1"
              value={ePersonal.address}
              onChange={(e) => setEPersonal({ ...ePersonal, address: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Phone</label>
            <input className="w-full border rounded px-2 py-1"
              value={ePersonal.phone}
              onChange={(e) => setEPersonal({ ...ePersonal, phone: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Emergency Phone</label>
            <input className="w-full border rounded px-2 py-1"
              value={ePersonal.emergencyPhone}
              onChange={(e) => setEPersonal({ ...ePersonal, emergencyPhone: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Aadhar</label>
            <input className="w-full border rounded px-2 py-1"
              value={ePersonal.aadhar}
              onChange={(e) => setEPersonal({ ...ePersonal, aadhar: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Blood Group</label>
            <input className="w-full border rounded px-2 py-1"
              value={ePersonal.bloodGroup}
              onChange={(e) => setEPersonal({ ...ePersonal, bloodGroup: e.target.value })}/>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs">Medical Issues</label>
            <textarea className="w-full border rounded px-2 py-1"
              value={ePersonal.medicalIssues}
              onChange={(e) => setEPersonal({ ...ePersonal, medicalIssues: e.target.value })}/>
          </div>
        </div>
      </section>

      {/* EMPLOYEE: ORG */}
      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Employee — Organization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Role</label>
            <input className="w-full border rounded px-2 py-1"
              value={eOrg.role}
              onChange={(e) => setEOrg({ ...eOrg, role: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Department</label>
            <input className="w-full border rounded px-2 py-1"
              value={eOrg.department}
              onChange={(e) => setEOrg({ ...eOrg, department: e.target.value })}/>
          </div>
        </div>
      </section>

      {/* EMPLOYEE: ASSETS */}
      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Employee — Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Laptop Serial</label>
            <input className="w-full border rounded px-2 py-1"
              value={eAssets.laptopSerial}
              onChange={(e) => setEAssets({ ...eAssets, laptopSerial: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Mobile IMEI</label>
            <input className="w-full border rounded px-2 py-1"
              value={eAssets.mobileImei}
              onChange={(e) => setEAssets({ ...eAssets, mobileImei: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Mobile Number</label>
            <input className="w-full border rounded px-2 py-1"
              value={eAssets.mobileNumber}
              onChange={(e) => setEAssets({ ...eAssets, mobileNumber: e.target.value })}/>
          </div>

          {[
            ["mousepad","Mousepad"],["mouse","Mouse"],["mobileCharger","Mobile Charger"],
            ["neckband","Neckband"],["bottle","Bottle"],["diary","Diary"],["pen","Pen"],
            ["laptopBag","Laptop Bag"],["rainCoverIssued","Rain Cover Issued"],["idCardsIssued","ID Cards Issued"]
          ].map(([key,label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!eAssets[key]}
                onChange={(e) => setEAssets({ ...eAssets, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* EMPLOYEE: FINANCIAL */}
      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Employee — Financial</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Bank Name</label>
            <input className="w-full border rounded px-2 py-1"
              value={eFinancial.bankName}
              onChange={(e) => setEFinancial({ ...eFinancial, bankName: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Bank Account #</label>
            <input className="w-full border rounded px-2 py-1"
              value={eFinancial.bankAccountNumber}
              onChange={(e) => setEFinancial({ ...eFinancial, bankAccountNumber: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Current CTC</label>
            <input type="number" className="w-full border rounded px-2 py-1"
              value={eFinancial.currentCTC}
              onChange={(e) => setEFinancial({ ...eFinancial, currentCTC: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Current Take Home</label>
            <input type="number" className="w-full border rounded px-2 py-1"
              value={eFinancial.currentTakeHome}
              onChange={(e) => setEFinancial({ ...eFinancial, currentTakeHome: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Last Revised</label>
            <input type="date" className="w-full border rounded px-2 py-1"
              value={eFinancial.lastRevisedSalaryAt}
              onChange={(e) => setEFinancial({ ...eFinancial, lastRevisedSalaryAt: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs">Next Appraisal</label>
            <input type="date" className="w-full border rounded px-2 py-1"
              value={eFinancial.nextAppraisalOn}
              onChange={(e) => setEFinancial({ ...eFinancial, nextAppraisalOn: e.target.value })}/>
          </div>
        </div>
      </section>

      {/* EMPLOYEE: OTHER */}
      <section className="border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Employee — Other</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Biometric ID (eSSL)</label>
            <input className="w-full border rounded px-2 py-1"
              value={biometricId}
              onChange={(e) => setBiometricId(e.target.value)}
              placeholder="e.g., 10027"/>
          </div>
          <div>
            <label className="text-xs">Mapped App User</label>
            <input className="w-full border rounded px-2 py-1 bg-gray-100"
              value={user?.name ? `${user.name} (${user.email})` : ""}
              disabled/>
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={save} disabled={disabled || saving}
          className={`px-4 py-2 text-white rounded ${disabled || saving ? "bg-blue-400" : "bg-blue-600"}`}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
        <button onClick={openRestrictedHolidays} className="px-4 py-2 bg-indigo-600 text-white rounded">
          Apply for Restricted Holidays
        </button>
        <button onClick={openLeaves} className="px-4 py-2 bg-emerald-600 text-white rounded">
          Apply for Leaves
        </button>
      </div>

      {/* RESTRICTED HOLIDAYS MODAL */}
      {openRHoliday && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Restricted Holidays</h3>
              <button onClick={()=>setOpenRHoliday(false)} className="text-2xl leading-none">×</button>
            </div>

            <div className="mb-3 text-sm">Used this year: <b>{activeRHCount}</b> / 2</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs">Pick a holiday</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={selectedHolidayId}
                  onChange={(e)=>setSelectedHolidayId(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {restrictedHolidays.map(h => (
                    <option key={h._id} value={h._id}>
                      {(h.name || h.title)} — {iso(h.date)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs">Note (optional)</label>
                <input className="w-full border rounded px-2 py-1" value={rhNote} onChange={e=>setRhNote(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-6">
              <button className="px-3 py-2 border rounded" onClick={()=>setOpenRHoliday(false)}>Close</button>
              <button
                className={`px-3 py-2 rounded text-white ${activeRHCount >= 2 || !selectedHolidayId ? "bg-gray-400" : "bg-indigo-600"}`}
                disabled={activeRHCount >= 2 || !selectedHolidayId}
                onClick={submitRestrictedHoliday}
              >
                Apply
              </button>
            </div>

            <div>
              <h4 className="font-medium mb-2">My Requests</h4>
              <div className="overflow-x-auto border rounded">
                <table className="table-auto w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border px-2 py-1 text-left">Holiday</th>
                      <th className="border px-2 py-1 text-left">Date</th>
                      <th className="border px-2 py-1 text-left">Status</th>
                      <th className="border px-2 py-1 text-left">Note</th>
                      <th className="border px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRHReqs.map(r => (
                      <tr key={r._id}>
                        <td className="border px-2 py-1">{r.holidayName || r.holidayId?.name || "-"}</td>
                        <td className="border px-2 py-1">{iso(r.holidayDate)}</td>
                        <td className="border px-2 py-1">{r.status}</td>
                        <td className="border px-2 py-1">{r.note || "-"}</td>
                        <td className="border px-2 py-1">
                          {["applied","pending"].includes(r.status) ? (
                            <button className="text-red-600 text-xs underline" onClick={()=>cancelRH(r._id)}>Cancel</button>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    {!myRHReqs.length && (
                      <tr><td className="border px-2 py-3 text-center text-gray-500" colSpan={5}>No requests</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* LEAVES MODAL */}
      {openLeave && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Apply for Leave</h3>
              <button onClick={()=>setOpenLeave(false)} className="text-2xl leading-none">×</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs">From</label>
                <input type="date" className="w-full border rounded px-2 py-1" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs">To</label>
                <input type="date" className="w-full border rounded px-2 py-1" value={toDate} onChange={e=>setToDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs">Days</label>
                <input className="w-full border rounded px-2 py-1 bg-gray-100" value={fromDate && toDate ? daysBetween(fromDate,toDate) : ""} disabled />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs">Reason</label>
                <input className="w-full border rounded px-2 py-1" value={reason} onChange={e=>setReason(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-6">
              <button className="px-3 py-2 border rounded" onClick={()=>setOpenLeave(false)}>Close</button>
              <button
                className={`px-3 py-2 rounded text-white ${(!fromDate || !toDate) ? "bg-gray-400" : "bg-emerald-600"}`}
                disabled={!fromDate || !toDate}
                onClick={submitLeave}
              >
                Submit
              </button>
            </div>

            <div>
              <h4 className="font-medium mb-2">My Leave Requests</h4>
              <div className="overflow-x-auto border rounded">
                <table className="table-auto w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border px-2 py-1 text-left">From</th>
                      <th className="border px-2 py-1 text-left">To</th>
                      <th className="border px-2 py-1 text-left">Days</th>
                      <th className="border px-2 py-1 text-left">Status</th>
                      <th className="border px-2 py-1 text-left">Reason</th>
                      <th className="border px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(L => (
                      <tr key={L._id}>
                        <td className="border px-2 py-1">{iso(L.startDate)}</td>
                        <td className="border px-2 py-1">{iso(L.endDate)}</td>
                        <td className="border px-2 py-1">{L.days || daysBetween(iso(L.startDate), iso(L.endDate))}</td>
                        <td className="border px-2 py-1">{L.status || "-"}</td>
                        <td className="border px-2 py-1">{L.purpose || "-"}</td>
                        <td className="border px-2 py-1">
                          {["applied","pending"].includes(L.status) ? (
                            <button className="text-red-600 text-xs underline" onClick={()=>cancelLeave(L._id)}>Cancel</button>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    {!myLeaves.length && (
                      <tr><td className="border px-2 py-3 text-center text-gray-500" colSpan={6}>No leave requests</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
