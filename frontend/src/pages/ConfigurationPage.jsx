import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { HRMS } from '../api/hrmsClient';

const ConfigurationPage = () => {
  const [companyConfig, setCompanyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    fetchCompanyConfig();
    fetchDepartments();
  }, []);

  const fetchCompanyConfig = async () => {
    setLoading(true);
    try {
      const response = await HRMS.getCompanyConfig();
      setCompanyConfig(response.data.config);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await HRMS.listEmployees({ limit: 1000 });
      const deptSet = new Set();
      (response.data.rows || []).forEach(emp => {
        if (emp.org?.department) deptSet.add(emp.org.department);
      });
      setDepartments(Array.from(deptSet).sort());
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await HRMS.updateCompanyConfig(companyConfig);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = async () => {
    if (!window.confirm('Apply this configuration to ALL employees? This will override their individual settings.')) {
      return;
    }
    
    try {
      const response = await HRMS.applyConfigToAll({
        overrideExisting: true,
        department: selectedDepartment || null
      });
      
      toast.success(`Applied to ${response.data.results.updated} employees`);
    } catch (error) {
      console.error('Error applying config:', error);
      toast.error('Failed to apply configuration');
    }
  };

  const handleChange = (path, value) => {
    const keys = path.split('.');
    setCompanyConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const handleAddWeekendTier = () => {
    const newTier = {
      minExcessDays: 0,
      maxExcessDays: 0,
      sundaysDeducted: 0,
      description: ''
    };
    
    setCompanyConfig(prev => ({
      ...prev,
      leavePolicy: {
        ...prev.leavePolicy,
        weekendDeductionTiers: [...prev.leavePolicy.weekendDeductionTiers, newTier]
      }
    }));
  };

  const handleRemoveWeekendTier = (index) => {
    setCompanyConfig(prev => ({
      ...prev,
      leavePolicy: {
        ...prev.leavePolicy,
        weekendDeductionTiers: prev.leavePolicy.weekendDeductionTiers.filter((_, i) => i !== index)
      }
    }));
  };

  const handleAddDepartmentWeightage = () => {
    const newWeightage = {
      department: '',
      revenueWeightage: 80,
      attendanceWeightage: 20
    };
    
    setCompanyConfig(prev => ({
      ...prev,
      incentives: {
        ...prev.incentives,
        departmentWeightage: [...prev.incentives.departmentWeightage, newWeightage]
      }
    }));
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!companyConfig) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Configuration not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Salary Configuration</h1>
            <p className="mt-1 text-sm text-gray-600">
              Company-wide salary and attendance policy settings
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Version: {companyConfig.version || '1.0'}
            </div>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={handleApplyToAll}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Apply to All
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-4 overflow-x-auto">
          {[
            { id: 'attendance', label: 'Attendance' },
            { id: 'leaves', label: 'Leaves' },
            { id: 'deductions', label: 'Deductions' },
            { id: 'wfh', label: 'WFH Policy' },
            { id: 'incentives', label: 'Incentives' },
            { id: 'statutory', label: 'Statutory' },
            { id: 'salary', label: 'Salary Structure' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Department Filter for Apply */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Apply Configuration to Department (Optional)
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full max-w-xs border rounded-md px-3 py-2"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-2">
            Leave empty to apply to all employees. Warning: This will override individual settings.
          </p>
        </div>

        {/* Attendance Settings */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Attendance Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Work Hours
                </label>
                <input
                  type="number"
                  value={companyConfig.attendanceSettings?.dailyWorkHours || 9}
                  onChange={(e) => handleChange('attendanceSettings.dailyWorkHours', parseFloat(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="1"
                  max="24"
                />
                <p className="text-xs text-gray-500 mt-1">Standard: 9 hours (10 AM to 7 PM)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standard Start Time
                </label>
                <input
                  type="text"
                  value={companyConfig.attendanceSettings?.standardStartTime || '10:00'}
                  onChange={(e) => handleChange('attendanceSettings.standardStartTime', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="HH:MM"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standard End Time
                </label>
                <input
                  type="text"
                  value={companyConfig.attendanceSettings?.standardEndTime || '19:00'}
                  onChange={(e) => handleChange('attendanceSettings.standardEndTime', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="HH:MM"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saturdays Off Pattern
                </label>
                <select
                  value={companyConfig.saturdaysPattern || '1st_3rd'}
                  onChange={(e) => handleChange('saturdaysPattern', e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="1st_3rd">1st & 3rd Saturdays</option>
                  <option value="2nd_4th">2nd & 4th Saturdays</option>
                  <option value="all">All Saturdays</option>
                  <option value="none">No Saturdays Off</option>
                </select>
              </div>
            </div>
            
            {/* 99-Hour Rule Settings */}
            <div className="mt-8 pt-6 border-t">
              <h4 className="text-md font-medium text-gray-900 mb-4">99-Hour Rule Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bi-Weekly Target Hours
                  </label>
                  <input
                    type="number"
                    value={companyConfig.biWeeklyRule?.targetHours || 99}
                    onChange={(e) => handleChange('biWeeklyRule.targetHours', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                    max="336" // 24*14
                  />
                  <p className="text-xs text-gray-500 mt-1">Target hours per 2 weeks (11 working days × 9 hours)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grace Period Hours
                  </label>
                  <input
                    type="number"
                    value={companyConfig.biWeeklyRule?.gracePeriodHours || 2}
                    onChange={(e) => handleChange('biWeeklyRule.gracePeriodHours', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="24"
                  />
                  <p className="text-xs text-gray-500 mt-1">No deduction for first N hours of shortfall</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deduction per Hour (₹)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.biWeeklyRule?.deductionPerHour || 500}
                    onChange={(e) => handleChange('biWeeklyRule.deductionPerHour', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deduction for each hour beyond grace period</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leave Settings */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Leave Policy</h3>
            
            {/* Sick Leave */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Sick Leave (SL)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days per Month
                  </label>
                  <input
                    type="number"
                    value={companyConfig.leavePolicy?.sickLeave?.perMonth || 1}
                    onChange={(e) => handleChange('leavePolicy.sickLeave.perMonth', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.leavePolicy?.sickLeave?.nonCumulative || true}
                      onChange={(e) => handleChange('leavePolicy.sickLeave.nonCumulative', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Non-cumulative (expires monthly)</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.leavePolicy?.sickLeave?.cannotBeBundled || true}
                      onChange={(e) => handleChange('leavePolicy.sickLeave.cannotBeBundled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Cannot be bundled with other leaves</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Earned Leave */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Earned Leave (EL)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days per 20 Working Days
                  </label>
                  <input
                    type="number"
                    value={companyConfig.leavePolicy?.earnedLeave?.per20WorkingDays || 1.25}
                    onChange={(e) => handleChange('leavePolicy.earnedLeave.per20WorkingDays', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    step="0.25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Carry Forward Days
                  </label>
                  <input
                    type="number"
                    value={companyConfig.leavePolicy?.earnedLeave?.maxCarryForward || 30}
                    onChange={(e) => handleChange('leavePolicy.earnedLeave.maxCarryForward', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.leavePolicy?.earnedLeave?.encashAtYearEnd || true}
                      onChange={(e) => handleChange('leavePolicy.earnedLeave.encashAtYearEnd', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Encash excess at year end</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.leavePolicy?.earnedLeave?.requires7DaysNotice || true}
                      onChange={(e) => handleChange('leavePolicy.earnedLeave.requires7DaysNotice', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Requires 7 days notice</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Special Leaves */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Special Leaves (Compassionate)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Death in Immediate Family
                  </label>
                  <input
                    type="number"
                    value={companyConfig.leavePolicy?.specialLeaves?.deathInFamily || 10}
                    onChange={(e) => handleChange('leavePolicy.specialLeaves.deathInFamily', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Self Marriage
                  </label>
                  <input
                    type="number"
                    value={companyConfig.leavePolicy?.specialLeaves?.selfMarriage || 2}
                    onChange={(e) => handleChange('leavePolicy.specialLeaves.selfMarriage', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
              </div>
            </div>
            
            {/* Holidays */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Holidays</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compulsory Holidays per Year
                  </label>
                  <input
                    type="number"
                    value={companyConfig.leavePolicy?.holidays?.compulsoryPerYear || 10}
                    onChange={(e) => handleChange('leavePolicy.holidays.compulsoryPerYear', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restricted Holidays per Year
                  </label>
                  <input
                    type="number"
                    value={companyConfig.leavePolicy?.holidays?.restrictedPerYear || 2}
                    onChange={(e) => handleChange('leavePolicy.holidays.restrictedPerYear', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.leavePolicy?.holidays?.canConvertToEL || true}
                      onChange={(e) => handleChange('leavePolicy.holidays.canConvertToEL', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Can convert unused to EL</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Weekend Deduction Tiers */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Weekend Deduction Tiers</h4>
                <button
                  onClick={handleAddWeekendTier}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Tier
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Tiered deduction for Sundays based on excess leaves beyond available balance
              </p>
              
              <div className="space-y-4">
                {companyConfig.leavePolicy?.weekendDeductionTiers?.map((tier, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 bg-white rounded border">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Excess Days</label>
                      <input
                        type="number"
                        value={tier.minExcessDays}
                        onChange={(e) => {
                          const newTiers = [...companyConfig.leavePolicy.weekendDeductionTiers];
                          newTiers[index].minExcessDays = parseInt(e.target.value);
                          handleChange('leavePolicy.weekendDeductionTiers', newTiers);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Excess Days</label>
                      <input
                        type="number"
                        value={tier.maxExcessDays}
                        onChange={(e) => {
                          const newTiers = [...companyConfig.leavePolicy.weekendDeductionTiers];
                          newTiers[index].maxExcessDays = parseInt(e.target.value);
                          handleChange('leavePolicy.weekendDeductionTiers', newTiers);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sundays Deducted</label>
                      <input
                        type="number"
                        value={tier.sundaysDeducted}
                        onChange={(e) => {
                          const newTiers = [...companyConfig.leavePolicy.weekendDeductionTiers];
                          newTiers[index].sundaysDeducted = parseInt(e.target.value);
                          handleChange('leavePolicy.weekendDeductionTiers', newTiers);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <input
                        type="text"
                        value={tier.description || ''}
                        onChange={(e) => {
                          const newTiers = [...companyConfig.leavePolicy.weekendDeductionTiers];
                          newTiers[index].description = e.target.value;
                          handleChange('leavePolicy.weekendDeductionTiers', newTiers);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="e.g., No weekend deduction"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => handleRemoveWeekendTier(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>Example tiers from policy:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>0-2 excess days: No deduction</li>
                  <li>3-4 excess days: 1 Sunday deduction</li>
                  <li>5-6 excess days: 2 Sundays deduction</li>
                  <li>7+ excess days: All Sundays deduction (LOP for weekends)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* WFH Policy */}
        {activeTab === 'wfh' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Work From Home Policy</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emergency WFH */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Emergency WFH</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={companyConfig.wfhPolicy?.emergencyWFH?.salaryPercentage || 75}
                      onChange={(e) => handleChange('wfhPolicy.emergencyWFH.salaryPercentage', parseFloat(e.target.value))}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Salary credited for emergency WFH days</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deduction Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={companyConfig.wfhPolicy?.emergencyWFH?.deductionPercentage || 25}
                      onChange={(e) => handleChange('wfhPolicy.emergencyWFH.deductionPercentage', parseFloat(e.target.value))}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Deduction from daily rate</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Example:</strong> Hospitalization of dependent, urgent family travel</p>
                  </div>
                </div>
              </div>
              
              {/* Casual WFH */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Casual WFH</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={companyConfig.wfhPolicy?.casualWFH?.salaryPercentage || 50}
                      onChange={(e) => handleChange('wfhPolicy.casualWFH.salaryPercentage', parseFloat(e.target.value))}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deduction Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={companyConfig.wfhPolicy?.casualWFH?.deductionPercentage || 50}
                      onChange={(e) => handleChange('wfhPolicy.casualWFH.deductionPercentage', parseFloat(e.target.value))}
                      className="w-full border rounded-md px-3 py-2"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><strong>Example:</strong> Personal errands, chores</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={companyConfig.wfhPolicy?.requiresPermission || true}
                    onChange={(e) => handleChange('wfhPolicy.requiresPermission', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">WFH requires special permission</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Deductions & Penalties */}
        {activeTab === 'deductions' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Deductions & Penalties</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Missed Punch Penalty (₹)
                </label>
                <input
                  type="number"
                  value={companyConfig.disciplinePolicy?.missedPunchPenalty || 250}
                  onChange={(e) => handleChange('disciplinePolicy.missedPunchPenalty', parseFloat(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Penalty for each missed login/logout</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NCNS Max Instances per Quarter
                </label>
                <input
                  type="number"
                  value={companyConfig.disciplinePolicy?.ncncPenalty?.maxInstancesPerQuarter || 2}
                  onChange={(e) => handleChange('disciplinePolicy.ncncPenalty.maxInstancesPerQuarter', parseInt(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">No Call No Show instances before termination</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Overtime Policy</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.disciplinePolicy?.overtimePolicy?.noMonetaryCompensation || true}
                      onChange={(e) => handleChange('disciplinePolicy.overtimePolicy.noMonetaryCompensation', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">No monetary compensation for overtime</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.disciplinePolicy?.overtimePolicy?.forAppraisalOnly || true}
                      onChange={(e) => handleChange('disciplinePolicy.overtimePolicy.forAppraisalOnly', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Overtime tracked for appraisal purposes only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incentives & Bonuses */}
        {activeTab === 'incentives' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Incentives & Bonuses</h3>
            
            {/* Attendance Bonus */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Attendance Bonus</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bonus Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.incentives?.attendanceBonus?.amount || 1000}
                    onChange={(e) => handleChange('incentives.attendanceBonus.amount', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consecutive Months
                  </label>
                  <input
                    type="number"
                    value={companyConfig.incentives?.attendanceBonus?.consecutiveMonths || 4}
                    onChange={(e) => handleChange('incentives.attendanceBonus.consecutiveMonths', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={companyConfig.incentives?.attendanceBonus?.requires100Percent || true}
                      onChange={(e) => handleChange('incentives.attendanceBonus.requires100Percent', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Requires 100% attendance</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Bonus awarded for perfect attendance over consecutive months
              </p>
            </div>
            
            {/* Department Weightage */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Department Weightage (for Appraisal)</h4>
                <button
                  onClick={handleAddDepartmentWeightage}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Department
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Weightage for revenue vs attendance in performance appraisal
              </p>
              
              <div className="space-y-4">
                {companyConfig.incentives?.departmentWeightage?.map((weightage, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 bg-white rounded border">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Department</label>
                      <input
                        type="text"
                        value={weightage.department}
                        onChange={(e) => {
                          const newWeightages = [...companyConfig.incentives.departmentWeightage];
                          newWeightages[index].department = e.target.value;
                          handleChange('incentives.departmentWeightage', newWeightages);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="e.g., Sales"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Revenue Weightage (%)</label>
                      <input
                        type="number"
                        value={weightage.revenueWeightage}
                        onChange={(e) => {
                          const newWeightages = [...companyConfig.incentives.departmentWeightage];
                          newWeightages[index].revenueWeightage = parseInt(e.target.value);
                          handleChange('incentives.departmentWeightage', newWeightages);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Attendance Weightage (%)</label>
                      <input
                        type="number"
                        value={weightage.attendanceWeightage}
                        onChange={(e) => {
                          const newWeightages = [...companyConfig.incentives.departmentWeightage];
                          newWeightages[index].attendanceWeightage = parseInt(e.target.value);
                          handleChange('incentives.departmentWeightage', newWeightages);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          const newWeightages = companyConfig.incentives.departmentWeightage.filter((_, i) => i !== index);
                          handleChange('incentives.departmentWeightage', newWeightages);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>Example: Sales team - 80% revenue weightage, 20% attendance weightage</p>
              </div>
            </div>
          </div>
        )}

        {/* Statutory Settings */}
        {activeTab === 'statutory' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Statutory Deductions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PF Percentage (%)
                </label>
                <input
                  type="number"
                  value={companyConfig.statutoryDefaults?.pfPercentage || 12}
                  onChange={(e) => handleChange('statutoryDefaults.pfPercentage', parseFloat(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ESI Percentage (%)
                </label>
                <input
                  type="number"
                  value={companyConfig.statutoryDefaults?.esiPercentage || 0.75}
                  onChange={(e) => handleChange('statutoryDefaults.esiPercentage', parseFloat(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ESI Salary Threshold (₹)
                </label>
                <input
                  type="number"
                  value={companyConfig.statutoryDefaults?.esiSalaryThreshold || 21000}
                  onChange={(e) => handleChange('statutoryDefaults.esiSalaryThreshold', parseFloat(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">ESI applicable if salary ≤ this amount</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Tax (₹)
                </label>
                <input
                  type="number"
                  value={companyConfig.statutoryDefaults?.professionalTax || 200}
                  onChange={(e) => handleChange('statutoryDefaults.professionalTax', parseFloat(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
              </div>
            </div>
            
            {/* Financial Year */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Financial Year Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Month</label>
                  <select
                    value={companyConfig.financialYear?.startMonth || 4}
                    onChange={(e) => handleChange('financialYear.startMonth', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Day</label>
                  <input
                    type="number"
                    value={companyConfig.financialYear?.startDay || 1}
                    onChange={(e) => handleChange('financialYear.startDay', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                    max="31"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Month</label>
                  <select
                    value={companyConfig.financialYear?.endMonth || 3}
                    onChange={(e) => handleChange('financialYear.endMonth', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Day</label>
                  <input
                    type="number"
                    value={companyConfig.financialYear?.endDay || 31}
                    onChange={(e) => handleChange('financialYear.endDay', parseInt(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                    max="31"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Default: April 1 to March 31</p>
            </div>
          </div>
        )}

        {/* Salary Structure */}
        {activeTab === 'salary' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Default Salary Structure</h3>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-4">
                Default percentage breakdown for salary components (sum should be 100%)
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Basic Salary (%)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.defaultSalaryBreakdown?.basicPercentage || 45}
                    onChange={(e) => handleChange('defaultSalaryBreakdown.basicPercentage', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HRA (%)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.defaultSalaryBreakdown?.hraPercentage || 22.5}
                    onChange={(e) => handleChange('defaultSalaryBreakdown.hraPercentage', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conveyance Allowance (%)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.defaultSalaryBreakdown?.conveyancePercentage || 12.5}
                    onChange={(e) => handleChange('defaultSalaryBreakdown.conveyancePercentage', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Allowance (%)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.defaultSalaryBreakdown?.medicalPercentage || 0}
                    onChange={(e) => handleChange('defaultSalaryBreakdown.medicalPercentage', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Allowance (%)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.defaultSalaryBreakdown?.specialPercentage || 15}
                    onChange={(e) => handleChange('defaultSalaryBreakdown.specialPercentage', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Allowances (%)
                  </label>
                  <input
                    type="number"
                    value={companyConfig.defaultSalaryBreakdown?.otherPercentage || 5}
                    onChange={(e) => handleChange('defaultSalaryBreakdown.otherPercentage', parseFloat(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded border">
                <div className="flex justify-between">
                  <span className="font-medium">Total Percentage:</span>
                  <span className={`font-bold ${
                    (companyConfig.defaultSalaryBreakdown?.basicPercentage || 0) +
                    (companyConfig.defaultSalaryBreakdown?.hraPercentage || 0) +
                    (companyConfig.defaultSalaryBreakdown?.conveyancePercentage || 0) +
                    (companyConfig.defaultSalaryBreakdown?.medicalPercentage || 0) +
                    (companyConfig.defaultSalaryBreakdown?.specialPercentage || 0) +
                    (companyConfig.defaultSalaryBreakdown?.otherPercentage || 0)
                  } === 100 ? 'text-green-600' : 'text-red-600'`}>
                    {(
                      (companyConfig.defaultSalaryBreakdown?.basicPercentage || 0) +
                      (companyConfig.defaultSalaryBreakdown?.hraPercentage || 0) +
                      (companyConfig.defaultSalaryBreakdown?.conveyancePercentage || 0) +
                      (companyConfig.defaultSalaryBreakdown?.medicalPercentage || 0) +
                      (companyConfig.defaultSalaryBreakdown?.specialPercentage || 0) +
                      (companyConfig.defaultSalaryBreakdown?.otherPercentage || 0)
                    ).toFixed(2)}%
                  </span>
                </div>
                {(
                  (companyConfig.defaultSalaryBreakdown?.basicPercentage || 0) +
                  (companyConfig.defaultSalaryBreakdown?.hraPercentage || 0) +
                  (companyConfig.defaultSalaryBreakdown?.conveyancePercentage || 0) +
                  (companyConfig.defaultSalaryBreakdown?.medicalPercentage || 0) +
                  (companyConfig.defaultSalaryBreakdown?.specialPercentage || 0) +
                  (companyConfig.defaultSalaryBreakdown?.otherPercentage || 0)
                ) !== 100 && (
                  <p className="text-sm text-red-600 mt-1">
                    Total should be exactly 100%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => window.history.back()}
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
  );
};

export default ConfigurationPage;