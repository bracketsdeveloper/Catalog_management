// client/src/components/attendance/EmployeeCalendarModal.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { HRMS } from '../../api/hrmsClient';
import { PencilIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const formatHoursToHHMM = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) return '00:00';

  const sign = decimalHours < 0 ? '-' : '';
  const abs = Math.abs(Number(decimalHours) || 0);

  const hours = Math.floor(abs);
  const minutesRaw = Math.round((abs - hours) * 60);

  const carry = minutesRaw === 60 ? 1 : 0;
  const hh = String(hours + carry).padStart(2, '0');
  const mm = String(carry ? 0 : minutesRaw).padStart(2, '0');

  return `${sign}${hh}:${mm}`;
};

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

const isSameMonthYear = (m, y, d = new Date()) => d.getMonth() + 1 === Number(m) && d.getFullYear() === Number(y);
const isPastMonthYear = (m, y, d = new Date()) => {
  const mm = Number(m);
  const yy = Number(y);
  const cm = d.getMonth() + 1;
  const cy = d.getFullYear();
  return yy < cy || (yy === cy && mm < cm);
};
const isFutureMonthYear = (m, y, d = new Date()) => {
  const mm = Number(m);
  const yy = Number(y);
  const cm = d.getMonth() + 1;
  const cy = d.getFullYear();
  return yy > cy || (yy === cy && mm > cm);
};

const isSaturdayOffByPattern = (dateObj, pattern = '1st_3rd') => {
  if (dateObj.getDay() !== 6) return false;

  const p = String(pattern || '1st_3rd').toLowerCase();
  if (p === 'all') return true;
  if (p === 'none') return false;

  const dayOfMonth = dateObj.getDate();
  const weekIndex = Math.floor((dayOfMonth - 1) / 7) + 1; // 1..5

  if (p === '1st_3rd') return weekIndex === 1 || weekIndex === 3;
  if (p === '2nd_4th') return weekIndex === 2 || weekIndex === 4;

  return weekIndex === 1 || weekIndex === 3;
};

const normalizeStatus = (statusRaw) => String(statusRaw || '').trim().toLowerCase();

const getAttendanceFraction = (statusRaw) => {
  const status = normalizeStatus(statusRaw);
  if (!status) return 0;

  if (status.includes('½present') || status.includes('half') || status.includes('0.5')) return 0.5;
  if (status.includes('wfh')) return 1;
  if (status.includes('weeklyoff') && status.includes('present')) return 1;
  if (status.includes('present')) return 1;

  return 0;
};

const pickSaturdaysPatternFromEmployee = (employeeInfo, fallbackPattern) => {
  return (
    employeeInfo?.schedule?.saturdaysOffPattern ||
    employeeInfo?.schedule?.saturdaysPattern ||
    employeeInfo?.org?.saturdaysOffPattern ||
    employeeInfo?.org?.saturdaysPattern ||
    employeeInfo?.companyConfig?.attendance?.saturdaysPattern ||
    employeeInfo?.companyConfig?.attendance?.saturdaysOffPattern ||
    fallbackPattern ||
    '1st_3rd'
  );
};

const getMonthlyPaidLeaveAllocation = (employeeInfo, monthNumber) => {
  const alloc = employeeInfo?.leaveMonthlyAllocation;
  if (!Array.isArray(alloc) || !alloc.length) {
    return { sick: 0, earned: 0, special: 0, totalPaid: 0 };
  }

  const shortLabel = MONTH_LABELS[monthNumber - 1];     // "Jan"
  const fullLabel = MONTH_FULL[monthNumber - 1];        // "January"

  const row =
    alloc.find((x) => String(x?.month || '').trim() === shortLabel) ||
    alloc.find((x) => String(x?.month || '').trim() === fullLabel) ||
    null;

  const sick = Number.isFinite(+row?.sick) ? +row.sick : 0;
  const earned = Number.isFinite(+row?.earned) ? +row.earned : 0;
  const special = Number.isFinite(+row?.special) ? +row.special : 0;
  const totalPaid = Math.max(0, sick + earned + special);

  return { sick, earned, special, totalPaid };
};

