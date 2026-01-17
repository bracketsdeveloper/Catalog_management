import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

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

  // Attendance APIs
  getMyAttendance: (params = {}) =>
    axios.get(`${API}/api/attendance/employee`, { ...authHeaders(), params }),

  getMyAttendanceSummary: (params = {}) =>
    axios.get(`${API}/api/attendance/summary/all`, { ...authHeaders(), params }),

  getHolidays: (params = {}) =>
    axios.get(`${API}/api/hrms/holidays`, { ...authHeaders(), params }),
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

// Helper function to convert hh:mm to decimal hours
const formatHHMMToDecimal = (timeString) => {
  if (!timeString || !timeString.includes(':')) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + (minutes / 60);
};

// Helper function to format time display
const formatTimeDisplay = (time) => {
  if (!time) return '-';
  if (typeof time === 'string' && time.includes(':')) return time;
  if (typeof time === 'number') return formatHoursToHHMM(time);
  return String(time);
};

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
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceRange, setAttendanceRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [holidays, setHolidays] = useState([]);
  const [currentMonthWorkingDays, setCurrentMonthWorkingDays] = useState(0);
  const [tillTodayWorkingDays, setTillTodayWorkingDays] = useState(0);

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
    loadProfile();
  }, []);

  useEffect(() => {
    if (employee?.personal?.employeeId && activeTab === 'attendance') {
      fetchHolidays();
    }
  }, [employee, activeTab]);

  useEffect(() => {
    if (employee?.personal?.employeeId && activeTab === 'attendance') {
      fetchMyAttendance();
    }
  }, [employee, activeTab, attendanceRange]);

  const loadProfile = async () => {
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
  };

  // Fetch holidays for the current month
  const fetchHolidays = async () => {
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const response = await HRMS.getHolidays({ month, year });
      setHolidays(response.data || []);

      // Calculate working days
      calculateWorkingDays(month, year, response.data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setHolidays([]);
    }
  };

  // Helper function to calculate working days
  const calculateWorkingDays = (month, year, holidayData) => {
    const today = new Date();
    const currentMonth = month - 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    let totalWorkingDays = 0;
    let tillTodayWorkingDays = 0;
    const todayDate = today.getDate();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

    // Get holidays for this month (excluding restricted holidays)
    const monthHolidays = holidayData.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getMonth() === currentMonth &&
        holidayDate.getFullYear() === year &&
        holiday.type !== 'RESTRICTED'; // Restricted holidays are still working days
    });

    // Create a Set of holiday dates for quick lookup
    const holidayDates = new Set(
      monthHolidays.map(holiday => {
        const date = new Date(holiday.date);
        return date.getDate();
      })
    );

    // Count all working days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, currentMonth, day);
      const dayOfWeek = currentDate.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Skip non-restricted holidays
      if (holidayDates.has(day)) {
        continue;
      }

      totalWorkingDays++;

      // Count working days till today for current month
      if (isCurrentMonth && day <= todayDate) {
        tillTodayWorkingDays++;
      }
    }

    setCurrentMonthWorkingDays(totalWorkingDays);
    setTillTodayWorkingDays(tillTodayWorkingDays);

    return { totalWorkingDays, tillTodayWorkingDays, isCurrentMonth };
  };

  const fetchMyAttendance = async () => {
    if (!employee?.personal?.employeeId) {
      console.log('No employee ID available');
      return;
    }

    setAttendanceLoading(true);
    try {
      console.log('Fetching attendance for employee:', employee.personal.employeeId);
      console.log('Date range:', attendanceRange);

      // Try the main attendance API endpoint
      let attendanceResponse;
      try {
        attendanceResponse = await HRMS.getMyAttendance({
          employeeId: employee.personal.employeeId,
          startDate: attendanceRange.startDate,
          endDate: attendanceRange.endDate
        });
        console.log('Attendance API response:', attendanceResponse.data);
      } catch (apiError) {
        console.error('Main API failed:', apiError);

        // Try alternative endpoint format
        try {
          attendanceResponse = await axios.get(
            `${API}/api/attendance/employee/${employee.personal.employeeId}`,
            {
              ...authHeaders(),
              params: {
                startDate: attendanceRange.startDate,
                endDate: attendanceRange.endDate
              }
            }
          );
          console.log('Alternative API response:', attendanceResponse.data);
        } catch (altError) {
          console.error('Alternative API failed:', altError);
          throw new Error('Could not fetch attendance data');
        }
      }

      // Extract attendance data from response (handle different response formats)
      let attendanceRecords = [];

      if (attendanceResponse.data?.attendance) {
        attendanceRecords = attendanceResponse.data.attendance;
      } else if (attendanceResponse.data?.records) {
        attendanceRecords = attendanceResponse.data.records;
      } else if (attendanceResponse.data?.data) {
        attendanceRecords = attendanceResponse.data.data;
      } else if (Array.isArray(attendanceResponse.data)) {
        attendanceRecords = attendanceResponse.data;
      } else if (attendanceResponse.data?.results) {
        attendanceRecords = attendanceResponse.data.results;
      }

      console.log(`Found ${attendanceRecords.length} attendance records`);

      // Process attendance data
      const processedData = attendanceRecords.map(record => {
        const formattedRecord = { ...record };

        // Format times
        formattedRecord.inTime = formatTimeDisplay(record.inTime);
        formattedRecord.outTime = formatTimeDisplay(record.outTime);
        formattedRecord.hoursWorked = formatTimeDisplay(record.hoursWorked || record.totalHours);

        // Add day name
        formattedRecord.dayName = getDayName(record.date);

        // Ensure status is properly formatted
        if (!formattedRecord.status && record.present) {
          formattedRecord.status = 'Present';
        }

        return formattedRecord;
      });

      // Sort by date descending (most recent first)
      processedData.sort((a, b) => new Date(b.date) - new Date(a.date));

      setAttendanceData(processedData);

      // Calculate summary from the processed data
      if (processedData.length > 0) {
        const summary = calculateAttendanceSummary(processedData);
        setAttendanceSummary(summary);
      } else {
        setAttendanceSummary(null);
      }

    } catch (error) {
      console.error('Error fetching attendance:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to load attendance data. Please try again.');
      setAttendanceData([]);
      setAttendanceSummary(null);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Function to calculate attendance summary from attendance records
  const calculateAttendanceSummary = (attendanceRecords) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Filter records for current month
    const currentMonthRecords = attendanceRecords.filter(record => {
      try {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() + 1 === currentMonth &&
          recordDate.getFullYear() === currentYear;
      } catch {
        return false;
      }
    });

    console.log('Current month records:', currentMonthRecords.length);

    // Calculate present days (including half present)
    const presentDays = currentMonthRecords.filter(record => {
      const status = record.status?.toLowerCase() || '';
      return status.includes('present') || status.includes('½present');
    }).length;

    // Calculate half present days
    const halfPresentDays = currentMonthRecords.filter(record => {
      const status = record.status?.toLowerCase() || '';
      return status.includes('½present');
    }).length;

    // Calculate leaves
    const leaveDays = currentMonthRecords.filter(record => {
      const status = record.status?.toLowerCase() || '';
      return status.includes('leave');
    }).length;

    // Calculate total hours and OT hours
    let totalHours = 0;
    let totalOT = 0;
    let totalLateMinutes = 0;
    let totalEarlyDepartureMinutes = 0;

    currentMonthRecords.forEach(record => {
      if (record.hoursWorked) {
        const hoursDecimal = formatHHMMToDecimal(record.hoursWorked);
        if (!isNaN(hoursDecimal)) {
          totalHours += hoursDecimal;

          // Get employee's expected work hours from schedule (or use default 8 hours)
          // If employeeInfo is available, use their schedule, otherwise default to 8 hours
          const expectedDailyHours = employee?.schedule?.expectedWorkHours || 8;

          // Calculate OT only if hours worked exceeds expected daily hours
          if (hoursDecimal > expectedDailyHours) {
            const otHours = hoursDecimal - expectedDailyHours;
            totalOT += otHours;
          }

          // Track late arrivals if record has lateByMinutes
          if (record.lateByMinutes && !isNaN(record.lateByMinutes)) {
            totalLateMinutes += parseInt(record.lateByMinutes);
          }

          // Track early departures if record has earlyDepartureMinutes
          if (record.earlyDepartureMinutes && !isNaN(record.earlyDepartureMinutes)) {
            totalEarlyDepartureMinutes += parseInt(record.earlyDepartureMinutes);
          }
        }
      }
    });

    // Determine which working days to use
    let workingDaysForCalculation;
    let displayWorkingDays;
    let isTillToday = false;

    const { totalWorkingDays, tillTodayWorkingDays } = calculateWorkingDays(
      currentMonth,
      currentYear,
      holidays
    );

    if (currentMonth === new Date().getMonth() + 1 && currentYear === new Date().getFullYear()) {
      // For current month: use working days up to today
      workingDaysForCalculation = tillTodayWorkingDays;
      displayWorkingDays = tillTodayWorkingDays;
      isTillToday = true;
    } else {
      // For past months: use total working days
      workingDaysForCalculation = totalWorkingDays;
      displayWorkingDays = totalWorkingDays;
      isTillToday = false;
    }

    // Calculate attendance rate
    let attendanceRate = 0;
    if (workingDaysForCalculation > 0) {
      // Count full present as 1, half present as 0.5
      const effectivePresentDays = presentDays - (halfPresentDays * 0.5);
      attendanceRate = parseFloat(((effectivePresentDays / workingDaysForCalculation) * 100).toFixed(2));
    }

    // Count late arrivals (days where lateByMinutes > 0)
    const lateArrivalDays = currentMonthRecords.filter(record =>
      record.lateByMinutes && parseInt(record.lateByMinutes) > 0
    ).length;

    // Count early departures (days where earlyDepartureMinutes > 0)
    const earlyDepartureDays = currentMonthRecords.filter(record =>
      record.earlyDepartureMinutes && parseInt(record.earlyDepartureMinutes) > 0
    ).length;

    // Calculate average late minutes if there are late arrivals
    const averageLateMinutes = lateArrivalDays > 0 ? Math.round(totalLateMinutes / lateArrivalDays) : 0;

    // Calculate average early departure minutes if there are early departures
    const averageEarlyDepartureMinutes = earlyDepartureDays > 0 ? Math.round(totalEarlyDepartureMinutes / earlyDepartureDays) : 0;

    return {
      attendanceRate,
      presentDays,
      halfPresentDays,
      leaveDays,
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalOT: parseFloat(totalOT.toFixed(2)),
      workingDays: workingDaysForCalculation,
      displayWorkingDays,
      isTillToday,
      totalWorkingDaysInMonth: totalWorkingDays,
      lateArrivalDays,
      earlyDepartureDays,
      averageLateMinutes,
      averageEarlyDepartureMinutes,
      totalLateMinutes,
      totalEarlyDepartureMinutes
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
            // Don't send employeeId in update - it should be read-only
            employeeId: undefined,
            dob: ePersonal.dob || undefined,
            dateOfJoining: ePersonal.dateOfJoining || undefined,
          },
          org: eOrg,
          // Don't send assets in update - they should be read-only
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
                onClick={() => setActiveTab('attendance')}
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
            {/* Attendance Summary Cards */}
            {attendanceSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Present Days</p>
                      <p className="text-3xl font-bold mt-2">{attendanceSummary.presentDays || 0}</p>

                      {attendanceSummary.halfPresentDays > 0 && (
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
                      <p className="text-3xl font-bold mt-2">{formatHoursToHHMM(attendanceSummary.totalHours)}</p>
                      <p className="text-xs opacity-90 mt-1">
                        {attendanceSummary.totalHours?.toFixed(1) || 0}h total
                      </p>
                    </div>
                    <div className="text-4xl">⏱️</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">OT Hours</p>
                      <p className="text-3xl font-bold mt-2">{formatHoursToHHMM(attendanceSummary.totalOT)}</p>
                      <p className="text-xs opacity-90 mt-1">
                        {attendanceSummary.totalOT?.toFixed(1) || 0}h overtime
                      </p>
                      {attendanceSummary.lateArrivalDays > 0 && (
                        <p className="text-xs opacity-90 mt-1">
                          {attendanceSummary.lateArrivalDays} late arrival{attendanceSummary.lateArrivalDays > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-4xl">⚡</div>
                  </div>
                </div>
              </div>
            )}

            {/* Working Days Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-sm text-blue-700 font-medium">
                    {attendanceSummary?.isTillToday ? 'Calculated Till Today' : 'Complete Month Data'}
                  </span>
                  <div className="text-xs text-blue-600 mt-1">
                    • Working days exclude weekends and public holidays<br />
                    • Restricted holidays are counted as working days<br />
                    • Total working days this month: {currentMonthWorkingDays}<br />
                    • Working days till today: {tillTodayWorkingDays}<br />
                    • Leave days: {attendanceSummary?.leaveDays || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Date Range Filter */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Attendance Records</h3>
                  <p className="text-sm text-gray-600">View your attendance history</p>
                </div>
                <div className="flex gap-4 mt-4 md:mt-0">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <input
                      type="date"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={attendanceRange.startDate}
                      onChange={(e) => setAttendanceRange({ ...attendanceRange, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input
                      type="date"
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={attendanceRange.endDate}
                      onChange={(e) => setAttendanceRange({ ...attendanceRange, endDate: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchMyAttendance}
                      disabled={attendanceLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {attendanceLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Debug Info - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">Debug Info:</p>
                  <p className="text-xs text-yellow-700">
                    Employee ID: {employee?.personal?.employeeId || 'Not found'} |
                    Records: {attendanceData.length} |
                    Date Range: {attendanceRange.startDate} to {attendanceRange.endDate}
                  </p>
                </div>
              )}

              {/* Attendance Table */}
              {attendanceLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading attendance data...</p>
                </div>
              ) : attendanceData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-gray-600">No attendance records found for the selected period</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try selecting a different date range or check if attendance data exists.
                  </p>
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => setAttendanceRange({
                        startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
                        endDate: new Date().toISOString().split('T')[0]
                      })}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm mr-2"
                    >
                      Last 2 Months
                    </button>
                    <button
                      onClick={() => setAttendanceRange({
                        startDate: '2024-01-01',
                        endDate: new Date().toISOString().split('T')[0]
                      })}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Year to Date
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData.map((record) => (
                        <tr key={record._id || record.date} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatIndianDate(record.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.dayName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimeDisplay(record.inTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimeDisplay(record.outTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.hoursWorked || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                              {record.status || 'Not Marked'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals (keep existing modals - they're already good) */}
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

// Separate Modal Components for better organization
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