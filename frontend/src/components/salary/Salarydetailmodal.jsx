import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { HRMS } from '../../api/hrmsClient';

const SalaryDetailModal = ({ record, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [processing, setProcessing] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustment, setAdjustment] = useState({
    description: '',
    amount: 0,
    type: 'deduction'
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this salary record?')) return;
    
    setProcessing(true);
    try {
      await HRMS.approveSalaryRecord(record._id);
      toast.success('Salary approved');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    const paymentRef = window.prompt('Enter payment reference (optional):');
    
    setProcessing(true);
    try {
      await HRMS.markSalaryPaid(record._id, { paymentReference: paymentRef });
      toast.success('Marked as paid');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddAdjustment = async () => {
    if (!adjustment.description || !adjustment.amount) {
      toast.error('Please fill all fields');
      return;
    }

    setProcessing(true);
    try {
      await HRMS.addSalaryAdjustment(record._id, adjustment);
      toast.success('Adjustment added');
      onUpdate();
      setShowAdjustmentForm(false);
      setAdjustment({ description: '', amount: 0, type: 'deduction' });
    } catch (error) {
      toast.error('Failed to add adjustment');
    } finally {
      setProcessing(false);
    }
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
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || styles.draft}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{record.employeeName}</h2>
              <p className="text-sm text-gray-600">
                {record.employeeId} • {monthNames[record.month - 1]} {record.year}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(record.status)}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b">
          <div className="flex gap-4">
            {['summary', 'days', 'hours', 'deductions', 'actions'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Key Figures */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Salary Offered</p>
                  <p className="text-2xl font-bold text-blue-800">{formatCurrency(record.salaryOffered)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Gross Salary</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(record.grossSalary)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-800">-{formatCurrency(record.totalDeductions)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600">Net Payable</p>
                  <p className="text-2xl font-bold text-purple-800">{formatCurrency(record.netPayable)}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Days in Month</p>
                  <p className="text-lg font-semibold">{record.daysInMonth}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Working Days</p>
                  <p className="text-lg font-semibold">{record.totalWorkingDays}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Days Attended</p>
                  <p className="text-lg font-semibold">{record.daysAttended}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Days to Pay</p>
                  <p className="text-lg font-semibold">{record.daysToBePaidFor}</p>
                </div>
              </div>

              {/* Salary Calculation */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Salary Calculation</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600">Salary Offered</td>
                      <td className="py-2 text-right">{formatCurrency(record.salaryOffered)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600">÷ Days in Month</td>
                      <td className="py-2 text-right">{record.daysInMonth}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600">= Per Day Salary</td>
                      <td className="py-2 text-right">{formatCurrency(record.perDaySalary)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-600">× Days to Pay</td>
                      <td className="py-2 text-right">{record.daysToBePaidFor}</td>
                    </tr>
                    <tr className="border-b bg-green-50">
                      <td className="py-2 font-medium">= Gross Salary</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(record.grossSalary)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-red-600">- Deductions</td>
                      <td className="py-2 text-right text-red-600">{formatCurrency(record.totalDeductions)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-green-600">+ Additions</td>
                      <td className="py-2 text-right text-green-600">{formatCurrency(record.totalAdditions)}</td>
                    </tr>
                    <tr className="bg-purple-50">
                      <td className="py-2 font-bold text-lg">Net Payable</td>
                      <td className="py-2 text-right font-bold text-lg">{formatCurrency(record.netPayable)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Days Tab */}
          {activeTab === 'days' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Days in Month</p>
                  <p className="text-2xl font-bold">{record.daysInMonth}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Sundays</p>
                  <p className="text-2xl font-bold">{record.sundaysInMonth}</p>
                  <p className="text-xs text-green-600">{record.sundaysPaid} paid (3-day rule)</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Saturdays Off</p>
                  <p className="text-2xl font-bold">{record.saturdaysOff}</p>
                  <p className="text-xs text-gray-500">{record.saturdaysWorking} working</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Public Holidays</p>
                  <p className="text-2xl font-bold">{record.publicHolidays}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Restricted Holidays</p>
                  <p className="text-2xl font-bold">{record.restrictedHolidays}</p>
                </div>
                <div className="border rounded-lg p-4 bg-blue-50">
                  <p className="text-sm text-blue-600">Total Working Days</p>
                  <p className="text-2xl font-bold text-blue-800">{record.totalWorkingDays}</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Attendance Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4 bg-green-50">
                    <p className="text-sm text-green-600">Days Attended</p>
                    <p className="text-2xl font-bold text-green-800">{record.daysAttended}</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <p className="text-sm text-blue-600">Total Leaves</p>
                    <p className="text-2xl font-bold text-blue-800">{record.totalLeavesTaken}</p>
                    <p className="text-xs">{record.paidLeavesUsed} paid / {record.unpaidLeaves} unpaid</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-red-50">
                    <p className="text-sm text-red-600">Pay Loss Days</p>
                    <p className="text-2xl font-bold text-red-800">{record.payLossDays}</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-purple-50">
                    <p className="text-sm text-purple-600">Days to Pay</p>
                    <p className="text-2xl font-bold text-purple-800">{record.daysToBePaidFor}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-600">
                  <strong>Days to Pay Formula:</strong> Days Attended ({record.daysAttended}) + 
                  Paid Leaves ({record.paidLeavesUsed}) + 
                  Sundays Paid ({record.sundaysPaid}) + 
                  Public Holidays ({record.publicHolidays}) + 
                  Restricted Holidays ({record.restrictedHolidays}) = 
                  <strong className="text-blue-600"> {record.daysToBePaidFor}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Hours Tab */}
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Hours per Day</p>
                  <p className="text-2xl font-bold">{record.expectedWorkHoursPerDay}h</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500">Expected Hours</p>
                  <p className="text-2xl font-bold">{record.totalExpectedHours}h</p>
                </div>
                <div className="border rounded-lg p-4 bg-green-50">
                  <p className="text-sm text-green-600">Hours Worked</p>
                  <p className="text-2xl font-bold text-green-800">{record.totalHoursWorked?.toFixed(1)}h</p>
                </div>
                <div className="border rounded-lg p-4 bg-red-50">
                  <p className="text-sm text-red-600">Hours Shortfall</p>
                  <p className="text-2xl font-bold text-red-800">{record.hoursShortfall?.toFixed(1)}h</p>
                </div>
              </div>

              {/* Bi-weekly Breakdown */}
              {record.biWeeklyCalculations && record.biWeeklyCalculations.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="font-medium">Bi-Weekly Breakdown</h4>
                    <p className="text-xs text-gray-500">Hour shortfall deductions are calculated per 2-week period</p>
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Expected</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actual</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Shortfall</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Deduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.biWeeklyCalculations.map((period, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 text-sm">
                            Week {period.weekNumber}
                            <span className="text-xs text-gray-500 block">
                              {new Date(period.periodStart).toLocaleDateString()} - {new Date(period.periodEnd).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{period.expectedHours}h</td>
                          <td className="px-4 py-2 text-sm text-right text-green-600">{period.actualHours}h</td>
                          <td className="px-4 py-2 text-sm text-right text-red-600">
                            {period.hoursShortfall > 0 ? `-${period.hoursShortfall}h` : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-red-600">
                            {period.deductionAmount > 0 ? formatCurrency(period.deductionAmount) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-2 font-medium" colSpan="4">Total Hourly Deduction</td>
                        <td className="px-4 py-2 text-right font-bold text-red-600">
                          {formatCurrency(record.deductions?.hourlyDeduction)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Deduction Rate:</strong> ₹{record.deductions?.hourlyDeductionRate || 500} per hour of shortfall
                </p>
              </div>
            </div>
          )}

          {/* Deductions Tab */}
          {activeTab === 'deductions' && (
            <div className="space-y-4">
              {/* Deductions */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2 border-b">
                  <h4 className="font-medium text-red-800">Deductions</h4>
                </div>
                <table className="w-full">
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Hourly Shortfall Deduction</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.hourlyDeduction)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Pay Loss Deduction</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.payLossDeduction)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">PF Deduction</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.pfDeduction)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">ESI Deduction</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.esiDeduction)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Professional Tax</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.professionalTax)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">TDS</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.tdsDeduction)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Damages</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.damages)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Advance Recovery</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.advanceSalaryRecovery)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Other Deductions</td>
                      <td className="px-4 py-2 text-sm text-right text-red-600">
                        -{formatCurrency(record.deductions?.otherDeductions)}
                      </td>
                    </tr>
                    <tr className="border-t bg-red-100">
                      <td className="px-4 py-2 font-bold">Total Deductions</td>
                      <td className="px-4 py-2 text-right font-bold text-red-700">
                        -{formatCurrency(record.totalDeductions)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Additions */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b">
                  <h4 className="font-medium text-green-800">Additions</h4>
                </div>
                <table className="w-full">
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Incentive</td>
                      <td className="px-4 py-2 text-sm text-right text-green-600">
                        +{formatCurrency(record.additions?.incentive)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Bonus</td>
                      <td className="px-4 py-2 text-sm text-right text-green-600">
                        +{formatCurrency(record.additions?.bonus)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Overtime Pay</td>
                      <td className="px-4 py-2 text-sm text-right text-green-600">
                        +{formatCurrency(record.additions?.overtimePay)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-2 text-sm">Reimbursements</td>
                      <td className="px-4 py-2 text-sm text-right text-green-600">
                        +{formatCurrency(record.additions?.reimbursements)}
                      </td>
                    </tr>
                    <tr className="border-t bg-green-100">
                      <td className="px-4 py-2 font-bold">Total Additions</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700">
                        +{formatCurrency(record.totalAdditions)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Manual Adjustments */}
              {record.manualAdjustments && record.manualAdjustments.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-yellow-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-yellow-800">Manual Adjustments</h4>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {record.manualAdjustments.map((adj, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 text-sm">{adj.description}</td>
                          <td className={`px-4 py-2 text-sm text-right ${
                            adj.type === 'addition' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {adj.type === 'addition' ? '+' : '-'}{formatCurrency(adj.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-6">
              {/* Status Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Current Status: {getStatusBadge(record.status)}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {record.calculatedAt && (
                    <p>Calculated: {new Date(record.calculatedAt).toLocaleString()}</p>
                  )}
                  {record.approvedAt && (
                    <p>Approved: {new Date(record.approvedAt).toLocaleString()}</p>
                  )}
                  {record.paidAt && (
                    <p>Paid: {new Date(record.paidAt).toLocaleString()}</p>
                  )}
                  {record.paymentReference && (
                    <p>Payment Ref: {record.paymentReference}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {record.status === 'calculated' && (
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
                  >
                    Approve Salary
                  </button>
                )}
                
                {record.status === 'approved' && (
                  <button
                    onClick={handleMarkPaid}
                    disabled={processing}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300"
                  >
                    Mark as Paid
                  </button>
                )}
                
                <button
                  onClick={() => setShowAdjustmentForm(!showAdjustmentForm)}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                >
                  Add Adjustment
                </button>
              </div>

              {/* Adjustment Form */}
              {showAdjustmentForm && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add Manual Adjustment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={adjustment.description}
                        onChange={(e) => setAdjustment({ ...adjustment, description: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                        placeholder="e.g., Performance bonus"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={adjustment.amount}
                        onChange={(e) => setAdjustment({ ...adjustment, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full border rounded-md px-3 py-2"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={adjustment.type}
                        onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}
                        className="w-full border rounded-md px-3 py-2"
                      >
                        <option value="addition">Addition</option>
                        <option value="deduction">Deduction</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleAddAdjustment}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAdjustmentForm(false)}
                      className="px-4 py-2 border rounded-md hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-900">
            Net Payable: {formatCurrency(record.netPayable)}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryDetailModal;