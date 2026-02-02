import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import EmployeeCalendarModal from "../components/attendance/EmployeeCalendarModal";
import { HRMS } from "../api/hrmsClient";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function iso(d) {
  return d ? String(d).slice(0, 10) : "";
}

function daysBetween(a, b) {
  const A = new Date(a),
    B = new Date(b);
  if (isNaN(A) || isNaN(B)) return 0;
  return Math.max(1, Math.ceil((B - A) / (1000 * 60 * 60 * 24)) + 1);
}

function formatIndianDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const formatHoursToHHMM = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) return "00:00";
  const sign = decimalHours < 0 ? "-" : "";
  const abs = Math.abs(decimalHours);
  const hours = Math.floor(abs);
  const minutes = Math.round((abs - hours) * 60);
  const carry = minutes === 60 ? 1 : 0;
  const hh = (hours + carry).toString().padStart(2, "0");
  const mm = (carry ? 0 : minutes).toString().padStart(2, "0");
  return `${sign}${hh}:${mm}`;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  const [activeTab, setActiveTab] = useState("profile");

  // Profile forms (keep what you need; minimal is fine)
  const [uForm, setUForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
  });

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

  // Attendance summary table (single row)
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [mySummaryRow, setMySummaryRow] = useState(null);

  // Calendar modal
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Restricted holidays modal
  const [openRHoliday, setOpenRHoliday] = useState(false);
  const [restrictedHolidays, setRestrictedHolidays] = useState([]);
  const [myRHReqs, setMyRHReqs] = useState([]);
  const [selectedHolidayId, setSelectedHolidayId] = useState("");
  const [rhNote, setRhNote] = useState("");

  // Leave modal
  const [openLeave, setOpenLeave] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [myLeaves, setMyLeaves] = useState([]);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When attendance tab is opened (or month/year changes), fetch summary like admin page
  useEffect(() => {
    if (activeTab === "attendance" && employee?.personal?.employeeId) {
      fetchMyAttendanceSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, employee?.personal?.employeeId, calendarMonth, calendarYear]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Data loaders (HRMS client)
  // ─────────────────────────────────────────────────────────────────────────────
  const loadProfile = async () => {
    try {
      setLoading(true);

      // ✅ Use HRMS client
      // Your hrmsClient should have profile endpoint; commonly it's HRMS.getMyProfile / HRMS.getProfile
      // We'll try getProfile first, then fallback to getMyProfile.
      let r;
      if (typeof HRMS.getProfile === "function") {
        r = await HRMS.getProfile();
      } else if (typeof HRMS.getMyProfile === "function") {
        r = await HRMS.getMyProfile();
      } else if (typeof HRMS.meProfile === "function") {
        r = await HRMS.meProfile();
      } else {
        throw new Error("HRMS client missing profile method (getProfile/getMyProfile/meProfile)");
      }

      const u = r?.data?.user || null;
      const e = r?.data?.employee || null;

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

      setEOrg({
        role: e?.org?.role || "",
        department: e?.org?.department || "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);

      // ✅ Use HRMS client
      // Common naming: updateProfile / updateMyProfile
      const payload = {
        user: {
          name: uForm.name,
          phone: uForm.phone,
          address: uForm.address,
          dateOfBirth: uForm.dateOfBirth || undefined,
        },
        employee: {
          createIfMissing: !employee,
          personal: {
            ...ePersonal,
            employeeId: undefined,
            dob: ePersonal.dob || undefined,
            dateOfJoining: ePersonal.dateOfJoining || undefined,
          },
          org: eOrg,
        },
      };

      let r;
      if (typeof HRMS.updateProfile === "function") {
        r = await HRMS.updateProfile(payload);
      } else if (typeof HRMS.updateMyProfile === "function") {
        r = await HRMS.updateMyProfile(payload);
      } else if (typeof HRMS.meUpdateProfile === "function") {
        r = await HRMS.meUpdateProfile(payload);
      } else {
        throw new Error("HRMS client missing update profile method (updateProfile/updateMyProfile/meUpdateProfile)");
      }

      setUser(r?.data?.user || null);
      setEmployee(r?.data?.employee || null);

      toast.success("Profile saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ✅ This is the key change you requested:
  // Fetch from the SAME route as AttendanceSummaryPage and show only the logged-in user row
  const fetchMyAttendanceSummary = async () => {
    const empId = employee?.personal?.employeeId;
    if (!empId) return;

    setAttendanceLoading(true);
    try {
      const params = { month: calendarMonth, year: calendarYear };

      // Must exist in hrmsClient (it existed in AttendanceSummaryPage)
      const res = await HRMS.getAttendanceSummaryAll(params);

      const rows = res?.data?.results || res?.data?.rows || [];
      const mine =
        rows.find((r) => String(r.employeeId || r.employee_id || r.empId) === String(empId)) ||
        rows.find((r) => String(r?.personal?.employeeId) === String(empId));

      if (!mine) {
        setMySummaryRow(null);
        return;
      }

      const s = { ...(mine.summary || {}) };

      // Ensure formatted fields match AttendanceSummaryPage usage
      s.formattedTotalHours = s.formattedTotalHours || formatHoursToHHMM(s.totalHours || 0);
      s.formattedTotalOT = s.formattedTotalOT || formatHoursToHHMM(s.totalOT || 0);
      s.formattedExpectedHours = s.formattedExpectedHours || formatHoursToHHMM(s.expectedHours || 0);

      setMySummaryRow({
        employeeId: mine.employeeId || empId,
        name: mine.name || employee?.personal?.name || user?.name || "Me",
        department: mine.department || employee?.org?.department || "-",
        role: mine.role || employee?.org?.role || "-",
        summary: s,
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load attendance summary");
      setMySummaryRow(null);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const openCalendarModal = () => {
    if (!employee?.personal?.employeeId) {
      toast.error("Employee information not available. Please save your profile first.");
      return;
    }
    setShowCalendarModal(true);
  };

  const handleCalendarMonthChange = (newMonth, newYear) => {
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  const refreshAttendance = () => {
    fetchMyAttendanceSummary();
  };

  // Restricted Holidays
  const openRestrictedHolidays = async () => {
    try {
      const [hol, reqs] = await Promise.all([
        HRMS.listRestrictedHolidays(),
        HRMS.myRestrictedHolidayRequests(),
      ]);
      setRestrictedHolidays(hol?.data?.rows || hol?.data || []);
      setMyRHReqs(reqs?.data?.rows || reqs?.data || []);
      setSelectedHolidayId("");
      setRhNote("");
      setOpenRHoliday(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load restricted holidays");
    }
  };

  const activeRHCount = useMemo(() => {
    const active = new Set(["applied", "pending", "approved"]);
    return (myRHReqs || []).filter((x) => active.has(x.status)).length;
  }, [myRHReqs]);

  const submitRestrictedHoliday = async () => {
    if (!selectedHolidayId) return toast.warn("Pick a holiday");
    try {
      await HRMS.applyRestrictedHoliday(selectedHolidayId, rhNote);
      const reqs = await HRMS.myRestrictedHolidayRequests();
      setMyRHReqs(reqs?.data?.rows || reqs?.data || []);
      setSelectedHolidayId("");
      setRhNote("");
      toast.success("Restricted holiday application submitted!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to apply");
    }
  };

  const cancelRH = async (id) => {
    try {
      await HRMS.cancelRestrictedHolidayRequest(id);
      const reqs = await HRMS.myRestrictedHolidayRequests();
      setMyRHReqs(reqs?.data?.rows || reqs?.data || []);
      toast.success("Request cancelled");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel");
    }
  };

  // Leaves
  const openLeaves = async () => {
    try {
      const r = await HRMS.myLeaves();
      setMyLeaves(r?.data?.rows || r?.data || []);
      setFromDate("");
      setToDate("");
      setReason("");
      setOpenLeave(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load leaves");
    }
  };

  const submitLeave = async () => {
    if (!fromDate || !toDate) return toast.warn("Select from and to date");
    try {
      await HRMS.applyLeaveSelf({ startDate: fromDate, endDate: toDate, purpose: reason });
      const r = await HRMS.myLeaves();
      setMyLeaves(r?.data?.rows || r?.data || []);
      setFromDate("");
      setToDate("");
      setReason("");
      toast.success("Leave application submitted!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit");
    }
  };

  const cancelLeave = async (id) => {
    try {
      await HRMS.cancelLeave(id);
      const r = await HRMS.myLeaves();
      setMyLeaves(r?.data?.rows || r?.data || []);
      toast.success("Leave cancelled");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel");
    }
  };

  const disabled = useMemo(() => !uForm?.name?.trim(), [uForm?.name]);

  // ─────────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
          <p className="text-gray-600">Manage your profile, attendance, and leave requests</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>

                {employee?.personal?.employeeId ? (
                  <p className="text-sm text-blue-600 font-medium">
                    Employee ID: {employee.personal.employeeId}
                  </p>
                ) : (
                  <p className="text-sm text-red-600 font-medium">
                    No employee ID assigned. Please contact HR.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={openRestrictedHolidays}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-2"
              >
                <span>🎯</span> Restricted Holidays
              </button>

              <button
                onClick={openLeaves}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center gap-2"
              >
                <span>📅</span> Apply Leave
              </button>

              <button
                onClick={openCalendarModal}
                disabled={!employee?.personal?.employeeId}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  !employee?.personal?.employeeId
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700"
                }`}
              >
                <span>📊</span> View Attendance
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("profile")}
                className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "profile"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                👤 Profile
              </button>

              <button
                onClick={() => setActiveTab("attendance")}
                className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "attendance"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                📊 Attendance
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === "profile" ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Edit Profile Information</h3>
              <p className="text-sm text-gray-600">Update your personal details</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={uForm.name}
                    onChange={(e) => setUForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    readOnly
                    className="w-full px-4 py-3 border bg-gray-50 text-gray-600 border-gray-300 rounded-lg"
                    value={uForm.email}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={uForm.phone}
                    onChange={(e) => setUForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={uForm.dateOfBirth}
                    onChange={(e) => setUForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={uForm.address}
                    onChange={(e) => setUForm((p) => ({ ...p, address: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pt-6 border-t mt-6">
                <button
                  onClick={save}
                  disabled={disabled || saving}
                  className={`px-8 py-3 rounded-lg font-medium transition-all ${
                    disabled || saving
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl"
                  }`}
                >
                  {saving ? "Saving..." : "Save Profile Changes"}
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  Note: Employee info (Role/Department) is managed by HR.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ✅ ATTENDANCE TAB (table layout same as AttendanceSummaryPage, but only self row)
          <div className="space-y-6">
            {!employee?.personal?.employeeId ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-red-800 mb-2">Employee ID Required</h3>
                <p className="text-red-600">
                  You don't have an employee ID assigned. Please contact HR to get your employee ID set up.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">My Attendance Summary</h3>
                    <p className="text-sm text-gray-600">
                      {monthNames[calendarMonth - 1]} {calendarYear}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={calendarMonth}
                      onChange={(e) => setCalendarMonth(parseInt(e.target.value))}
                      className="border rounded-md px-3 py-2"
                    >
                      {monthNames.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <select
                      value={calendarYear}
                      onChange={(e) => setCalendarYear(parseInt(e.target.value))}
                      className="border rounded-md px-3 py-2"
                    >
                      {[2023, 2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={openCalendarModal}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
                    >
                      📅 View Calendar
                    </button>
                  </div>
                </div>

                {attendanceLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading your attendance summary...</p>
                  </div>
                ) : !mySummaryRow ? (
                  <div className="text-center py-10 bg-gray-50 rounded-lg border">
                    <p className="text-gray-600">No attendance summary found for this month.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    {/* ✅ SAME TABLE COLUMNS as AttendanceSummaryPage */}
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Present Days
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            OT Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{mySummaryRow.name}</div>
                              <div className="text-sm text-gray-500">{mySummaryRow.employeeId}</div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-900">{mySummaryRow.department || "-"}</td>

                          <td className="px-6 py-4 text-sm text-gray-900">{mySummaryRow.role || "-"}</td>

                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {mySummaryRow.summary?.presentDays ?? 0}
                            </div>
                            <div className="text-xs text-gray-500">{mySummaryRow.summary?.workingDaysLabel || ""}</div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {(mySummaryRow.summary?.formattedTotalHours || "00:00")}h
                            </div>
                            <div className="text-xs text-gray-500">
                              {(mySummaryRow.summary?.formattedExpectedHours || "00:00")}h expected
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-900">
                            {(mySummaryRow.summary?.formattedTotalOT || "00:00")}h
                          </td>

                          <td className="px-6 py-4 text-sm font-medium">
                            <button onClick={openCalendarModal} className="text-blue-600 hover:text-blue-900">
                              View Calendar
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end">
                  <button
                    onClick={refreshAttendance}
                    className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar Modal */}
        {showCalendarModal && employee?.personal?.employeeId && (
          <EmployeeCalendarModal
            employee={{
              ...employee,
              employeeId: employee.personal.employeeId,
            }}
            month={calendarMonth}
            year={calendarYear}
            onClose={() => setShowCalendarModal(false)}
            onMonthChange={handleCalendarMonthChange}
            onDataUpdate={refreshAttendance}
            viewOnly={true}
            expectedHoursPerDay={9}
          />
        )}

        {/* Restricted Holidays Modal */}
        {openRHoliday && (
          <RestrictedHolidayModal
            open={openRHoliday}
            onClose={() => setOpenRHoliday(false)}
            restrictedHolidays={restrictedHolidays}
            myRHReqs={myRHReqs}
            selectedHolidayId={selectedHolidayId}
            setSelectedHolidayId={setSelectedHolidayId}
            rhNote={rhNote}
            setRhNote={setRhNote}
            activeRHCount={activeRHCount}
            submitRestrictedHoliday={submitRestrictedHoliday}
            cancelRH={cancelRH}
          />
        )}

        {/* Leaves Modal */}
        {openLeave && (
          <LeaveModal
            open={openLeave}
            onClose={() => setOpenLeave(false)}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            reason={reason}
            setReason={setReason}
            myLeaves={myLeaves}
            submitLeave={submitLeave}
            cancelLeave={cancelLeave}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modals (same as your file — unchanged behavior)
// ─────────────────────────────────────────────────────────────────────────────
function RestrictedHolidayModal({
  open,
  onClose,
  restrictedHolidays,
  myRHReqs,
  selectedHolidayId,
  setSelectedHolidayId,
  rhNote,
  setRhNote,
  activeRHCount,
  submitRestrictedHoliday,
  cancelRH,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Restricted Holidays</h3>
              <p className="text-sm text-gray-600 mt-1">
                Used this year: <span className="font-bold">{activeRHCount}/2</span>
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Holiday</label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedHolidayId}
                onChange={(e) => setSelectedHolidayId(e.target.value)}
              >
                <option value="">— Choose a holiday —</option>
                {restrictedHolidays.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name || h.title} — {formatIndianDate(h.date)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={rhNote}
                onChange={(e) => setRhNote(e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mb-8">
            <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`px-6 py-2 rounded-lg text-white ${
                activeRHCount >= 2 || !selectedHolidayId
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              }`}
              disabled={activeRHCount >= 2 || !selectedHolidayId}
              onClick={submitRestrictedHoliday}
            >
              Apply for Holiday
            </button>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">My Holiday Requests</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holiday</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myRHReqs.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {r.holidayName || r.holidayId?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatIndianDate(r.holidayDate)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            r.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : r.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{r.note || "-"}</td>
                      <td className="px-6 py-4">
                        {["applied", "pending"].includes(r.status) ? (
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium" onClick={() => cancelRH(r._id)}>
                            Cancel
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {myRHReqs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No holiday requests yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveModal({
  open,
  onClose,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  reason,
  setReason,
  myLeaves,
  submitLeave,
  cancelLeave,
}) {
  if (!open) return null;
  const leaveDays = fromDate && toDate ? daysBetween(fromDate, toDate) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Apply for Leave</h3>
              <p className="text-sm text-gray-600 mt-1">Submit your leave application</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Days</label>
              <input className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50" value={leaveDays} readOnly />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Leave</label>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for your leave..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mb-8">
            <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`px-6 py-2 rounded-lg text-white ${
                !fromDate || !toDate
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              }`}
              disabled={!fromDate || !toDate}
              onClick={submitLeave}
            >
              Submit Leave Application
            </button>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">My Leave History</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myLeaves.map((L) => (
                    <tr key={L._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatIndianDate(L.startDate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatIndianDate(L.endDate)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{L.days || daysBetween(iso(L.startDate), iso(L.endDate))}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            L.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : L.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {L.status || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{L.purpose || "-"}</td>
                      <td className="px-6 py-4">
                        {["applied", "pending"].includes(L.status) ? (
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium" onClick={() => cancelLeave(L._id)}>
                            Cancel
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {myLeaves.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No leave applications yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