const pickEmployeeId = (obj) =>
  String(obj?.personal?.employeeId || obj?.employeeId || obj?.id || '').trim();

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const EmployeeCalendarModal = ({
  employee,
  month,
  year,
  onClose,
  onMonthChange,
  onDataUpdate,
  viewOnly = false,
  expectedHoursPerDay = 9,
  saturdaysPattern = '1st_3rd',
}) => {
  const [calendarData, setCalendarData] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);

  const [selectedDate, setSelectedDate] = useState(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', inTime: '', outTime: '', remarks: '' });

  const calendarRef = useRef(null);

  const monthNames = MONTH_FULL;

  const statusOptions = [
    'Present',
    'Absent',
    'Leave',
    'WFH',
    'WeeklyOff',
    '½Present',
    'Absent (No OutPunch)',
    'WeeklyOff Present',
  ];

  // effective Saturdays pattern (use employee config if available)
  const effectiveSaturdaysPattern = useMemo(
    () => pickSaturdaysPatternFromEmployee(employeeInfo, saturdaysPattern),
    [employeeInfo, saturdaysPattern]
  );

  // ✅ ensure leaveMonthlyAllocation exists (because getEmployeeCalendar often doesn't include it)
  const ensureEmployeeAllocation = useCallback(
    async (baseEmployeeInfo) => {
      const empId = pickEmployeeId(baseEmployeeInfo) || pickEmployeeId(employee);
      if (!empId) return baseEmployeeInfo;

      // already present
      if (Array.isArray(baseEmployeeInfo?.leaveMonthlyAllocation)) return baseEmployeeInfo;

      try {
        // 1) Try a direct employee fetch if your client has it
        if (typeof HRMS.getEmployee === 'function') {
          const r = await HRMS.getEmployee(empId);
          const fullEmp = r?.data?.employee || r?.data || null;
          if (fullEmp) {
            return { ...baseEmployeeInfo, ...fullEmp };
          }
        }

        // 2) Fallback: listEmployees and find by employeeId
        const resp = await HRMS.listEmployees({ limit: 2000 });
        const rows = resp?.data?.rows || [];
        const match =
          rows.find((x) => pickEmployeeId(x) === empId) ||
          rows.find((x) => String(x?.employeeId || '').trim() === empId) ||
          null;

        if (match) {
          return { ...baseEmployeeInfo, ...match };
        }
      } catch (e) {
        console.error('Failed to hydrate employee leave allocation:', e);
      }

      return baseEmployeeInfo;
    },
    [employee]
  );

  const fetchCalendarData = useCallback(async () => {
    if (!employee?.employeeId) return;

    setLoading(true);
    try {
      const response = await HRMS.getEmployeeCalendar(employee.employeeId, {
        month: currentMonth,
        year: currentYear,
      });

      const formattedCalendarData = (response?.data?.calendarData || []).map((day) => {
        if (!day) return day;
        if (day?.attendance) {
          return {
            ...day,
            attendance: {
              ...day.attendance,
              formattedWorkHours: formatHoursToHHMM(day.attendance.workHours || 0),
              formattedOTHours: formatHoursToHHMM(day.attendance.otHours || 0),
              inTime: day.attendance.inTime || '',
              outTime: day.attendance.outTime || '',
            },
          };
        }
        return day;
      });

      setCalendarData(formattedCalendarData);

      const baseEmp = response?.data?.employee || null;
      const hydrated = await ensureEmployeeAllocation(baseEmp || employee || null);
      setEmployeeInfo(hydrated);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      toast.error('Failed to load calendar data');
      setCalendarData([]);
      setEmployeeInfo(null);
    } finally {
      setLoading(false);
    }
  }, [employee?.employeeId, employee, currentMonth, currentYear, ensureEmployeeAllocation]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Holiday map for policy working day
  // ─────────────────────────────────────────────────────────────────────────────

  const holidayTypeByDay = useMemo(() => {
    const map = new Map();
    (calendarData || []).forEach((d) => {
      if (!d?.date) return;
      if (!d?.holidayInfo?.type) return;
      const dt = new Date(d.date);
      if (isNaN(dt.getTime())) return;
      if (dt.getMonth() !== currentMonth - 1 || dt.getFullYear() !== currentYear) return;
      map.set(dt.getDate(), d.holidayInfo.type);
    });
    return map;
  }, [calendarData, currentMonth, currentYear]);

  const isPublicHolidayOff = useCallback(
    (dateObj) => {
      const t = holidayTypeByDay.get(dateObj.getDate());
      if (!t) return false;
      return String(t).toUpperCase() !== 'RESTRICTED';
    },
    [holidayTypeByDay]
  );

  const isWeeklyOffByPolicy = useCallback(
    (dateObj) => {
      const dow = dateObj.getDay();
      if (dow === 0) return true; // Sunday off
      if (dow === 6 && isSaturdayOffByPattern(dateObj, effectiveSaturdaysPattern)) return true;
      return false;
    },
    [effectiveSaturdaysPattern]
  );

  const isWorkingDayByPolicy = useCallback(
    (dateObj) => {
      if (isWeeklyOffByPolicy(dateObj)) return false;
      if (isPublicHolidayOff(dateObj)) return false;
      return true;
    },
    [isWeeklyOffByPolicy, isPublicHolidayOff]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ✅ Till-today summary (same style as AttendanceSummaryPage)
  // ─────────────────────────────────────────────────────────────────────────────

  const { tableSummary, detailedSummary } = useMemo(() => {
    const today = new Date();
    const totalDaysInMonth = getDaysInMonth(currentMonth, currentYear);

    const isFuture = isFutureMonthYear(currentMonth, currentYear, today);
    const isCurrent = isSameMonthYear(currentMonth, currentYear, today);
    const cutoffDay = isFuture ? 0 : isCurrent ? today.getDate() : totalDaysInMonth;

    let totalWorkingDaysTill = 0;
    for (let day = 1; day <= cutoffDay; day++) {
      const dt = new Date(currentYear, currentMonth - 1, day);
      if (isWorkingDayByPolicy(dt)) totalWorkingDaysTill++;
    }

    const alloc = getMonthlyPaidLeaveAllocation(employeeInfo, currentMonth);
    const paidLeaves = Number(Math.max(0, alloc.totalPaid).toFixed(2));

    let daysAttended = 0;

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let wfhDays = 0;
    let weeklyOffDays = 0;
    let halfPresentDays = 0;
    let holidayDays = 0;
    let restrictedHolidayDays = 0;

    let lateArrivals = 0;
    let earlyDepartures = 0;
    let totalOTHours = 0;

    (calendarData || []).forEach((day) => {
      if (!day?.date) return;
      const dt = new Date(day.date);
      if (isNaN(dt.getTime())) return;
      if (dt.getMonth() !== currentMonth - 1 || dt.getFullYear() !== currentYear) return;
      if (dt.getDate() > cutoffDay) return;

      const holidayType = day?.holidayInfo?.type ? String(day.holidayInfo.type).toUpperCase() : null;
      if (holidayType) {
        if (holidayType === 'RESTRICTED') restrictedHolidayDays++;
        else holidayDays++;
      }

      if (isWeeklyOffByPolicy(dt)) weeklyOffDays++;

      if (day?.attendance) {
        totalOTHours += Number(day.attendance.otHours || 0);

        if (isWorkingDayByPolicy(dt)) {
          if (day.attendance.isLateArrival) lateArrivals++;
          if (day.attendance.isEarlyDeparture) earlyDepartures++;
        }
      }

      const status = normalizeStatus(day?.attendance?.status);

      // ✅ salary attendance ONLY on working days
      if (status && isWorkingDayByPolicy(dt)) {
        daysAttended += getAttendanceFraction(status);
      }

      // display buckets
      if (status) {
        if (status.includes('½present') || status.includes('half') || status.includes('0.5')) {
          halfPresentDays += 1;
          presentDays += 0.5;
        } else if (status.includes('wfh')) {
          wfhDays += 1;
          presentDays += 1;
        } else if (status.includes('leave')) {
          leaveDays += 1;
        } else if (status.includes('absent')) {
          absentDays += 1;
        } else if (status.includes('weeklyoff')) {
          if (status.includes('present')) presentDays += 1;
        } else if (status.includes('present')) {
          presentDays += 1;
        }
      } else if (day.leaveInfo) {
        leaveDays += 1;
      }
    });

    daysAttended = Number(daysAttended.toFixed(2));

    const totalLeavesTaken = Number(Math.max(0, totalWorkingDaysTill - daysAttended).toFixed(2));
    const payLossDays = Number(Math.max(0, totalLeavesTaken - paidLeaves).toFixed(2));

    const dailyHours = Number(expectedHoursPerDay || 9);
    const expectedHours = Number((totalWorkingDaysTill * dailyHours).toFixed(2));

    // ✅ your requested formula
    const hoursWorked = Number(((totalWorkingDaysTill - totalLeavesTaken) * dailyHours).toFixed(2));

    const toBePaidFor = Number((daysAttended + paidLeaves).toFixed(2));
    const attendanceRate = totalWorkingDaysTill > 0 ? Number(((daysAttended / totalWorkingDaysTill) * 100).toFixed(1)) : 0;

    const workingDaysLabel = isFuture
      ? 'Future month - no working days yet'
      : isCurrent
      ? `${totalWorkingDaysTill} working days till today`
      : `${totalWorkingDaysTill} working days this month`;

    return {
      tableSummary: {
        totalDaysInMonth,
        totalWorkingDays: totalWorkingDaysTill,
        workingDaysLabel,
        daysAttended,
        totalLeavesTaken,
        paidLeaves,
        paidLeavesBreakdown: { sick: alloc.sick, earned: alloc.earned, special: alloc.special },
        payLossDays,
        expectedHours,
        formattedExpectedHours: formatHoursToHHMM(expectedHours),
        totalHoursWorked: hoursWorked,
        formattedHoursWorked: formatHoursToHHMM(hoursWorked),
        toBePaidFor,
        attendanceRate,
      },
      detailedSummary: {
        presentDays: Number(presentDays.toFixed(1)),
        absentDays,
        leaveDays,
        wfhDays,
        weeklyOffDays,
        halfPresentDays,
        holidayDays,
        restrictedHolidayDays,
        totalOTHours: Number(totalOTHours.toFixed(2)),
        formattedOTHours: formatHoursToHHMM(totalOTHours),
        lateArrivals,
        earlyDepartures,
      },
    };
  }, [calendarData, currentMonth, currentYear, expectedHoursPerDay, employeeInfo, isWorkingDayByPolicy, isWeeklyOffByPolicy]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Month nav
  // ─────────────────────────────────────────────────────────────────────────────

  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setEditingStatus(false);
    setSelectedDate(null);
    if (onMonthChange) onMonthChange(newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setEditingStatus(false);
    setSelectedDate(null);
    if (onMonthChange) onMonthChange(newMonth, newYear);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Editing
  // ─────────────────────────────────────────────────────────────────────────────

  const handleEditClick = (day, e) => {
    if (viewOnly) return;
    e?.stopPropagation();
    if (!day?.date) return;

    setSelectedDate(day);
    setEditForm({
      status: day.attendance?.status || '',
      inTime: day.attendance?.inTime || '',
      outTime: day.attendance?.outTime || '',
      remarks: day.attendance?.remarks || '',
    });
    setEditingStatus(true);
  };

  const handleCellClick = (day) => {
    if (viewOnly) return;
    if (!day?.date) return;
    handleEditClick(day);
  };

  const handleStatusUpdate = async () => {
    if (viewOnly) return;
    if (!selectedDate?.date) return;

    try {
      await HRMS.manualAttendanceEntry({
        employeeId: employee.employeeId,
        date: selectedDate.date,
        status: editForm.status,
        inTime: editForm.inTime,
        outTime: editForm.outTime,
        remarks: editForm.remarks,
      });

      toast.success('Attendance updated successfully');
      setEditingStatus(false);
      setSelectedDate(null);

      await fetchCalendarData();
      if (onDataUpdate) onDataUpdate();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const handleCancelEdit = () => {
    setEditingStatus(false);
    setSelectedDate(null);
    setEditForm({ status: '', inTime: '', outTime: '', remarks: '' });
  };

  const renderEditButton = (day) => {
    if (viewOnly || !day?.date) return null;
    return (
      <button
        onClick={(e) => handleEditClick(day, e)}
        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Edit attendance"
      >
        <PencilIcon className="w-3 h-3" />
      </button>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getStatusBadge = (day) => {
    if (!day) return null;

    const status = normalizeStatus(day?.attendance?.status);

    if (status) {
      if (status.includes('½present') || status.includes('half') || status.includes('0.5')) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">½ Present</span>;
      }
      if (status.includes('wfh')) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">WFH</span>;
      }
      if (status.includes('leave')) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Leave</span>;
      }
      if (status.includes('absent')) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Absent</span>;
      }
      if (status.includes('weeklyoff')) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Weekly Off</span>;
      }
      if (status.includes('present')) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Present</span>;
      }

      return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{day.attendance.status}</span>;
    }

    if (day.holidayInfo) {
      const isRestricted = String(day.holidayInfo.type || '').toUpperCase() === 'RESTRICTED';
      return (
        <div className="flex flex-col items-center">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isRestricted ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'}`}>
            {isRestricted ? 'RH' : 'Holiday'}
          </span>
          {day.holidayInfo.name && (
            <span className={`text-xs mt-0.5 truncate max-w-full ${isRestricted ? 'text-purple-600' : 'text-indigo-600'}`} title={day.holidayInfo.name}>
              {day.holidayInfo.name.length > 10 ? day.holidayInfo.name.substring(0, 10) + '...' : day.holidayInfo.name}
            </span>
          )}
        </div>
      );
    }

    if (day?.date) {
      const dt = new Date(day.date);
      if (!isNaN(dt.getTime()) && isWeeklyOffByPolicy(dt)) {
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">Weekend</span>;
      }
    }

    return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">Not Marked</span>;
  };

  const renderTimeInfo = (day) => {
    if (!day?.attendance?.inTime && !day?.attendance?.outTime) return null;
    return (
      <div className="text-xs text-gray-600 mt-1">
        {day.attendance.inTime && <span>In: {day.attendance.inTime}</span>}
        {day.attendance.inTime && day.attendance.outTime && <span> | </span>}
        {day.attendance.outTime && <span>Out: {day.attendance.outTime}</span>}
      </div>
    );
  };

  const renderHoursInfo = (day) => {
    if (!day?.attendance) return null;
    const workHours = Number(day.attendance.workHours || 0);
    const otHours = Number(day.attendance.otHours || 0);
    if (workHours <= 0 && otHours <= 0) return null;

    return (
      <div className="text-xs text-gray-500 mt-0.5">
        {formatHoursToHHMM(workHours)}h
        {otHours > 0 && <span className="text-green-600 ml-1">+{formatHoursToHHMM(otHours)}h OT</span>}
      </div>
    );
  };

  const getDayCellClass = (day) => {
    const isSelected = selectedDate?.date === day?.date;
    let base = 'min-h-[100px] p-2 rounded-lg border transition-all group relative cursor-pointer ';
    if (isSelected) base += 'ring-2 ring-blue-400 border-blue-400 ';

    const status = normalizeStatus(day?.attendance?.status);

    if (status.includes('weeklyoff')) return base + 'bg-yellow-50 border-yellow-200 hover:border-yellow-400 hover:shadow-sm';
    if (status.includes('½present') || status.includes('half') || status.includes('0.5')) return base + 'bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-sm';
    if (status.includes('absent')) return base + 'bg-red-50 border-red-200 hover:border-red-400 hover:shadow-sm';
    if (status.includes('wfh')) return base + 'bg-purple-50 border-purple-200 hover:border-purple-400 hover:shadow-sm';
    if (status.includes('leave')) return base + 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-sm';
    if (status.includes('present')) return base + 'bg-green-50 border-green-200 hover:border-green-400 hover:shadow-sm';

    if (day?.holidayInfo) return base + 'bg-indigo-50 border-indigo-200 hover:border-indigo-300 hover:shadow-sm';

    if (day?.date) {
      const dt = new Date(day.date);
      if (!isNaN(dt.getTime()) && isWeeklyOffByPolicy(dt)) {
        return base + 'bg-gray-50 border-gray-200 opacity-90 hover:border-gray-300 hover:shadow-sm';
      }
    }

    return base + 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm';
  };

  const getWeeks = () => {
    if (!calendarData?.length) return [];
    const weeks = [];
    let currentWeek = [];

    const firstDayDow = new Date(currentYear, currentMonth - 1, 1).getDay();
    for (let i = 0; i < firstDayDow; i++) currentWeek.push(null);

    calendarData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    while (currentWeek.length > 0 && currentWeek.length < 7) currentWeek.push(null);
    if (currentWeek.length) weeks.push(currentWeek);

    return weeks;
  };

  const weeks = getWeeks();

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {employeeInfo?.name || employee.name}
                {viewOnly && <span className="ml-2 text-sm font-normal text-gray-600">(View Only)</span>}
              </h2>
              <p className="text-sm text-gray-600">
                {pickEmployeeId(employeeInfo) || employee.employeeId} • {employeeInfo?.role || employee.role} •{' '}
                {employeeInfo?.department || employee.department}
              </p>
              <div className="flex gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-500">
                  Month: {monthNames[currentMonth - 1]} ({tableSummary.totalDaysInMonth} days)
                </span>
                <span className="text-xs text-gray-500">
                  Working Days (policy): {tableSummary.totalWorkingDays}{' '}
                  <span className="text-gray-400">({tableSummary.workingDaysLabel})</span>
                </span>
                <span className="text-xs text-gray-500">
                  Sundays off + Saturdays off ({String(effectiveSaturdaysPattern).replace('_', ' & ')})
                </span>
                <span className="text-xs text-gray-500">Public holidays off • RH working</span>
              </div>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b flex items-center justify-between bg-white flex-shrink-0">
          <button onClick={handlePrevMonth} className="px-3 py-1 border rounded-md hover:bg-gray-50">
            ← Previous
          </button>
          <h3 className="text-lg font-semibold text-gray-800">
            {monthNames[currentMonth - 1]} {currentYear}
          </h3>
          <button onClick={handleNextMonth} className="px-3 py-1 border rounded-md hover:bg-gray-50">
            Next →
          </button>
        </div>

        {/* Summary cards */}
        <div className="border-b">
          <div className="px-6 py-3 bg-gray-50">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800">{tableSummary.totalDaysInMonth}</div>
                <div className="text-xs text-gray-500"># of days in month</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800">{tableSummary.totalWorkingDays}</div>
                <div className="text-xs text-gray-500">Total working days</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{tableSummary.daysAttended}</div>
                <div className="text-xs text-gray-500">Days Attended</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-blue-700">{tableSummary.totalLeavesTaken}</div>
                <div className="text-xs text-gray-500">Total Leaves Taken</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-indigo-700">{tableSummary.paidLeaves}</div>
                <div className="text-xs text-gray-500">Paid Leaves</div>
                <div className="text-[10px] text-gray-500 mt-1 leading-4">
                  Sick: {tableSummary.paidLeavesBreakdown.sick} • Earned: {tableSummary.paidLeavesBreakdown.earned} • Special:{' '}
                  {tableSummary.paidLeavesBreakdown.special}
                </div>
              </div>

              <div className="text-center">
                <div className={`text-lg font-semibold ${tableSummary.payLossDays > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {tableSummary.payLossDays}
                </div>
                <div className="text-xs text-gray-500">Pay Loss Days</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800">{tableSummary.formattedExpectedHours}h</div>
                <div className="text-xs text-gray-500">Expected hours</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800">{tableSummary.formattedHoursWorked}h</div>
                <div className="text-xs text-gray-500">Hours worked</div>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800">{tableSummary.toBePaidFor}</div>
                <div className="text-xs text-gray-500">To be paid for</div>
              </div>
            </div>

            {/* <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 text-center">
              Till-today logic: Leaves = WorkingDays - Attended • PayLoss = Leaves - PaidLeaves (allocation) • ExpectedHours = WorkingDays × {Number(expectedHoursPerDay || 9)}h/day • HoursWorked = (WorkingDays - Leaves) × {Number(expectedHoursPerDay || 9)}h/day • ToBePaidFor = Attended + PaidLeaves
            </div> */}
          </div>

          <div className="px-6 py-3 bg-white border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{detailedSummary.presentDays}</div>
                <div className="text-xs text-gray-500">Present</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">{detailedSummary.absentDays}</div>
                <div className="text-xs text-gray-500">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{detailedSummary.leaveDays}</div>
                <div className="text-xs text-gray-500">Leave</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">{detailedSummary.wfhDays}</div>
                <div className="text-xs text-gray-500">WFH</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-yellow-600">{detailedSummary.weeklyOffDays}</div>
                <div className="text-xs text-gray-500">Weekly Off</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">{detailedSummary.halfPresentDays}</div>
                <div className="text-xs text-gray-500">½ Present</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-indigo-600">{detailedSummary.holidayDays}</div>
                <div className="text-xs text-gray-500">Holidays</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-lg font-semibold ${
                    tableSummary.attendanceRate >= 90 ? 'text-green-600' : tableSummary.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'
                  }`}
                >
                  {tableSummary.attendanceRate}%
                </div>
                <div className="text-xs text-gray-500">Attendance Rate</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t">
              <div className="text-center">
                <div className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {detailedSummary.formattedOTHours}h
                </div>
                <div className="text-xs text-gray-500">OT Hours</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-orange-600 flex items-center justify-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {detailedSummary.lateArrivals}
                </div>
                <div className="text-xs text-gray-500">Late Arrivals</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-orange-600 flex items-center justify-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {detailedSummary.earlyDepartures}
                </div>
                <div className="text-xs text-gray-500">Early Departures</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-purple-600">{detailedSummary.restrictedHolidayDays}</div>
                <div className="text-xs text-gray-500">Restricted Holidays</div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto p-4" ref={calendarRef}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-1 mb-2 sticky top-0 bg-white z-10 pb-2 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                  <div
                    key={d}
                    className={`text-center text-sm font-semibold py-2 ${idx === 0 || idx === 6 ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={day === null ? 'min-h-[100px] p-2 rounded-lg border bg-gray-50 border-gray-100' : getDayCellClass(day)}
                      onClick={() => handleCellClick(day)}
                    >
                      {day && (
                        <>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-700">{day.day}</span>
                            <span className="text-xs text-gray-400">{day.dayName}</span>
                          </div>

                          {renderEditButton(day)}

                          <div className="flex flex-col items-center justify-center">
                            {getStatusBadge(day)}
                            {renderTimeInfo(day)}
                            {renderHoursInfo(day)}
                          </div>

                          {day.attendance?.remarks && (
                            <div className="text-xs text-gray-500 mt-1 truncate" title={day.attendance.remarks}>
                              📝 {day.attendance.remarks}
                            </div>
                          )}

                          {!viewOnly && (
                            <div className="text-[10px] text-gray-400 mt-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to edit
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit panel */}
        {!viewOnly && editingStatus && selectedDate && (
          <div className="px-6 py-4 border-t bg-blue-50 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">
                  Edit Attendance for {selectedDate.date} ({selectedDate.dayName})
                </h3>
                <button onClick={() => handleCancelEdit()} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">In Time</label>
                  <input
                    type="time"
                    value={editForm.inTime}
                    onChange={(e) => setEditForm({ ...editForm, inTime: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Out Time</label>
                  <input
                    type="time"
                    value={editForm.outTime}
                    onChange={(e) => setEditForm({ ...editForm, outTime: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional remarks"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button onClick={handleCancelEdit} className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!editForm.status}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Update Attendance
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCalendarModal;
