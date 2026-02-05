// client/src/pages/AttendanceSummaryPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { HRMS } from "../api/hrmsClient";
import EmployeeCalendarModal from "../components/attendance/EmployeeCalendarModal";
import AttendanceUploadModal from "../components/attendance/AttendanceUploadModal";

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
  </div>
);

// Helper function to convert decimal hours to hh:mm format
const formatHoursToHHMM = (decimalHours) => {
  if (!decimalHours && decimalHours !== 0) return "00:00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

// month number -> label used in Employee.leaveMonthlyAllocation
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const AttendanceSummaryPage = () => {
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [searchTerm, setSearchTerm] = useState("");

  const [holidays, setHolidays] = useState([]);

  // ✅ NEW: map of employeeId -> leaveMonthlyAllocation[]
  const [leaveAllocMap, setLeaveAllocMap] = useState(new Map());

  useEffect(() => {
    fetchFilters(); // still used for departments/roles dropdowns
    fetchHolidays();
    // ✅ NEW: also fetch employee leave allocation map
    fetchEmployeeLeaveAllocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, department, role, holidays, leaveAllocMap]);

  const fetchHolidays = async () => {
    try {
      const response = HRMS.getHolidays
        ? await HRMS.getHolidays({ month, year })
        : await HRMS.listHolidays({ month, year });

      const data = response?.data?.rows || response?.data || [];
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching holidays:", error);
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
      return hd.getMonth() === currentMonthIndex && hd.getFullYear() === year && h.type !== "RESTRICTED";
    });

    const holidayDates = new Set(monthHolidays.map((h) => new Date(h.date).getDate()));

    let workingDays = 0;
    for (let day = 1; day <= todayDate; day++) {
      const d = new Date(year, currentMonthIndex, day);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      if (holidayDates.has(day)) continue;
      workingDays++;
    }

    return workingDays;
  };

  // Helper: total working days in month
  const getTotalWorkingDaysInMonth = (month, year) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthIndex = month - 1;

    const monthHolidays = holidays.filter((h) => {
      const hd = new Date(h.date);
      return hd.getMonth() === monthIndex && hd.getFullYear() === year && h.type !== "RESTRICTED";
    });

    const holidayDates = new Set(monthHolidays.map((h) => new Date(h.date).getDate()));

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
      const employees = response?.data?.rows || [];
      const deptSet = new Set();
      const roleSet = new Set();

      employees.forEach((emp) => {
        if (emp.org?.department) deptSet.add(emp.org.department);
        if (emp.org?.role) roleSet.add(emp.org.role);
      });

      setDepartments(Array.from(deptSet).sort());
      setRoles(Array.from(roleSet).sort());
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  // ✅ NEW: fetch leave allocations once (employeeId -> leaveMonthlyAllocation array)
  const fetchEmployeeLeaveAllocations = async () => {
    try {
      // IMPORTANT: backend must include leaveMonthlyAllocation in listEmployees projection
      const resp = await HRMS.listEmployees({ limit: 2000 });
      const rows = resp?.data?.rows || [];

      const map = new Map();
      for (const emp of rows) {
        const empId = String(emp?.personal?.employeeId || emp?.employeeId || "").trim();
        if (!empId) continue;

        // try multiple shapes just in case
        const alloc =
          emp.leaveMonthlyAllocation ||
          emp?.leaveMonthlyAllocation ||
          emp?.employee?.leaveMonthlyAllocation ||
          null;

        if (Array.isArray(alloc)) {
          map.set(empId, alloc);
        }
      }
      setLeaveAllocMap(map);
    } catch (e) {
      console.error("Failed to fetch employee leave allocations:", e);
      setLeaveAllocMap(new Map());
    }
  };

  // ✅ get allocation for a given employeeId + selected month
  const getAllocForEmpMonth = (employeeId, monthNumber) => {
    const empId = String(employeeId || "").trim();
    const arr = leaveAllocMap.get(empId);
    if (!Array.isArray(arr) || !arr.length) return { sick: 0, earned: 0, special: 0 };

    const label = MONTH_LABELS[monthNumber - 1];
    const row = arr.find((x) => String(x?.month || "").trim() === label);
    if (!row) return { sick: 0, earned: 0, special: 0 };

    return {
      sick: Number.isFinite(+row.sick) ? +row.sick : 0,
      earned: Number.isFinite(+row.earned) ? +row.earned : 0,
      special: Number.isFinite(+row.special) ? +row.special : 0,
    };
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (department) params.department = department;
      if (role) params.role = role;

      const response = await HRMS.getAttendanceSummaryAll(params);
      const rawData = response?.data?.results || [];

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      let displayWorkingDays = 0;
      let isTillToday = false;

      if (month === currentMonth && year === currentYear) {
        displayWorkingDays = calculateWorkingDaysTillToday(month, year) || 0;
        isTillToday = true;
      } else if (month < currentMonth || year < currentYear) {
        displayWorkingDays = getTotalWorkingDaysInMonth(month, year);
        isTillToday = false;
      } else {
        displayWorkingDays = 0;
        isTillToday = false;
      }

      const daysInMonth = new Date(year, month, 0).getDate();

      const processed = rawData.map((employee) => {
        const summary = { ...employee.summary };

        // Total Working Days
        const totalWorkingDays = displayWorkingDays;

        // Days Attended
        const daysAttended = Number(summary.presentDays || 0);

        // Total Leaves Taken
        const totalLeavesTaken = Math.max(0, totalWorkingDays - daysAttended);

        // ✅ THIS IS THE CHANGE: use per-employee monthly allocation (NOT Leave applications)
        const alloc = getAllocForEmpMonth(employee.employeeId, month);

        const sickLeaves = Number(alloc.sick || 0);
        const earnedLeaves = Number(alloc.earned || 0);
        const specialLeaves = Number(alloc.special || 0);

        const totalPaidLeaves = Math.max(0, sickLeaves + earnedLeaves + specialLeaves);

        // Pay Loss Days
        const payLossDays = Math.max(0, totalLeavesTaken - totalPaidLeaves);

        // Expected hours
        const dailyHours = Number(summary.dailyHours || summary.dailyWorkHours || 9);
        const expectedHours = totalWorkingDays * dailyHours;

        // Worked hours
        const hoursWorked = Number(summary.totalHours || 0);

        // To be paid for
        const toBePaidFor = daysAttended + totalPaidLeaves;

        summary.daysInMonth = daysInMonth;
        summary.totalWorkingDays = totalWorkingDays;
        summary.daysAttended = daysAttended;
        summary.totalLeavesTaken = totalLeavesTaken;

        // ✅ expose allocation-based paid leave breakdown
        summary.sickLeaves = sickLeaves;
        summary.earnedLeaves = earnedLeaves;
        summary.specialLeaves = specialLeaves;
        summary.paidLeaves = totalPaidLeaves;

        summary.payLossDays = payLossDays;
        summary.expectedHours = expectedHours;
        summary.hoursWorked = hoursWorked;
        summary.toBePaidFor = toBePaidFor;

        summary.formattedExpectedHours = formatHoursToHHMM(expectedHours);
        summary.formattedWorkedHours = formatHoursToHHMM(hoursWorked);

        summary.isTillToday = isTillToday;
        summary.workingDaysLabel = isTillToday
          ? `${displayWorkingDays} working days till today`
          : month < currentMonth || year < currentYear
          ? `${displayWorkingDays} working days this month`
          : "Future month - no working days yet";

        return { ...employee, summary };
      });

      setSummaryData(processed);
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to load attendance summary");
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
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const filtered = summaryData.filter((emp) => {
      const name = String(emp.name || "").toLowerCase();
      const id = String(emp.employeeId || "").toLowerCase();
      const dept = String(emp.department || "").toLowerCase();
      const q = searchTerm.toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (sortConfig.key === "name") {
        return sortConfig.direction === "asc"
          ? String(a.name || "").localeCompare(String(b.name || ""))
          : String(b.name || "").localeCompare(String(a.name || ""));
      }
      if (sortConfig.key === "hoursWorked") {
        const ah = Number(a.summary?.hoursWorked || 0);
        const bh = Number(b.summary?.hoursWorked || 0);
        return sortConfig.direction === "asc" ? ah - bh : bh - ah;
      }
      if (sortConfig.key === "toBePaidFor") {
        const av = Number(a.summary?.toBePaidFor || 0);
        const bv = Number(b.summary?.toBePaidFor || 0);
        return sortConfig.direction === "asc" ? av - bv : bv - av;
      }
      return 0;
    });
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    toast.success("Attendance uploaded successfully");
    fetchSummary();
  };

  const getHolidayCount = () =>
    holidays.filter((h) => {
      const d = new Date(h.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year && h.type !== "RESTRICTED";
    }).length;

  const sortedData = useMemo(() => getSortedData(), [summaryData, searchTerm, sortConfig]);

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
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
          isCurrentMonth ? " (Till Today)" : isPastMonth ? "" : " (Future Month)"
        }${holidayCount > 0 ? ` • ${holidayCount} holiday${holidayCount > 1 ? "s" : ""}` : ""}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/admin-dashboard/hrms/attendance")}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
            >
              Individual View
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
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
              <option key={index} value={index + 1}>
                {name}
              </option>
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
              <option key={y} value={y}>
                {y}
              </option>
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
              <option key={dept} value={dept}>
                {dept}
              </option>
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
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </FiltersBar>

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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Employee Name
                      {sortConfig.key === "name" && <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>}
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
                    onClick={() => handleSort("hoursWorked")}
                  >
                    <div className="flex items-center gap-1">
                      Hours Worked
                      {sortConfig.key === "hoursWorked" && <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </th>

                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("toBePaidFor")}
                  >
                    <div className="flex items-center gap-1">
                      To be paid for
                      {sortConfig.key === "toBePaidFor" && <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>}
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

                    <td className="px-6 py-4 text-sm text-gray-900">{employee.summary.daysInMonth}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{employee.summary.totalWorkingDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{employee.summary.daysAttended}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{employee.summary.totalLeavesTaken}</td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{employee.summary.paidLeaves}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-4">
                        <div>Sick: {employee.summary.sickLeaves}</div>
                        <div>Earned: {employee.summary.earnedLeaves}</div>
                        <div>Special: {employee.summary.specialLeaves}</div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">{employee.summary.payLossDays}</td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.formattedExpectedHours}h
                      <div className="text-xs text-gray-500">
                        {Number(employee.summary.dailyHours || employee.summary.dailyWorkHours || 9)}h/day
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">{employee.summary.formattedWorkedHours}h</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{employee.summary.toBePaidFor}</td>

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

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {sortedData.length} of {summaryData.length} employees
            </div>
          </div>
        </div>
      )}

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
