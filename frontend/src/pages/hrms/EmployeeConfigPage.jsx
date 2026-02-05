import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../../components/common/PageHeader";
import { HRMS } from "../../api/hrmsClient";

function deepClone(x) {
  return JSON.parse(JSON.stringify(x || {}));
}

export default function EmployeeConfigPage() {
  const { employeeId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employee, setEmployee] = useState(null);
  const [companyConfig, setCompanyConfig] = useState(null);
  const [config, setConfig] = useState(null);

  const [activeTab, setActiveTab] = useState("attendance");

  const effectiveEmployeeId = useMemo(
    () => decodeURIComponent(employeeId || ""),
    [employeeId]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [empRes, companyRes, salaryRes] = await Promise.all([
          HRMS.getEmployee(effectiveEmployeeId),
          HRMS.getCompanyConfig(),
          HRMS.getSalaryConfig(effectiveEmployeeId),
        ]);

        const emp = empRes?.data?.employee || empRes?.data || null;
        setEmployee(emp);

        const cc = companyRes?.data?.config || companyRes?.data || null;
        setCompanyConfig(cc);

        // salaryRes should be { config } or a raw config object
        const sc = salaryRes?.data?.config || salaryRes?.data || null;

        // Build defaults from company config (works even if HRMS.getDefaultCompanyConfig doesn't exist)
        const base = cc || {};

        const draft = {
          employeeId: effectiveEmployeeId,
          salaryOffered: 0,

          useGlobalSettings: true,
          useDepartmentSettings: false,

          dailyWorkHours: base?.attendanceSettings?.dailyWorkHours ?? 9,
          biWeeklyTargetHours: base?.biWeeklyRule?.targetHours ?? 99,
          gracePeriodHours: base?.biWeeklyRule?.gracePeriodHours ?? 2,
          hourlyDeductionRate: base?.biWeeklyRule?.deductionPerHour ?? 500,
          saturdaysOffPattern: base?.saturdaysPattern ?? "1st_3rd",

          sickLeavePerMonth: base?.leavePolicy?.sickLeave?.perMonth ?? 1,
          sickLeaveNonCumulative: base?.leavePolicy?.sickLeave?.nonCumulative ?? true,

          earnedLeavePer20Days: base?.leavePolicy?.earnedLeave?.per20WorkingDays ?? 1.25,
          maxCarryForwardEL: base?.leavePolicy?.earnedLeave?.maxCarryForward ?? 30,
          elEncashmentAtYearEnd: base?.leavePolicy?.earnedLeave?.encashAtYearEnd ?? true,

          deathInFamilyLeave: base?.leavePolicy?.specialLeaves?.deathInFamily ?? 10,
          selfMarriageLeave: base?.leavePolicy?.specialLeaves?.selfMarriage ?? 2,

          compulsoryHolidaysPerYear: base?.leavePolicy?.holidays?.compulsoryPerYear ?? 10,
          restrictedHolidaysPerYear: base?.leavePolicy?.holidays?.restrictedPerYear ?? 2,

          weekendDeductionTiers: deepClone(base?.leavePolicy?.weekendDeductionTiers || []),

          emergencyWFHDeduction: 0.25,
          casualWFHDeduction: 0.5,

          missedPunchPenalty: base?.disciplinePolicy?.missedPunchPenalty ?? 250,
          probationPeriodDays: base?.eligibilityPolicy?.probationPeriodDays ?? 30,

          attendanceBonusAmount: base?.incentives?.attendanceBonus?.amount ?? 1000,
          attendanceBonusMonths: base?.incentives?.attendanceBonus?.consecutiveMonths ?? 4,

          // ✅ Accuracy Bonus default: 1000 monthly
          accuracyBonusAmount: base?.incentives?.accuracyBonus?.amount ?? 1000,
          accuracyBonusFrequency: base?.incentives?.accuracyBonus?.frequency ?? "monthly",

          pfEnabled: true,
          pfPercentage: base?.statutoryDefaults?.pfPercentage ?? 12,
          esiEnabled: false,
          esiPercentage: base?.statutoryDefaults?.esiPercentage ?? 0.75,
          esiSalaryThreshold: base?.statutoryDefaults?.esiSalaryThreshold ?? 21000,
          professionalTaxEnabled: true,
          professionalTaxAmount: base?.statutoryDefaults?.professionalTax ?? 200,
        };

        setConfig(sc && sc.employeeId ? sc : draft);
      } catch (e) {
        console.error(e);
        toast.error(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load employee configuration"
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [effectiveEmployeeId]);

  const handleChange = (path, value) => {
    const keys = path.split(".");
    setConfig((prev) => {
      const next = deepClone(prev);
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]]) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const addWeekendTier = () => {
    setConfig((prev) => ({
      ...prev,
      weekendDeductionTiers: [
        ...(prev.weekendDeductionTiers || []),
        { minExcessDays: 0, maxExcessDays: 0, sundaysDeducted: 0, description: "" },
      ],
    }));
  };

  const removeWeekendTier = (index) => {
    setConfig((prev) => ({
      ...prev,
      weekendDeductionTiers: (prev.weekendDeductionTiers || []).filter((_, i) => i !== index),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      // ✅ consistent save
      await HRMS.upsertSalaryConfig(config);
      toast.success("Employee configuration saved");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e.message || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center text-gray-500">
        Employee configuration not found
      </div>
    );
  }

  const empName = employee?.personal?.name || employee?.name || effectiveEmployeeId;

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title={`Employee Configuration — ${empName}`}
        actions={
          <div className="flex gap-2">
            <Link
              to="/hrms/employees"
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back
            </Link>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        }
      />

      <div className="mb-6 border-b">
        <nav className="flex space-x-4 overflow-x-auto">
          {[
            { id: "attendance", label: "Attendance" },
            { id: "leaves", label: "Leaves" },
            { id: "deductions", label: "Deductions" },
            { id: "wfh", label: "WFH Policy" },
            { id: "incentives", label: "Bonus" },
            { id: "statutory", label: "Statutory" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 px-1 border-b-2 whitespace-nowrap ${
                activeTab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Inheritance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!config.useGlobalSettings}
              onChange={(e) => handleChange("useGlobalSettings", e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Use global company settings as defaults
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!config.useDepartmentSettings}
              onChange={(e) => handleChange("useDepartmentSettings", e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Use department overrides (if implemented)
            </span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          You can still override any field below for this employee.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Attendance & 99-Hour Rule</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Work Hours
                </label>
                <input
                  type="number"
                  value={config.dailyWorkHours ?? 9}
                  onChange={(e) => handleChange("dailyWorkHours", Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="1"
                  max="24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saturdays Off Pattern
                </label>
                <select
                  value={config.saturdaysOffPattern || "1st_3rd"}
                  onChange={(e) => handleChange("saturdaysOffPattern", e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="1st_3rd">1st & 3rd Saturdays</option>
                  <option value="2nd_4th">2nd & 4th Saturdays</option>
                  <option value="all">All Saturdays</option>
                  <option value="none">No Saturdays Off</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bi-Weekly Target Hours
                  </label>
                  <input
                    type="number"
                    value={config.biWeeklyTargetHours ?? 99}
                    onChange={(e) => handleChange("biWeeklyTargetHours", Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                    max="336"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grace Period Hours
                  </label>
                  <input
                    type="number"
                    value={config.gracePeriodHours ?? 2}
                    onChange={(e) => handleChange("gracePeriodHours", Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    max="24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deduction per Hour (₹)
                  </label>
                  <input
                    type="number"
                    value={config.hourlyDeductionRate ?? 500}
                    onChange={(e) => handleChange("hourlyDeductionRate", Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Leave Policy</h3>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Sick Leave (SL)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days per Month
                  </label>
                  <input
                    type="number"
                    value={config.sickLeavePerMonth ?? 1}
                    onChange={(e) => handleChange("sickLeavePerMonth", Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                    step="0.5"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.sickLeaveNonCumulative ?? true}
                    onChange={(e) => handleChange("sickLeaveNonCumulative", e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Non-cumulative (expires monthly)</span>
                </label>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Earned Leave (EL)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days per 20 Working Days
                  </label>
                  <input
                    type="number"
                    value={config.earnedLeavePer20Days ?? 1.25}
                    onChange={(e) => handleChange("earnedLeavePer20Days", Number(e.target.value))}
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
                    value={config.maxCarryForwardEL ?? 30}
                    onChange={(e) => handleChange("maxCarryForwardEL", Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.elEncashmentAtYearEnd ?? true}
                    onChange={(e) => handleChange("elEncashmentAtYearEnd", e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Encash at year end</span>
                </label>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Weekend Deduction Tiers</h4>
                <button
                  onClick={addWeekendTier}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Tier
                </button>
              </div>

              <div className="space-y-4">
                {(config.weekendDeductionTiers || []).map((tier, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 bg-white rounded border"
                  >
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Excess</label>
                      <input
                        type="number"
                        value={tier.minExcessDays ?? 0}
                        onChange={(e) => {
                          const next = deepClone(config.weekendDeductionTiers || []);
                          next[index].minExcessDays = Number(e.target.value);
                          handleChange("weekendDeductionTiers", next);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Excess</label>
                      <input
                        type="number"
                        value={tier.maxExcessDays ?? 0}
                        onChange={(e) => {
                          const next = deepClone(config.weekendDeductionTiers || []);
                          next[index].maxExcessDays = Number(e.target.value);
                          handleChange("weekendDeductionTiers", next);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sundays Deducted</label>
                      <input
                        type="number"
                        value={tier.sundaysDeducted ?? 0}
                        onChange={(e) => {
                          const next = deepClone(config.weekendDeductionTiers || []);
                          next[index].sundaysDeducted = Number(e.target.value);
                          handleChange("weekendDeductionTiers", next);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <input
                        type="text"
                        value={tier.description || ""}
                        onChange={(e) => {
                          const next = deepClone(config.weekendDeductionTiers || []);
                          next[index].description = e.target.value;
                          handleChange("weekendDeductionTiers", next);
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => removeWeekendTier(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "deductions" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Deductions & Penalties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Missed Punch Penalty (₹)
                </label>
                <input
                  type="number"
                  value={config.missedPunchPenalty ?? 250}
                  onChange={(e) => handleChange("missedPunchPenalty", Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Probation Period (Days)
                </label>
                <input
                  type="number"
                  value={config.probationPeriodDays ?? 30}
                  onChange={(e) => handleChange("probationPeriodDays", Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "wfh" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">WFH Deductions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency WFH Deduction (%)
                </label>
                <input
                  type="number"
                  value={Math.round((config.emergencyWFHDeduction ?? 0.25) * 100)}
                  onChange={(e) => handleChange("emergencyWFHDeduction", Number(e.target.value) / 100)}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Casual WFH Deduction (%)
                </label>
                <input
                  type="number"
                  value={Math.round((config.casualWFHDeduction ?? 0.5) * 100)}
                  onChange={(e) => handleChange("casualWFHDeduction", Number(e.target.value) / 100)}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "incentives" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Bonuses</h3>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Attendance Bonus</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={config.attendanceBonusAmount ?? 1000}
                    onChange={(e) => handleChange("attendanceBonusAmount", Number(e.target.value))}
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
                    value={config.attendanceBonusMonths ?? 4}
                    onChange={(e) => handleChange("attendanceBonusMonths", Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* ✅ Accuracy Bonus */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Accuracy Bonus</h4>
              <p className="text-xs text-gray-600 mb-4">
                Paid monthly (default policy: ₹1000 every month).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={config.accuracyBonusAmount ?? 1000}
                    onChange={(e) => handleChange("accuracyBonusAmount", Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={config.accuracyBonusFrequency || "monthly"}
                    onChange={(e) => handleChange("accuracyBonusFrequency", e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="monthly">Every Month</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "statutory" && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Statutory</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.pfEnabled ?? true}
                  onChange={(e) => handleChange("pfEnabled", e.target.checked)}
                />
                <span className="text-sm text-gray-700">PF Enabled</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PF Percentage (%)
                </label>
                <input
                  type="number"
                  value={config.pfPercentage ?? 12}
                  onChange={(e) => handleChange("pfPercentage", Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                  max="100"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.esiEnabled ?? false}
                  onChange={(e) => handleChange("esiEnabled", e.target.checked)}
                />
                <span className="text-sm text-gray-700">ESI Enabled</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ESI Percentage (%)
                </label>
                <input
                  type="number"
                  value={config.esiPercentage ?? 0.75}
                  onChange={(e) => handleChange("esiPercentage", Number(e.target.value))}
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
                  value={config.esiSalaryThreshold ?? 21000}
                  onChange={(e) => handleChange("esiSalaryThreshold", Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.professionalTaxEnabled ?? true}
                  onChange={(e) => handleChange("professionalTaxEnabled", e.target.checked)}
                />
                <span className="text-sm text-gray-700">Professional Tax Enabled</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Tax (₹)
                </label>
                <input
                  type="number"
                  value={config.professionalTaxAmount ?? 200}
                  onChange={(e) => handleChange("professionalTaxAmount", Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Link
          to="/hrms/employees"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
