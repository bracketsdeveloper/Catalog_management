import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AttendanceUploadModal from '../components/attendance/AttendanceUploadModal';
import { HRMS, dateUtils } from '../api/hrmsClient';

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

const AttendancePage = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [startDate, setStartDate] = useState(dateUtils.formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [endDate, setEndDate] = useState(dateUtils.formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await HRMS.listEmployees({ limit: 1000 });
      setEmployees(response.data.rows || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchAttendance = async (page = 1) => {
    if (!employeeId) {
      toast.warn('Please select an employee');
      return;
    }

    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        startDate,
        endDate
      };

      const response = await HRMS.getEmployeeAttendance(employeeId, params);
      
      setAttendanceData(response.data.attendance || []);
      setSummary(response.data.summary || null);
      setEmployeeDetails(response.data.employee || null);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAttendance(1);
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.warn('Please select start and end dates');
      return;
    }

    setExportLoading(true);
    try {
      const params = { startDate, endDate };
      if (employeeId) params.employeeId = employeeId;

      const response = await HRMS.exportAttendance(params);
      
      const filename = `Attendance_${startDate}_to_${endDate}${employeeId ? `_${employeeId}` : ''}.xlsx`;
      HRMS.downloadFile(response.data, filename);
      
      toast.success('Export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    } finally {
      setExportLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchAttendance(newPage);
    }
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    toast.success('Attendance uploaded successfully');
    if (employeeId) {
      fetchAttendance();
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('present')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('absent')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('leave')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('wfh')) return 'bg-purple-100 text-purple-800';
    if (statusLower.includes('weeklyoff')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('holiday')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Attendance Management"
        subtitle="Track and manage employee attendance"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Upload Attendance
            </button>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400"
            >
              {exportLoading ? 'Exporting...' : 'Export to Excel'}
            </button>
          </div>
        }
      />

      <FiltersBar>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp.personal.employeeId}>
                {emp.personal.employeeId} - {emp.personal.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSearch}
            disabled={loading || !employeeId}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </FiltersBar>

      {summary && employeeDetails && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Employee</h3>
            <p className="text-xl font-semibold">{employeeDetails.name}</p>
            <p className="text-sm text-gray-600">{employeeDetails.role} • {employeeDetails.department}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Attendance Rate</h3>
            <p className="text-xl font-semibold">{summary.attendanceRate}%</p>
            <p className="text-sm text-gray-600">
              {summary.presentDays} present / {summary.totalDays} days
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Hours</h3>
            <p className="text-xl font-semibold">{summary.totalHours}h</p>
            <p className="text-sm text-gray-600">{summary.totalOT}h overtime</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Absence</h3>
            <p className="text-xl font-semibold">{summary.absentDays} days</p>
            <p className="text-sm text-gray-600">
              {summary.absentDays > 0 ? `${((summary.absentDays / summary.totalDays) * 100).toFixed(1)}% absence` : 'Perfect'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Attendance Records {employeeDetails && `for ${employeeDetails.name}`}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
            <p className="mt-1 text-sm text-gray-500">
              {employeeId ? 'Select dates and search' : 'Select an employee'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">OT Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDisplayDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.dayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.inTime || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.outTime || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.hoursWorked ? `${record.hoursWorked.toFixed(2)}h` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.hoursOT ? `${record.hoursOT.toFixed(2)}h` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
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

            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {uploadModalOpen && (
        <AttendanceUploadModal
          onClose={() => setUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default AttendancePage;