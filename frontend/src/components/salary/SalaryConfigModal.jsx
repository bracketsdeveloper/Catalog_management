import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { HRMS } from '../../api/hrmsClient';

const SalaryConfigModal = ({ employee, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    employeeId: employee.employeeId,
    salaryOffered: 0,
    dailyWorkHours: 9,
    saturdaysOff: [1, 3],
    sundayOff: true,
    hourlyDeductionRate: 500,
    deductionPeriodDays: 14,
    minDaysForSundayPay: 3,
    pfEnabled: true,
    pfPercentage: 12,
    pfFixedAmount: 0,
    esiEnabled: false,
    esiPercentage: 0.75,
    professionalTaxEnabled: true,
    professionalTaxAmount: 200,
    tdsEnabled: false,
    tdsPercentage: 0,
    paidLeavesPerMonth: 1.5,
    maxCarryForwardLeaves: 30,
    bankName: '',
    bankAccountNumber: '',
    ifscCode: '',
    panNumber: '',
    uanNumber: '',
    notes: ''
  });

  useEffect(() => {
    fetchConfig();
  }, [employee.employeeId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await HRMS.getSalaryConfig(employee.employeeId);
      if (response.data.config) {
        setConfig(prev => ({ ...prev, ...response.data.config }));
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaturdayToggle = (satNum) => {
    setConfig(prev => {
      const current = prev.saturdaysOff || [];
      if (current.includes(satNum)) {
        return { ...prev, saturdaysOff: current.filter(s => s !== satNum) };
      } else {
        return { ...prev, saturdaysOff: [...current, satNum].sort() };
      }
    });
  };

  const handleSave = async () => {
    if (!config.salaryOffered || config.salaryOffered <= 0) {
      toast.error('Please enter a valid salary amount');
      return;
    }

    setSaving(true);
    try {
      await HRMS.saveSalaryConfig(config);
      toast.success('Configuration saved successfully');
      onSave();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Salary Configuration</h2>
              <p className="text-sm text-gray-600">{employee.name} ({employee.employeeId})</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="p-6">
            {/* Salary Details */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Salary Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Salary Offered (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={config.salaryOffered}
                    onChange={(e) => handleChange('salaryOffered', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paid Leaves Per Month
                  </label>
                  <input
                    type="number"
                    value={config.paidLeavesPerMonth}
                    onChange={(e) => handleChange('paidLeavesPerMonth', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Work Schedule */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Work Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Work Hours
                  </label>
                  <input
                    type="number"
                    value={config.dailyWorkHours}
                    onChange={(e) => handleChange('dailyWorkHours', parseFloat(e.target.value) || 9)}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                    max="24"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 9 hours (10 AM to 7 PM)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saturdays Off
                  </label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSaturdayToggle(num)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          config.saturdaysOff?.includes(num)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {num}{num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click to toggle. Default: 1st & 3rd off</p>
                </div>
              </div>
            </div>

            {/* Hourly Deduction Rules */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Hourly Deduction Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deduction Per Hour (₹)
                  </label>
                  <input
                    type="number"
                    value={config.hourlyDeductionRate}
                    onChange={(e) => handleChange('hourlyDeductionRate', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: ₹500/hour</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calculation Period (Days)
                  </label>
                  <input
                    type="number"
                    value={config.deductionPeriodDays}
                    onChange={(e) => handleChange('deductionPeriodDays', parseInt(e.target.value) || 14)}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 14 (bi-weekly)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Days for Sunday Pay
                  </label>
                  <input
                    type="number"
                    value={config.minDaysForSundayPay}
                    onChange={(e) => handleChange('minDaysForSundayPay', parseInt(e.target.value) || 3)}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Days worked around Sunday to get paid</p>
                </div>
              </div>
            </div>

            {/* Statutory Deductions */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Statutory Deductions</h3>
              
              {/* PF */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium text-gray-700">Provident Fund (PF)</label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.pfEnabled}
                      onChange={(e) => handleChange('pfEnabled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
                {config.pfEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">PF Percentage (%)</label>
                      <input
                        type="number"
                        value={config.pfPercentage}
                        onChange={(e) => handleChange('pfPercentage', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded-md px-3 py-2"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Or Fixed Amount (₹)</label>
                      <input
                        type="number"
                        value={config.pfFixedAmount}
                        onChange={(e) => handleChange('pfFixedAmount', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded-md px-3 py-2"
                        min="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ESI */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium text-gray-700">ESI</label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.esiEnabled}
                      onChange={(e) => handleChange('esiEnabled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
                {config.esiEnabled && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ESI Percentage (%)</label>
                    <input
                      type="number"
                      value={config.esiPercentage}
                      onChange={(e) => handleChange('esiPercentage', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-md px-3 py-2 max-w-xs"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                )}
              </div>

              {/* Professional Tax */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium text-gray-700">Professional Tax</label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.professionalTaxEnabled}
                      onChange={(e) => handleChange('professionalTaxEnabled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
                {config.professionalTaxEnabled && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      value={config.professionalTaxAmount}
                      onChange={(e) => handleChange('professionalTaxAmount', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-md px-3 py-2 max-w-xs"
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* TDS */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium text-gray-700">TDS</label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.tdsEnabled}
                      onChange={(e) => handleChange('tdsEnabled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
                {config.tdsEnabled && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">TDS Percentage (%)</label>
                    <input
                      type="number"
                      value={config.tdsPercentage}
                      onChange={(e) => handleChange('tdsPercentage', parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-md px-3 py-2 max-w-xs"
                      min="0"
                      max="100"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Bank & Tax Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={config.bankName || ''}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={config.bankAccountNumber || ''}
                    onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={config.ifscCode || ''}
                    onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={config.panNumber || ''}
                    onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PF UAN Number</label>
                  <input
                    type="text"
                    value={config.uanNumber || ''}
                    onChange={(e) => handleChange('uanNumber', e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={config.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                rows="3"
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t sticky bottom-0 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryConfigModal;