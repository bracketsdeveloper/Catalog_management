import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { HRMS, dateUtils } from '../api/hrmsClient';
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

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [month, year, department, role]);

  // Helper function to calculate working days up to today
  const calculateWorkingDaysTillToday = (month, year) => {
    const today = new Date();
    const currentMonth = month - 1; // JavaScript months are 0-indexed
    const currentYear = year;
    
    // If we're not in the current month/year, return null (use full month)
    if (today.getMonth() + 1 !== month || today.getFullYear() !== year) {
      return null;
    }
    
    let workingDays = 0;
    const todayDate = today.getDate();
    
    // Count working days from 1st to today
    for (let day = 1; day <= todayDate; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  const fetchFilters = async () => {
    try {
      const response = await HRMS.listEmployees({ limit: 1000 });
      const employees = response.data.rows || [];
      
      // Extract unique departments and roles
      const deptSet = new Set();
      const roleSet = new Set();
      
      employees.forEach(emp => {
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
      
      // Get today's date for calculating working days till today
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      // Calculate working days till today for current month
      const workingDaysTillToday = calculateWorkingDaysTillToday(month, year);
      
      // Process the data to calculate correct attendance rates
      const processedData = rawData.map(employee => {
        const summary = { ...employee.summary };
        
        // If we're viewing the current month and have calculated working days till today
        if (month === currentMonth && year === currentYear && workingDaysTillToday) {
          // Calculate attendance rate based on working days up to today
          summary.attendanceRate = workingDaysTillToday > 0 
            ? parseFloat(((summary.presentDays / workingDaysTillToday) * 100).toFixed(2))
            : 0;
          
          // Add workingDaysTillToday to summary for display
          summary.workingDaysTillToday = workingDaysTillToday;
        }
        
        return {
          ...employee,
          summary
        };
      });
      
      setSummaryData(processedData);
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
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const filteredData = summaryData.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filteredData].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortConfig.key === 'attendanceRate') {
        return sortConfig.direction === 'asc' 
          ? a.summary.attendanceRate - b.summary.attendanceRate
          : b.summary.attendanceRate - a.summary.attendanceRate;
      }
      if (sortConfig.key === 'totalHours') {
        return sortConfig.direction === 'asc' 
          ? a.summary.totalHours - b.summary.totalHours
          : b.summary.totalHours - a.summary.totalHours;
      }
      return 0;
    });
  };

  const getStatusColor = (rate) => {
    if (rate >= 90) return 'bg-green-100 text-green-800';
    if (rate >= 75) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    toast.success('Attendance uploaded successfully');
    fetchSummary(); // Refresh the summary data
  };

  const sortedData = getSortedData();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Attendance Summary"
        subtitle={`${monthNames[month - 1]} ${year} - ${summaryData.length} employees${
          isCurrentMonth ? ' (Till Today)' : ''
        }`}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
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
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Employee
                      {sortConfig.key === 'name' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
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
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('attendanceRate')}
                  >
                    <div className="flex items-center gap-1">
                      Attendance Rate
                      {sortConfig.key === 'attendanceRate' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OT Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                      {employee.department || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.role || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.summary.presentDays}
                      </div>
                      <div className="text-xs text-gray-500">
                        {/* Show working days based on current month vs today */}
                        {isCurrentMonth && employee.summary.workingDaysTillToday ? (
                          <>/{employee.summary.workingDaysTillToday} working days till today</>
                        ) : (
                          <>/{employee.summary.workingDays} working days this month</>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.summary.totalHours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.summary.expectedHours}h expected
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${getAttendanceRateColor(employee.summary.attendanceRate)}`}>
                        {employee.summary.attendanceRate}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Utilization: {employee.summary.utilizationRate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {employee.summary.totalOT.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(employee.summary.attendanceRate)}`}>
                        {employee.summary.attendanceRate >= 90 ? 'Excellent' :
                         employee.summary.attendanceRate >= 75 ? 'Good' : 'Needs Attention'}
                      </span>
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

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing {sortedData.length} of {summaryData.length} employees
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-medium">Overall Attendance:</span>{' '}
                {summaryData.length > 0 ? 
                  (summaryData.reduce((sum, emp) => sum + emp.summary.attendanceRate, 0) / summaryData.length).toFixed(2) 
                  : 0}%
                {isCurrentMonth && ' (Till Today)'}
              </div>
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
          onDataUpdate={() => {
            fetchSummary();
          }}
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