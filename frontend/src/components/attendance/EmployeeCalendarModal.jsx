import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { HRMS } from '../../api/hrmsClient';
import { PencilIcon } from '@heroicons/react/24/outline';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatHoursToHHMM = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) return '00:00';

  const sign = decimalHours < 0 ? '-' : '';
  const abs = Math.abs(decimalHours);

  const hours = Math.floor(abs);
  const minutes = Math.round((abs - hours) * 60);

  // handle 59.999 rounding to next hour
  const carry = minutes === 60 ? 1 : 0;
  const hh = (hours + carry).toString().padStart(2, '0');
  const mm = (carry ? 0 : minutes).toString().padStart(2, '0');

  return `${sign}${hh}:${mm}`;
};

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

/**
 * Saturday-off pattern:
 * - "1st_3rd"  -> 1st and 3rd Saturdays are off (matches your saved company config)
 * - "2nd_4th"  -> 2nd and 4th Saturdays are off
 * - "all"      -> all Saturdays off
 * - "none"     -> no Saturdays off
 */
const isSaturdayOffByPattern = (dateObj, pattern = '1st_3rd') => {
  if (dateObj.getDay() !== 6) return false; // only Saturday

  if (pattern === 'all') return true;
  if (pattern === 'none') return false;

  const dayOfMonth = dateObj.getDate();
  const weekIndex = Math.floor((dayOfMonth - 1) / 7) + 1; // 1..5

  if (pattern === '1st_3rd') return weekIndex === 1 || weekIndex === 3;
  if (pattern === '2nd_4th') return weekIndex === 2 || weekIndex === 4;

  // fallback
  return weekIndex === 1 || weekIndex === 3;
};

/**
 * Working Days rule for this modal (as per your requirement):
 * - All Sundays off
 * - 2 Saturdays off (default: 1st & 3rd)
 * - Public holidays (NON-RESTRICTED) are off
 * - Restricted holidays are working days
 */
const getWorkingDaysInMonthWithPolicy = (month, year, calendarData, saturdaysPattern = '1st_3rd') => {
  const daysInMonth = getDaysInMonth(month, year);
  let workingDays = 0;

  // Build a quick lookup of holiday type by day-of-month from calendarData (if provided by API)
  const holidayByDay = new Map();
  (calendarData || []).forEach((d) => {
    if (!d?.date) return;
    if (d.holidayInfo?.type) {
      const dt = new Date(d.date);
      if (!isNaN(dt.getTime()) && dt.getMonth() === month - 1 && dt.getFullYear() === year) {
        holidayByDay.set(dt.getDate(), d.holidayInfo.type); // 'RESTRICTED' or 'PUBLIC'/etc.
      }
    }
  });

  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(year, month - 1, day);
    const dow = dt.getDay();

    // Sundays off
    if (dow === 0) continue;

    // Saturday off as per pattern
    if (dow === 6 && isSaturdayOffByPattern(dt, saturdaysPattern)) continue;

    // Public holidays off (restricted are working)
    const holidayType = holidayByDay.get(day);
    if (holidayType && String(holidayType).toUpperCase() !== 'RESTRICTED') continue;

    workingDays++;
  }

  return workingDays;
};

