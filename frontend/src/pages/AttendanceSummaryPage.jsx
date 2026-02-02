import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { HRMS } from '../api/hrmsClient';
import EmployeeCalendarModal from '../components/attendance/EmployeeCalendarModal';
import AttendanceUploadModal from '../components/attendance/AttendanceUploadModal';

const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 mb-4 sm:mb-0">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  </div>
);

const FiltersBar = ({ children }) => (
  <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  </div>
);

// Helper function to convert decimal hours to hh:mm format
const formatHoursToHHMM = (decimalHours) => {
  if (!decimalHours && decimalHours !== 0) return '00:00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const AttendanceSummaryPage = () => {
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchFilters();
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, department, role, holidays]);

  // Fetch holidays for the selected month/year
  const fetchHolidays = async () => {
    try {
      // your client has listHolidays(), but your old page used getHolidays()
      // keep your old intent: if getHolidays exists, use it; else fallback to listHolidays
      const response = HRMS.getHolidays
        ? await HRMS.getHolidays({ month, year })
        : await HRMS.listHolidays({ month, year });

      const data = response?.data?.rows || response?.data || [];
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setHolidays([]);
    }
  };

  // Helper: working days till today (excludes weekends + public holidays; restricted holidays are working days)
  const calculateWorkingDaysTillToday = (month, year) => {
    const today = new Date();
    if (today.getMonth() + 1 !== month || today.getFullYear() !== year) return null;

    const currentMonthIndex = month - 1;
    const todayDate = today.getDate();

    const monthHolidays = holidays.filter((h) => {
      const hd = new Date(h.date);
      return (
        hd.getMonth() === currentMonthIndex &&
        hd.getFullYear() === year &&
        h.type !== 'RESTRICTED'
      );
    });

    const holidayDates = new Set(
      monthHolidays.map((h) => new Date(h.date).getDate())
    );

    let workingDays = 0;
    for (let day = 1; day <= todayDate; day++) {
      const d = new Date(year, currentMonthIndex, day);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue; // Sun/Sat off (your current logic)
      if (holidayDates.has(day)) continue;
      workingDays++;
    }

    return workingDays;
  };

  // Helper: total working days in month (excludes weekends + public holidays; restricted holidays are working days)
  const getTotalWorkingDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthIndex = month - 1;

    const monthHolidays = holidays.filter((h) => {
      const hd = new Date(h.date);
      return (
        hd.getMonth() === monthIndex &&
        hd.getFullYear() === year &&
        h.type !== 'RESTRICTED'
      );
    });

    const holidayDates = new Set(
      monthHolidays.map((h) => new Date(h.date).getDate())
    );

    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthIndex, day);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      if (holidayDates.has(day)) continue;
      workingDays++;
    }

    return workingDays;
  };

  const fetchFilters = async () => {
    try {
      const response = await HRMS.listEmployees({ limit: 1000 });
      const employees = response.data.rows || [];
      const deptSet = new Set();
      const roleSet = new Set();

      employees.forEach((emp) => {
        if (emp.org?.department) deptSet.add(emp.org.department);
        if (emp.org?.role) roleSet.add(emp.org.role);
      });

      setDepartments(Array.from(deptSet).sort());
      setRoles(Array.from(roleSet).sort());
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (department) params.department = department;
      if (role) params.role = role;

      const response = await HRMS.getAttendanceSummaryAll(params);
      const rawData = response.data.results || [];

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      let workingDaysForCalc;
      let displayWorkingDays;
      let isTillToday = false;

      if (month === currentMonth && year === currentYear) {
        workingDaysForCalc = calculateWorkingDaysTillToday(month, year) || 0;
        displayWorkingDays = workingDaysForCalc;
        isTillToday = true;
      } else if (month < currentMonth || year < currentYear) {
        workingDaysForCalc = getTotalWorkingDaysInMonth(month, year);
        displayWorkingDays = workingDaysForCalc;
        isTillToday = false;
      } else {
        workingDaysForCalc = 0;
        displayWorkingDays = 0;
        isTillToday = false;
      }

      const daysInMonth = new Date(year, month, 0).getDate();

      const processed = rawData.map((employee) => {
        const summary = { ...employee.summary };

        // ✅ Your new sheet logic
        // Total Working Days = C6
        const totalWorkingDays = displayWorkingDays;

        // Days Attended = D6 (presentDays)
        const daysAttended = Number(summary.presentDays || 0);

        // Total Leaves Taken = C6 - D6
        const totalLeavesTaken = Math.max(0, totalWorkingDays - daysAttended);

        // Paid Leaves for the month = summary.paidLeaves || 0 (fallback)
        // If your backend doesn't provide this, it will show 0 until you add it.
        const paidLeaves = Number(summary.paidLeaves || 0);

        // Pay Loss Days = (C6 - D6) - F6
        const payLossDays = Math.max(0, totalLeavesTaken - paidLeaves);

        // Expected hours = C6 * dailyHours (dailyHours can be per employee; fallback 9)
        const dailyHours = Number(summary.dailyHours || summary.dailyWorkHours || 9);
        const expectedHours = totalWorkingDays * dailyHours;

        // Worked hours = from attendance software (summary.totalHours)
        const hoursWorked = Number(summary.totalHours || 0);

        // To be paid for = D6 + F6
        const toBePaidFor = daysAttended + paidLeaves;

        // Keep existing formatted values if you want, but only for your table
        summary.daysInMonth = daysInMonth;
        summary.totalWorkingDays = totalWorkingDays;
        summary.daysAttended = daysAttended;
        summary.totalLeavesTaken = totalLeavesTaken;
        summary.paidLeaves = paidLeaves;
        summary.payLossDays = payLossDays;
        summary.expectedHours = expectedHours;
        summary.hoursWorked = hoursWorked;
        summary.toBePaidFor = toBePaidFor;

        summary.formattedExpectedHours = formatHoursToHHMM(expectedHours);
        summary.formattedWorkedHours = formatHoursToHHMM(hoursWorked);

        // keep your existing label fields for the banner if you want (design unchanged)
        summary.isTillToday = isTillToday;
        summary.workingDaysLabel = isTillToday
          ? `${displayWorkingDays} working days till today`
          : (month < currentMonth || year < currentYear)
          ? `${displayWorkingDays} working days this month`
          : 'Future month - no working days yet';

        return { ...employee, summary };
      });

      setSummaryData(processed);
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Failed to load attendance summary');
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (employee) => {
    setSelectedEmployee(employee);
    setCalendarModalOpen(true);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const filtered = summaryData.filter((emp) => {
      const name = String(emp.name || '').toLowerCase();
      const id = String(emp.employeeId || '').toLowerCase();
      const dept = String(emp.department || '').toLowerCase();
      const q = searchTerm.toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc'
          ? String(a.name || '').localeCompare(String(b.name || ''))
          : String(b.name || '').localeCompare(String(a.name || ''));
      }
      if (sortConfig.key === 'hoursWorked') {
        const ah = Number(a.summary?.hoursWorked || 0);
        const bh = Number(b.summary?.hoursWorked || 0);
        return sortConfig.direction === 'asc' ? ah - bh : bh - ah;
      }
      if (sortConfig.key === 'toBePaidFor') {
        const av = Number(a.summary?.toBePaidFor || 0);
        const bv = Number(b.summary?.toBePaidFor || 0);
        return sortConfig.direction === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    toast.success('Attendance uploaded successfully');
    fetchSummary();
  };

  const getHolidayCount = () =>
    holidays.filter((h) => {
      const d = new Date(h.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year && h.type !== 'RESTRICTED';
    }).length;

  const sortedData = useMemo(() => getSortedData(), [summaryData, searchTerm, sortConfig]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
  const isPastMonth = month < today.getMonth() + 1 || year < today.getFullYear();
  const holidayCount = getHolidayCount();

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Attendance Summary"
        subtitle={`${monthNames[month - 1]} ${year} - ${summaryData.length} employees${
          isCurrentMonth ? ' (Till Today)' : isPastMonth ? '' : ' (Future Month)'
        }${holidayCount > 0 ? ` • ${holidayCount} holiday${holidayCount > 1 ? 's' : ''}` : ''}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin-dashboard/hrms/attendance')}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
            >
              Individual View
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Upload Attendance
            </button>
          </div>
        }
      />

      <FiltersBar>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
          >
            {monthNames.map((name, index) => (
              <option key={index} value={index + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </FiltersBar>

      {/* Information Banner (UNCHANGED) */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="text-sm text-blue-700 font-medium">
              {isCurrentMonth ? 'Calculated Till Today' : isPastMonth ? 'Complete Month Data' : 'Future Month'}
            </span>
            <div className="text-xs text-blue-600 mt-1">
              {isCurrentMonth ? (
                <>
                  • Working days exclude weekends and public holidays<br />
                  • Restricted holidays are counted as working days
                </>
              ) : isPastMonth ? (
                <>
                  • Complete month data shown<br />
                  • Working days exclude weekends and public holidays
                </>
              ) : (
                <>• Future month - no attendance data available yet</>
              )}
            </div>
          </div>
        </div>

        {holidayCount > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="text-xs text-blue-700">
                {holidayCount} public holiday{holidayCount > 1 ? 's' : ''} in {monthNames[month - 1]} {year}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, ID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md border rounded-md px-3 py-2"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading attendance summary...</p>
        </div>
      ) : sortedData.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-600">No attendance data found for the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {/* ✅ NEW TABLE LAYOUT ONLY (Design same) */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Employee Name
                      {sortConfig.key === 'name' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    # of days in month
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total # of working days
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Attended
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Leaves Taken
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid Leaves for month
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pay Loss Days
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Working Hours
                  </th>

                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('hoursWorked')}
                  >
                    <div className="flex items-center gap-1">
                      Hours Worked
                      {sortConfig.key === 'hoursWorked' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>

                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('toBePaidFor')}
                  >
                    <div className="flex items-center gap-1">
                      To be paid for
                      {sortConfig.key === 'toBePaidFor' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((employee) => (
                  <tr
                    key={employee.employeeId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(employee)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.employeeId}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.daysInMonth}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.totalWorkingDays}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.daysAttended}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.totalLeavesTaken}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.paidLeaves}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.payLossDays}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.formattedExpectedHours}h
                      <div className="text-xs text-gray-500">
                        {Number(employee.summary.dailyHours || employee.summary.dailyWorkHours || 9)}h/day
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.formattedWorkedHours}h
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.toBePaidFor}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(employee);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Calendar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer (kept, but no extra stats required by you? You didn't ask to remove it now, so kept design) */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {sortedData.length} of {summaryData.length} employees
            </div>
          </div>
        </div>
      )}

      {/* Employee Calendar Modal */}
      {calendarModalOpen && selectedEmployee && (
        <EmployeeCalendarModal
          employee={selectedEmployee}
          month={month}
          year={year}
          onClose={() => {
            setCalendarModalOpen(false);
            setSelectedEmployee(null);
          }}
          onMonthChange={(newMonth, newYear) => {
            setMonth(newMonth);
            setYear(newYear);
          }}
          onDataUpdate={() => fetchSummary()}
        />
      )}

      {/* Attendance Upload Modal */}
      {uploadModalOpen && (
        <AttendanceUploadModal
          onClose={() => setUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default AttendanceSummaryPage;
