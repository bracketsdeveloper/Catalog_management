import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import EmployeeCalendarModal from "../components/attendance/EmployeeCalendarModal";

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

  // Calendar API - Fixed endpoint
  getEmployeeCalendar: (employeeId, params = {}) => {
    console.log('Getting calendar for employee:', employeeId); // Debug log
    return axios.get(`${API}/api/hrms/attendance/${employeeId}`, { 
      ...authHeaders(), 
      params 
    });
  },
};

function iso(d) { return d ? String(d).slice(0, 10) : ""; }

function daysBetween(a, b) {
  const A = new Date(a), B = new Date(b);
  if (isNaN(A) || isNaN(B)) return 0;
  return Math.max(1, Math.ceil((B - A) / (1000 * 60 * 60 * 24)) + 1);
}

function formatIndianDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Helper function to convert decimal hours to hh:mm format
const formatHoursToHHMM = (decimalHours) => {
  if (!decimalHours && decimalHours !== 0) return '00:00';

  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  // Ensure two-digit format
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}`;
};

// Helper function to get status color
function getStatusColor(status) {
  if (!status) return 'bg-gray-100 text-gray-800';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('present')) return 'bg-green-100 text-green-800';
  if (statusLower.includes('absent')) return 'bg-red-100 text-red-800';
  if (statusLower.includes('leave')) return 'bg-blue-100 text-blue-800';
  if (statusLower.includes('wfh')) return 'bg-purple-100 text-purple-800';
  if (statusLower.includes('weeklyoff')) return 'bg-yellow-100 text-yellow-800';
  if (statusLower.includes('holiday')) return 'bg-indigo-100 text-indigo-800';
  if (statusLower.includes('½present')) return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-800';
}

// Helper function to get day name
const getDayName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
};

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Attendance Data
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

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

  // Calendar Modal state
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (employee?.personal?.employeeId && activeTab === 'attendance') {
      fetchAttendanceData();
    }
  }, [employee, activeTab]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const r = await MeAPI.getProfile();
      const u = r.data?.user || null;
      const e = r.data?.employee || null;

      console.log('Loaded user:', u);
      console.log('Loaded employee:', e);

      setUser(u);
      setEmployee(e);

      if (e?.personal?.employeeId) {
        console.log('Employee ID found:', e.personal.employeeId);
      }

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
      console.error('Error loading profile:', e);
      toast.error(e?.response?.data?.message || e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!employee?.personal?.employeeId) {
      console.log('No employee ID available for attendance data');
      return;
    }

    setAttendanceLoading(true);
    try {
      console.log('Fetching attendance data for employee:', employee.personal.employeeId);
      
      // Get current month and year for the API call
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // Use the same API as the calendar modal
      const response = await HRMS.getEmployeeCalendar(employee.personal.employeeId, {
        month: currentMonth,
        year: currentYear
      });

      console.log('Attendance data response:', response.data);

      if (response.data && Array.isArray(response.data.rows)) {
        setAttendanceData(response.data.rows);
        
        // Calculate summary from real data
        const summary = calculateAttendanceSummary(response.data.rows);
        setAttendanceSummary(summary);
      } else {
        // Handle different response structure if needed
        const calendarData = response.data.calendar || response.data || [];
        if (Array.isArray(calendarData)) {
          setAttendanceData(calendarData);
          const summary = calculateAttendanceSummary(calendarData);
          setAttendanceSummary(summary);
        } else {
          console.error('Unexpected response structure:', response.data);
          toast.error('Unable to parse attendance data');
        }
      }
      
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error(error?.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const calculateAttendanceSummary = (calendarData) => {
    if (!Array.isArray(calendarData) || calendarData.length === 0) {
      return {
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        wfhDays: 0,
        holidayDays: 0,
        weeklyOffDays: 0,
        halfPresentDays: 0,
        totalHours: 0,
        totalOT: 0,
        attendanceRate: 0,
        formattedTotalHours: '00:00',
        formattedTotalOT: '00:00',
        expectedHours: 0,
        lopHours: 0,
        formattedLOPHours: '00:00',
        presentDaysWithHours: 0,
        expectedHoursPerDay: 9,
        workingDays: 0
      };
    }

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let wfhDays = 0;
    let holidayDays = 0;
    let weeklyOffDays = 0;
    let halfPresentDays = 0;
    let totalHours = 0;
    let totalOT = 0;

    // Calculate present days with hours for LOP calculation
    let presentDaysWithHours = 0;

    calendarData.forEach(day => {
      // Check for holiday or weekend first
      if (day.holidayInfo) {
        holidayDays++;
      } else if (day.isWeekend) {
        weeklyOffDays++;
      } else if (day.leaveInfo) {
        leaveDays++;
      } else if (day.attendance) {
        const status = day.attendance.status?.toLowerCase() || '';
        const workHours = day.attendance.workHours || 0;
        
        if (status.includes('present') && !status.includes('½') && !status.includes('half')) {
          presentDays++;
          presentDaysWithHours++;
          totalHours += workHours;
        } else if (status.includes('absent')) {
          absentDays++;
        } else if (status.includes('wfh')) {
          wfhDays++;
          presentDaysWithHours++;
          totalHours += workHours;
        } else if (status.includes('½present') || status.includes('half')) {
          halfPresentDays++;
          presentDays += 0.5;
          presentDaysWithHours += 0.5;
          totalHours += workHours;
        } else if (status.includes('present')) {
          // Catch-all for any present status
          presentDays++;
          presentDaysWithHours++;
          totalHours += workHours;
        }
        
        // Calculate OT hours
        if (day.attendance.otHours) {
          totalOT += day.attendance.otHours;
        }
      } else {
        // No attendance marked for a working day
        if (!day.isWeekend && !day.holidayInfo && !day.leaveInfo) {
          absentDays++;
        }
      }
    });

    // Calculate LOP (Loss of Pay) = Expected hours - Actual hours
    // Expected hours = Present days × 9 hours (or use expectedHoursPerDay from day data if available)
    const expectedHoursPerDay = 9; // Default value
    const expectedHours = presentDaysWithHours * expectedHoursPerDay;
    const lopHours = Math.max(0, expectedHours - totalHours);

    // Calculate working days (excluding weekends and holidays)
    let workingDays = 0;
    calendarData.forEach(day => {
      if (!day.isWeekend && !day.holidayInfo) {
        workingDays++;
      }
    });

    // Calculate attendance rate
    const attendanceRate = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(2) : 0;

    return {
      presentDays: Math.round(presentDays),
      absentDays,
      leaveDays,
      wfhDays,
      holidayDays,
      weeklyOffDays,
      halfPresentDays,
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalOT: parseFloat(totalOT.toFixed(2)),
      attendanceRate: parseFloat(attendanceRate),
      formattedTotalHours: formatHoursToHHMM(totalHours),
      formattedTotalOT: formatHoursToHHMM(totalOT),
      // LOP calculations
      expectedHours: parseFloat(expectedHours.toFixed(2)),
      lopHours: parseFloat(lopHours.toFixed(2)),
      formattedLOPHours: formatHoursToHHMM(lopHours),
      presentDaysWithHours: parseFloat(presentDaysWithHours.toFixed(2)),
      expectedHoursPerDay,
      workingDays
    };
  };

  const disabled = useMemo(() => !uForm?.name?.trim(), [uForm?.name]);

  const save = async () => {
    try {
      setSaving(true);
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
          assets: undefined,
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
      toast.success("Profile saved successfully!");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

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
    const active = new Set(["applied", "pending", "approved"]);
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
      toast.success("Restricted holiday application submitted!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to apply");
    }
  };

  const cancelRH = async (id) => {
    try {
      await HRMS.cancelRestrictedHolidayRequest(id);
      const reqs = await HRMS.myRestrictedHolidayRequests();
      setMyRHReqs(reqs.data.rows || []);
      toast.success("Request cancelled");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel");
    }
  };

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
      toast.success("Leave application submitted!");
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

  const openCalendarModal = () => {
    if (!employee?.personal?.employeeId) {
      toast.error("Employee information not available. Please save your profile first.");
      return;
    }
    
    console.log('Opening calendar modal for employee:', employee.personal.employeeId);
    setShowCalendarModal(true);
  };

  const handleCalendarMonthChange = (newMonth, newYear) => {
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  const refreshAttendanceData = () => {
    fetchAttendanceData();
  };

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
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
                {employee?.personal?.employeeId && (
                  <p className="text-sm text-blue-600 font-medium">
                    Employee ID: {employee.personal.employeeId}
                  </p>
                )}
                {!employee?.personal?.employeeId && (
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
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${!employee?.personal?.employeeId
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700'
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
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                👤 Profile
              </button>
              <button
                onClick={() => {
                  setActiveTab('attendance');
                  refreshAttendanceData();
                }}
                className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'attendance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                📊 Attendance
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'profile' ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Department</p>
                    <p className="text-2xl font-bold mt-1">{eOrg.department || 'Not Set'}</p>
                  </div>
                  <div className="text-3xl">🏢</div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Role</p>
                    <p className="text-2xl font-bold mt-1">{eOrg.role || 'Not Set'}</p>
                  </div>
                  <div className="text-3xl">💼</div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Date of Joining</p>
                    <p className="text-2xl font-bold mt-1">
                      {ePersonal.dateOfJoining ? formatIndianDate(ePersonal.dateOfJoining) : 'Not Set'}
                    </p>
                  </div>
                  <div className="text-3xl">🎯</div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Edit Profile Information</h3>
                <p className="text-sm text-gray-600">Update your personal and professional details</p>
              </div>

              <div className="p-6">
                {/* Personal Information */}
                <div className="mb-8">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-blue-600">👤</span> Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: "Full Name", value: ePersonal.name, setter: (val) => setEPersonal({ ...ePersonal, name: val }), key: 'name' },
                      { label: "Employee ID", value: ePersonal.employeeId, key: 'employeeId', readOnly: true },
                      { label: "Date of Birth", value: ePersonal.dob, setter: (val) => setEPersonal({ ...ePersonal, dob: val }), key: 'dob', type: 'date' },
                      { label: "Date of Joining", value: ePersonal.dateOfJoining, key: 'dateOfJoining', readOnly: true },
                      { label: "Phone", value: ePersonal.phone, setter: (val) => setEPersonal({ ...ePersonal, phone: val }), key: 'phone' },
                      { label: "Emergency Phone", value: ePersonal.emergencyPhone, setter: (val) => setEPersonal({ ...ePersonal, emergencyPhone: val }), key: 'emergencyPhone' },
                      { label: "Aadhar Number", value: ePersonal.aadhar, setter: (val) => setEPersonal({ ...ePersonal, aadhar: val }), key: 'aadhar' },
                      { label: "Blood Group", value: ePersonal.bloodGroup, setter: (val) => setEPersonal({ ...ePersonal, bloodGroup: val }), key: 'bloodGroup' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                        </label>
                        <input
                          type={field.type || 'text'}
                          className={`w-full px-4 py-3 border ${field.readOnly ? 'bg-gray-50 text-gray-600' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                          value={field.value || ''}
                          onChange={field.setter ? (e) => field.setter(e.target.value) : undefined}
                          readOnly={field.readOnly}
                        />
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows="2"
                        value={ePersonal.address || ''}
                        onChange={(e) => setEPersonal({ ...ePersonal, address: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medical Issues
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows="2"
                        value={ePersonal.medicalIssues || ''}
                        onChange={(e) => setEPersonal({ ...ePersonal, medicalIssues: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Organization Information */}
                <div className="mb-8">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-blue-600">🏢</span> Organization Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <input
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={eOrg.role || ''}
                        onChange={(e) => setEOrg({ ...eOrg, role: e.target.value })}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={eOrg.department || ''}
                        onChange={(e) => setEOrg({ ...eOrg, department: e.target.value })}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Assets Section - Read Only */}
                <div className="mb-8">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-blue-600">💻</span> Company Assets (View Only)
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {[
                        { label: "Laptop Serial", value: eAssets.laptopSerial, key: 'laptopSerial' },
                        { label: "Mobile IMEI", value: eAssets.mobileImei, key: 'mobileImei' },
                        { label: "Mobile Number", value: eAssets.mobileNumber, key: 'mobileNumber' },
                      ].map((field) => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-500 mb-2">
                            {field.label}
                          </label>
                          <div className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900">
                            {field.value || 'Not Assigned'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-4">Issued Equipment</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                          { key: 'mousepad', label: 'Mousepad', icon: '🖱️' },
                          { key: 'mouse', label: 'Mouse', icon: '🐭' },
                          { key: 'mobileCharger', label: 'Mobile Charger', icon: '🔌' },
                          { key: 'neckband', label: 'Neckband', icon: '🎧' },
                          { key: 'bottle', label: 'Bottle', icon: '💧' },
                          { key: 'diary', label: 'Diary', icon: '📔' },
                          { key: 'pen', label: 'Pen', icon: '🖊️' },
                          { key: 'laptopBag', label: 'Laptop Bag', icon: '💼' },
                          { key: 'rainCoverIssued', label: 'Rain Cover', icon: '☔' },
                          { key: 'idCardsIssued', label: 'ID Cards', icon: '🪪' },
                        ].map((item) => (
                          <div
                            key={item.key}
                            className={`p-4 border rounded-lg flex flex-col items-center justify-center ${eAssets[item.key] ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200'}`}
                          >
                            <div className="text-2xl mb-2">{item.icon}</div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{item.label}</div>
                              <div className={`text-xs font-medium mt-1 ${eAssets[item.key] ? 'text-green-600' : 'text-gray-500'}`}>
                                {eAssets[item.key] ? 'Issued' : 'Not Issued'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {eAssets.additionalProducts && eAssets.additionalProducts.length > 0 && (
                      <div className="mt-6">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Additional Products</h5>
                        <div className="flex flex-wrap gap-2">
                          {eAssets.additionalProducts.map((product, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 border-t">
                  <button
                    onClick={save}
                    disabled={disabled || saving}
                    className={`px-8 py-3 rounded-lg font-medium transition-all ${disabled || saving
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
                      }`}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </span>
                    ) : (
                      'Save Profile Changes'
                    )}
                  </button>
                  <p className="text-sm text-gray-500 mt-3">
                    Note: Employee ID, Organization Information, and Company Assets are managed by HR and cannot be edited.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ATTENDANCE TAB */
          <div className="space-y-6">
            {!employee?.personal?.employeeId ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-red-800 mb-2">Employee ID Required</h3>
                <p className="text-red-600 mb-4">
                  You don't have an employee ID assigned. Please contact HR to get your employee ID set up.
                </p>
                <p className="text-sm text-red-500">
                  Once you have an employee ID, you'll be able to view your attendance records.
                </p>
              </div>
            ) : (
              <>
                {/* Attendance Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Present Days</p>
                        <p className="text-3xl font-bold mt-2">{attendanceSummary?.presentDays || 0}</p>
                        {attendanceSummary?.halfPresentDays > 0 && (
                          <p className="text-xs opacity-90 mt-1">
                            ({attendanceSummary.halfPresentDays} half days)
                          </p>
                        )}
                      </div>
                      <div className="text-4xl">✅</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Hours</p>
                        <p className="text-3xl font-bold mt-2">{attendanceSummary?.formattedTotalHours || '00:00'}</p>
                        <p className="text-xs opacity-90 mt-1">
                          {attendanceSummary?.totalHours?.toFixed(1) || 0}h total
                        </p>
                      </div>
                      <div className="text-4xl">⏱️</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">OT Hours</p>
                        <p className="text-3xl font-bold mt-2">{attendanceSummary?.formattedTotalOT || '00:00'}</p>
                        <p className="text-xs opacity-90 mt-1">
                          {attendanceSummary?.totalOT?.toFixed(1) || 0}h overtime
                        </p>
                      </div>
                      <div className="text-4xl">⚡</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">LOP Hours</p>
                        <p className="text-3xl font-bold mt-2">
                          {attendanceSummary?.formattedLOPHours || '00:00'}
                        </p>
                        <p className="text-xs opacity-90 mt-1">
                          Expected: {attendanceSummary?.expectedHours?.toFixed(1) || 0}h
                        </p>
                      </div>
                      <div className="text-4xl">⚠️</div>
                    </div>
                  </div>
                </div>

                {/* Working Days Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <span className="text-sm text-blue-700 font-medium">
                        Current Month Summary ({new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()})
                      </span>
                      <div className="text-xs text-blue-600 mt-1">
                        • Working days this month: {attendanceSummary?.workingDays || 0}<br />
                        • Expected hours/day: {attendanceSummary?.expectedHoursPerDay || 9}h<br />
                        • LOP (Loss of Pay) = (Present Days × {attendanceSummary?.expectedHoursPerDay || 9}) - Total Hours<br />
                        • Attendance Rate: {attendanceSummary?.attendanceRate || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* View Calendar Button */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar View</h3>
                      <p className="text-sm text-gray-600">View your detailed attendance calendar with analytics</p>
                    </div>
                    <button
                      onClick={openCalendarModal}
                      className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Open Calendar View
                    </button>
                  </div>

                  {/* Quick Stats */}
                  {attendanceData.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{attendanceData.length}</div>
                          <div className="text-sm text-gray-600">Total Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {attendanceData.filter(r => r.attendance?.status?.toLowerCase().includes('present')).length}
                          </div>
                          <div className="text-sm text-gray-600">Present Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {attendanceData.filter(r => r.leaveInfo).length}
                          </div>
                          <div className="text-sm text-gray-600">Leave Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {attendanceData.filter(r => r.attendance?.status?.toLowerCase().includes('wfh')).length}
                          </div>
                          <div className="text-sm text-gray-600">WFH Days</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Attendance Table */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Recent Attendance</h4>
                    {attendanceLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Loading recent attendance...</p>
                      </div>
                    ) : attendanceData.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No recent attendance records found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Time</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out Time</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendanceData.slice(0, 5).map((day) => (
                              <tr key={day._id || day.date} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {formatIndianDate(day.date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {getDayName(day.date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {day.attendance?.inTime || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {day.attendance?.outTime || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {day.attendance?.workHours ? formatHoursToHHMM(day.attendance.workHours) : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                    day.leaveInfo ? 'Leave' : 
                                    day.holidayInfo ? 'Holiday' :
                                    day.attendance?.status
                                  )}`}>
                                    {day.leaveInfo ? 'Leave' : 
                                     day.holidayInfo ? (day.holidayInfo.type === 'RESTRICTED' ? 'Restricted Holiday' : 'Holiday') :
                                     day.attendance?.status || 'Not Marked'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {attendanceData.length > 5 && (
                          <div className="px-4 py-3 bg-gray-50 text-center border-t">
                            <p className="text-sm text-gray-600">
                              Showing 5 of {attendanceData.length} records
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Employee Calendar Modal */}
        {showCalendarModal && employee?.personal?.employeeId && (
          <EmployeeCalendarModal
            employee={{
              ...employee,
              employeeId: employee.personal.employeeId // Ensure employeeId is passed correctly
            }}
            month={calendarMonth}
            year={calendarYear}
            onClose={() => setShowCalendarModal(false)}
            onMonthChange={handleCalendarMonthChange}
            onDataUpdate={refreshAttendanceData}
            viewOnly={true}
            expectedHoursPerDay={9}
          />
        )}

        {/* Modals (keep existing modals) */}
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

// Modal Components (unchanged)
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
  cancelRH
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Restricted Holidays</h3>
              <p className="text-sm text-gray-600 mt-1">Used this year: <span className="font-bold">{activeRHCount}/2</span></p>
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
                {restrictedHolidays.map(h => (
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
                onChange={e => setRhNote(e.target.value)}
                placeholder="Add any notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mb-8">
            <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`px-6 py-2 rounded-lg text-white ${activeRHCount >= 2 || !selectedHolidayId
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
                  {myRHReqs.map(r => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {r.holidayName || r.holidayId?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatIndianDate(r.holidayDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${r.status === 'approved' ? 'bg-green-100 text-green-800' :
                            r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {r.note || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {["applied", "pending"].includes(r.status) ? (
                          <button
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                            onClick={() => cancelRH(r._id)}
                          >
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
  cancelLeave
}) {
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
                onChange={e => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Days</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                value={leaveDays}
                readOnly
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Leave</label>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Please provide a reason for your leave..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mb-8">
            <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`px-6 py-2 rounded-lg text-white ${!fromDate || !toDate
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
                  {myLeaves.map(L => (
                    <tr key={L._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatIndianDate(L.startDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatIndianDate(L.endDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {L.days || daysBetween(iso(L.startDate), iso(L.endDate))}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${L.status === 'approved' ? 'bg-green-100 text-green-800' :
                            L.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {L.status || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {L.purpose || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {["applied", "pending"].includes(L.status) ? (
                          <button
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                            onClick={() => cancelLeave(L._id)}
                          >
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