// Interpret status as "attended" for your table metrics
const getAttendanceFraction = (statusRaw) => {
  const status = String(statusRaw || '').toLowerCase().trim();

  if (!status) return 0;

  // half-day
  if (status.includes('½present') || status.includes('half') || status.includes('0.5')) return 0.5;

  // treat WFH as attended (if you want ONLY physical present, remove this line)
  if (status.includes('wfh')) return 1;

  // present variants
  if (status.includes('present')) return 1;

  // weeklyoff present sometimes comes as "WeeklyOff Present"
  if (status.includes('weeklyoff') && status.includes('present')) return 1;

  return 0;
};

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
  // NEW: if you want to align with company config, pass "1st_3rd" or "2nd_4th"
  saturdaysPattern = '1st_3rd',
}) => {
  const [calendarData, setCalendarData] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);

  // Editing state
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    inTime: '',
    outTime: '',
    remarks: '',
  });

  const calendarRef = useRef(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  useEffect(() => {
    fetchCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear, employee?.employeeId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await HRMS.getEmployeeCalendar(employee.employeeId, {
        month: currentMonth,
        year: currentYear,
      });

      const formattedCalendarData = (response.data.calendarData || []).map((day) => {
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
      setEmployeeInfo(response.data.employee || null);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Calculations (ONLY the same columns as Attendance Summary table)
  // ─────────────────────────────────────────────────────────────────────────────
  const tableSummary = useMemo(() => {
    const totalDaysInMonth = getDaysInMonth(currentMonth, currentYear);

    // Working days as per your policy
    const totalWorkingDays = getWorkingDaysInMonthWithPolicy(
      currentMonth,
      currentYear,
      calendarData,
      saturdaysPattern
    );

    let daysAttended = 0;      // D6 (counts present/wfh/half — incl weekends if marked present)
    let totalHoursWorked = 0;  // from attendance
    let paidLeaves = 0;        // if your API provides paid leave info per day, we can add it
    // NOTE: Leave type/payment is not clearly available in your day object.
    // If day.leaveInfo has "isPaid" or "paid" field, we’ll count it below.

    // IMPORTANT FIX:
    // Previously your logic checked isWeekend before attendance (else-if chain),
    // so weekend attendance was never counted.
    // Here we always check attendance first if it exists.
    (calendarData || []).forEach((day) => {
      if (!day) return;

      // hours worked (any day)
      if (day.attendance?.workHours) totalHoursWorked += Number(day.attendance.workHours || 0);

      // attended fraction from status (any day incl Sat/Sun)
      if (day.attendance?.status) {
        daysAttended += getAttendanceFraction(day.attendance.status);
      } else {
        // no attendance record:
        // do nothing here — leaves are handled separately, and "not marked" days will reflect in leaves taken via formula
      }

      // paid leave (ONLY if your API has a signal)
      // If your day.leaveInfo has a paid flag, count it here.
      if (day.leaveInfo) {
        const paidFlag =
          day.leaveInfo.isPaid ??
          day.leaveInfo.paid ??
          day.leaveInfo.isPaidLeave ??
          false;

        if (paidFlag) paidLeaves += 1;
      }
    });

    // Total Leaves Taken = Total Working Days - Days Attended
    const totalLeavesTaken = Math.max(0, totalWorkingDays - daysAttended);

    // Pay Loss Days = TotalLeavesTaken - PaidLeaves
    const payLossDays = Math.max(0, totalLeavesTaken - paidLeaves);

    // Expected hours = Total Working Days * employee-defined hours/day (prop)
    const expectedHours = totalWorkingDays * Number(expectedHoursPerDay || 9);

    // To be paid for = Days Attended + Paid Leaves
    const toBePaidFor = daysAttended + paidLeaves;

    return {
      totalDaysInMonth,
      totalWorkingDays,
      daysAttended: Number(daysAttended.toFixed(2)),
      totalLeavesTaken: Number(totalLeavesTaken.toFixed(2)),
      paidLeaves: Number(paidLeaves.toFixed(2)),
      payLossDays: Number(payLossDays.toFixed(2)),
      expectedHours: Number(expectedHours.toFixed(2)),
      formattedExpectedHours: formatHoursToHHMM(expectedHours),
      totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
      formattedHoursWorked: formatHoursToHHMM(totalHoursWorked),
      toBePaidFor: Number(toBePaidFor.toFixed(2)),
    };
  }, [calendarData, currentMonth, currentYear, expectedHoursPerDay, saturdaysPattern]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Month navigation
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
  // Editing (edit must be there for each day)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleEditClick = (day, e) => {
    if (viewOnly) return;
    e?.stopPropagation();

    if (!day) return;

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
    if (!day) return;
    handleEditClick(day);
  };

  const handleStatusUpdate = async () => {
    if (viewOnly) return;
    if (!selectedDate) return;

    try {
      const payload = {
        employeeId: employee.employeeId,
        date: selectedDate.date,
        status: editForm.status,
        inTime: editForm.inTime,
        outTime: editForm.outTime,
        remarks: editForm.remarks,
      };

      await HRMS.manualAttendanceEntry(payload);

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

  // ─────────────────────────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const renderEditButton = (day) => {
    if (viewOnly) return null;

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

  const getStatusBadge = (day) => {
    // If attendance exists, show that first (FIX for weekend/holiday present not counted)
    if (day.attendance) {
      const status = String(day.attendance.status || '').toLowerCase();

      if ((status.includes('½present') || status.includes('half')) ) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
            ½ Present
          </span>
        );
      }

      if (status.includes('present')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Present
          </span>
        );
      }

      if (status.includes('wfh')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            WFH
          </span>
        );
      }

      if (status.includes('leave')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Leave
          </span>
        );
      }

      if (status.includes('absent')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Absent
          </span>
        );
      }

      if (status.includes('weeklyoff')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Weekly Off
          </span>
        );
      }

      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          {day.attendance.status}
        </span>
      );
    }

    // Next: leave info
    if (day.leaveInfo) {
      return (
        <div className="flex flex-col items-center">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Leave
          </span>
          {day.leaveInfo.type && (
            <span className="text-xs text-blue-600 mt-0.5">{day.leaveInfo.type}</span>
          )}
        </div>
      );
    }

    // Holiday info
    if (day.holidayInfo) {
      const isRestricted = String(day.holidayInfo.type || '').toUpperCase() === 'RESTRICTED';
      return (
        <div className="flex flex-col items-center">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              isRestricted ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {isRestricted ? 'RH' : 'Holiday'}
          </span>
          {day.holidayInfo.name && (
            <span
              className={`text-xs mt-0.5 truncate max-w-full ${
                isRestricted ? 'text-purple-600' : 'text-indigo-600'
              }`}
              title={day.holidayInfo.name}
            >
              {day.holidayInfo.name.length > 10
                ? day.holidayInfo.name.substring(0, 10) + '...'
                : day.holidayInfo.name}
            </span>
          )}
        </div>
      );
    }

    // Weekend
    if (day.isWeekend) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
          Weekend
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
        Not Marked
      </span>
    );
  };

  const renderTimeInfo = (day) => {
    if (!day.attendance?.inTime && !day.attendance?.outTime) return null;

    return (
      <div className="text-xs text-gray-600 mt-1">
        {day.attendance.inTime && <span>In: {day.attendance.inTime}</span>}
        {day.attendance.inTime && day.attendance.outTime && <span> | </span>}
        {day.attendance.outTime && <span>Out: {day.attendance.outTime}</span>}
      </div>
    );
  };

  const renderHoursInfo = (day) => {
    if (!day.attendance) return null;
    const workHours = Number(day.attendance.workHours || 0);
    const otHours = Number(day.attendance.otHours || 0);

    // show hours for any day including weekends/holidays
    if (workHours <= 0 && otHours <= 0) return null;

    return (
      <div className="text-xs text-gray-500 mt-0.5">
        {formatHoursToHHMM(workHours)}h
        {otHours > 0 && (
          <span className="text-green-600 ml-1">+{formatHoursToHHMM(otHours)}h OT</span>
        )}
      </div>
    );
  };

  const getDayCellClass = (day) => {
    const isSelected = selectedDate?.date === day?.date;
    let base =
      'min-h-[100px] p-2 rounded-lg border transition-all group relative cursor-pointer ';

    if (isSelected) base += 'ring-2 ring-blue-400 border-blue-400 ';

    // If attendance exists, style by attendance first (FIX)
    const status = String(day?.attendance?.status || '').toLowerCase();
    if (status) {
      if ((status.includes('present') && !status.includes('½')) || status.includes('weeklyoff present')) {
        return base + 'bg-green-50 border-green-200 hover:border-green-400 hover:shadow-sm';
      }
      if (status.includes('½present') || status.includes('half')) {
        return base + 'bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-sm';
      }
      if (status.includes('absent')) {
        return base + 'bg-red-50 border-red-200 hover:border-red-400 hover:shadow-sm';
      }
      if (status.includes('wfh')) {
        return base + 'bg-purple-50 border-purple-200 hover:border-purple-400 hover:shadow-sm';
      }
      if (status.includes('weeklyoff')) {
        return base + 'bg-yellow-50 border-yellow-200 hover:border-yellow-400 hover:shadow-sm';
      }
      return base + 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm';
    }

    // no attendance => then holiday/leave/weekend styling
    if (day?.leaveInfo) return base + 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-sm';
    if (day?.holidayInfo) return base + 'bg-indigo-50 border-indigo-200 hover:border-indigo-300 hover:shadow-sm';
    if (day?.isWeekend) return base + 'bg-gray-50 border-gray-200 opacity-90 hover:border-gray-300 hover:shadow-sm';

    return base + 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm';
  };

  // Group calendar data into weeks
  const getWeeks = () => {
    if (!calendarData.length) return [];
    const weeks = [];
    let currentWeek = [];

    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    for (let i = 0; i < firstDay; i++) currentWeek.push(null);

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
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {employeeInfo?.name || employee.name}
                {viewOnly && <span className="ml-2 text-sm font-normal text-gray-600">(View Only)</span>}
              </h2>
              <p className="text-sm text-gray-600">
                {employeeInfo?.employeeId || employee.employeeId} • {employeeInfo?.role || employee.role} •{' '}
                {employeeInfo?.department || employee.department}
              </p>
              <div className="flex gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-500">
                  Month: {monthNames[currentMonth - 1]} ({tableSummary.totalDaysInMonth} days)
                </span>
                <span className="text-xs text-gray-500">
                  Working Days (policy): {tableSummary.totalWorkingDays}
                </span>
                <span className="text-xs text-gray-500">
                  Sundays off + 2 Saturdays off ({saturdaysPattern.replace('_', ' & ')})
                </span>
                <span className="text-xs text-gray-500">
                  Public holidays off • RH working
                </span>
              </div>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        {/* Month Navigation */}
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

        {/* ✅ ONLY THE SAME METRICS AS YOUR ATTENDANCE SUMMARY TABLE */}
        <div className="px-6 py-3 bg-gray-50 border-b flex-shrink-0">
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

          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 text-center">
            Formula: Leaves = WorkingDays - Attended • PayLoss = Leaves - PaidLeaves • ExpectedHours = WorkingDays × {expectedHoursPerDay}h/day • ToBePaidFor = Attended + PaidLeaves
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-4" ref={calendarRef}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2 sticky top-0 bg-white z-10 pb-2 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                  <div
                    key={d}
                    className={`text-center text-sm font-semibold py-2 ${idx === 0 || idx === 6 ? 'text-gray-400' : 'text-gray-700'
                      }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={
                        day === null
                          ? 'min-h-[100px] p-2 rounded-lg border bg-gray-50 border-gray-100'
                          : getDayCellClass(day)
                      }
                      onClick={() => handleCellClick(day)}
                    >
                      {day && (
                        <>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-medium ${day.isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                              {day.day}
                            </span>
                            <span className="text-xs text-gray-400">{day.dayName}</span>
                          </div>

                          {/* Edit button for EACH day */}
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

        {/* Edit Form */}
        {!viewOnly && editingStatus && selectedDate && (
          <div className="px-6 py-4 border-t bg-blue-50 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">
                  Edit Attendance for {selectedDate.date} ({selectedDate.dayName})
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
                >
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
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
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

        {/* Legend */}
        <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
          <div className="flex flex-wrap gap-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></span>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300"></span>
              <span>½ Present</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span>
              <span>Leave</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300"></span>
              <span>WFH / RH</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300"></span>
              <span>Public Holiday</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300"></span>
              <span>Weekend</span>
            </div>
            {!viewOnly && (
              <div className="flex items-center gap-1">
                <PencilIcon className="w-3 h-3" />
                <span>Click any day to edit</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
