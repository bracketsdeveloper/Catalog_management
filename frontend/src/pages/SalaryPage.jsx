import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { HRMS } from '../api/hrmsClient';
import SalaryConfigModal from '../components/salary/SalaryConfigModal';
import SalaryDetailModal from '../components/salary/Salarydetailmodal';

const SalaryPage = () => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [month, year, selectedDepartment, statusFilter]);

  const fetchEmployees = async () => {
    try {
      const response = await HRMS.listEmployees({ limit: 1000 });
      setEmployees(response.data.rows || []);
      
      // Extract departments
      const deptSet = new Set();
      (response.data.rows || []).forEach(emp => {
        if (emp.org?.department) deptSet.add(emp.org.department);
      });
      setDepartments(Array.from(deptSet).sort());
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (selectedDepartment) params.department = selectedDepartment;
      if (statusFilter) params.status = statusFilter;
      
      const response = await HRMS.getSalaryRecords(params);
      setRecords(response.data.records || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error fetching records:', error);
      // If API doesn't exist yet, show empty
      setRecords([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateAll = async () => {
    if (!window.confirm(`Calculate salary for all employees for ${monthNames[month - 1]} ${year}?`)) {
      return;
    }
    
    setCalculating(true);
    try {
      const response = await HRMS.calculateAllSalaries({
        month,
        year,
        department: selectedDepartment,
        recalculate: false
      });
      
      toast.success(`Calculated: ${response.data.results.success}, Skipped: ${response.data.results.skipped}, Failed: ${response.data.results.failed}`);
      fetchRecords();
    } catch (error) {
      console.error('Error calculating:', error);
      toast.error('Failed to calculate salaries');
    } finally {
      setCalculating(false);
    }
  };

  const handleRecalculateAll = async () => {
    if (!window.confirm(`Recalculate ALL salaries for ${monthNames[month - 1]} ${year}? This will overwrite existing calculations.`)) {
      return;
    }
    
    setCalculating(true);
    try {
      const response = await HRMS.calculateAllSalaries({
        month,
        year,
        department: selectedDepartment,
        recalculate: true
      });
      
      toast.success(`Recalculated: ${response.data.results.success}, Failed: ${response.data.results.failed}`);
      fetchRecords();
    } catch (error) {
      console.error('Error recalculating:', error);
      toast.error('Failed to recalculate salaries');
    } finally {
      setCalculating(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await HRMS.exportSalaryRecords({ month, year });
      
      const filename = `Salary_${monthNames[month - 1]}_${year}.xlsx`;
      HRMS.downloadFile(response.data, filename);
      
      toast.success('Exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    }
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  const handleConfigClick = (employee) => {
    setSelectedEmployee(employee);
    setConfigModalOpen(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      calculated: 'bg-blue-100 text-blue-800',
      reviewed: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const filteredRecords = records.filter(r => 
    r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Salary Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Calculate and manage employee salaries
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button
              onClick={handleCalculateAll}
              disabled={calculating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {calculating ? 'Calculating...' : 'Calculate All'}
            </button>
            <button
              onClick={handleExport}
              disabled={records.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="calculated">Calculated</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name or ID..."
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>
        
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleRecalculateAll}
            disabled={calculating}
            className="px-3 py-1 text-sm border border-orange-500 text-orange-600 rounded hover:bg-orange-50"
          >
            Recalculate All
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Employees</h3>
            <p className="text-2xl font-semibold text-gray-900">{summary.totalEmployees}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Gross</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summary.totalGross)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Deductions</h3>
            <p className="text-2xl font-semibold text-red-600">{formatCurrency(summary.totalDeductions)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Net Payable</h3>
            <p className="text-2xl font-semibold text-green-600">{formatCurrency(summary.totalNet)}</p>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Salary Records - {monthNames[month - 1]} {year}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredRecords.length} records
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No salary records found. Click "Calculate All" to generate.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Days</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Attended</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leaves</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary Offered</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Payable</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr 
                    key={record._id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(record)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{record.employeeName}</div>
                      <div className="text-sm text-gray-500">{record.employeeId}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{record.totalWorkingDays}</td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{record.daysAttended}</div>
                      {record.payLossDays > 0 && (
                        <div className="text-xs text-red-600">-{record.payLossDays} loss</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{record.totalLeavesTaken}</div>
                      <div className="text-xs text-gray-500">{record.paidLeavesUsed} paid</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{record.totalHoursWorked?.toFixed(1)}h</div>
                      {record.hoursShortfall > 0 && (
                        <div className="text-xs text-red-600">-{record.hoursShortfall?.toFixed(1)}h</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatCurrency(record.salaryOffered)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatCurrency(record.grossSalary)}
                    </td>
                    <td className="px-4 py-4 text-sm text-red-600">
                      -{formatCurrency(record.totalDeductions)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(record.netPayable)}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfigClick({ employeeId: record.employeeId, name: record.employeeName });
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Config
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {configModalOpen && selectedEmployee && (
        <SalaryConfigModal
          employee={selectedEmployee}
          onClose={() => {
            setConfigModalOpen(false);
            setSelectedEmployee(null);
          }}
          onSave={() => {
            setConfigModalOpen(false);
            setSelectedEmployee(null);
            fetchRecords();
          }}
        />
      )}

      {/* Detail Modal */}
      {detailModalOpen && selectedRecord && (
        <SalaryDetailModal
          record={selectedRecord}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedRecord(null);
          }}
          onUpdate={() => {
            fetchRecords();
          }}
        />
      )}
    </div>
  );
};

export default SalaryPage;