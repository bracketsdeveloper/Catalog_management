const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticate, requireAdmin } = require("../middleware/hrmsAuth");

const CompanyConfig = require("../models/CompanyConfig");
const SalaryConfig = require("../models/Salaryconfig"); // keep your filename as-is
const Employee = require("../models/Employee");

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get company configuration
 * GET /company
 */
router.get("/company", authenticate, requireAdmin, async (req, res) => {
  try {
    let config = await CompanyConfig.findOne({ isActive: true }).lean();

    if (!config) {
      // Create default config
      config = new CompanyConfig();
      await config.save();
      config = config.toObject();
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error("Get company config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Update company configuration
 * PUT /company
 */
router.put("/company", authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body || {};

    // Ensure version is updated
    if (updates.version) {
      const versionParts = String(updates.version).split(".");
      if (versionParts.length === 2) {
        const major = parseInt(versionParts[0], 10);
        const minor = parseInt(versionParts[1], 10) + 1;
        if (!Number.isNaN(major) && !Number.isNaN(minor)) {
          updates.version = `${major}.${minor}`;
        }
      }
    }

    updates.lastUpdatedBy = req.user?._id;
    updates.lastUpdatedAt = new Date();

    const config = await CompanyConfig.findOneAndUpdate(
      { isActive: true },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.json({ success: true, message: "Company config updated", config });
  } catch (error) {
    console.error("Update company config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SALARY CONFIG (EMPLOYEE-LEVEL CONFIG PAGE SUPPORT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get salary config for an employeeId (string employee code)
 * GET /salary-config/:employeeId
 *
 * Frontend expects: { success: true, config: <object|null> }
 */
router.get("/salary-config/:employeeId", authenticate, requireAdmin, async (req, res) => {
  try {
    const employeeId = decodeURIComponent(req.params.employeeId || "").trim();
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId is required" });
    }

    const config = await SalaryConfig.findOne({ employeeId }).lean();
    return res.json({ success: true, config: config || null });
  } catch (error) {
    console.error("Get salary config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Upsert salary config for an employee
 * POST /salary-config
 *
 * Body must include employeeId
 * Frontend expects: { success: true, config }
 */
router.post("/salary-config", authenticate, requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    const employeeId = String(payload.employeeId || "").trim();

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId is required" });
    }

    // ✅ Ensure defaults for new fields
    if (payload.accuracyBonusAmount == null) payload.accuracyBonusAmount = 1000;
    if (!payload.accuracyBonusFrequency) payload.accuracyBonusFrequency = "monthly";

    // Optionally ensure attendance bonus defaults
    if (payload.attendanceBonusAmount == null) payload.attendanceBonusAmount = 1000;
    if (payload.attendanceBonusMonths == null) payload.attendanceBonusMonths = 4;

    const config = await SalaryConfig.findOneAndUpdate(
      { employeeId },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.json({ success: true, message: "Salary config saved", config });
  } catch (error) {
    console.error("Upsert salary config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all configuration templates
 * GET /templates
 */
router.get("/templates", authenticate, requireAdmin, async (req, res) => {
  try {
    const templates = {
      acePrintPack: {
        name: "Ace Print Pack Default",
        description: "Default configuration for Ace Print Pack",
        settings: {
          attendanceSettings: {
            dailyWorkHours: 9,
            standardStartTime: "10:00",
            standardEndTime: "19:00",
          },
          biWeeklyRule: {
            targetHours: 99,
            gracePeriodHours: 2,
            deductionPerHour: 500,
          },
          saturdaysPattern: "1st_3rd",
          leavePolicy: {
            sickLeave: {
              perMonth: 1,
              nonCumulative: true,
            },
            earnedLeave: {
              per20WorkingDays: 1.25,
              maxCarryForward: 30,
            },
          },
          incentives: {
            attendanceBonus: { amount: 1000, consecutiveMonths: 4 },
            // ✅ NEW default template
            accuracyBonus: { amount: 1000, frequency: "monthly" },
          },
        },
      },
      salesTeam: {
        name: "Sales Team Template",
        description: "Configuration for sales department",
        settings: {
          departmentWeightage: {
            revenueWeightage: 80,
            attendanceWeightage: 20,
          },
        },
      },
      operationsTeam: {
        name: "Operations Team Template",
        description: "Configuration for operations department",
        settings: {
          departmentWeightage: {
            revenueWeightage: 30,
            attendanceWeightage: 70,
          },
        },
      },
    };

    res.json({ success: true, templates });
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Apply template to employees
 * POST /apply-template
 */
router.post("/apply-template", authenticate, requireAdmin, async (req, res) => {
  try {
    const { templateName, employeeIds, department } = req.body || {};

    if (!templateName) {
      return res.status(400).json({ success: false, message: "Template name required" });
    }

    // Define templates (these map directly to SalaryConfig fields if you want)
    const templates = {
      salesTeam: {
        departmentWeightage: {
          revenueWeightage: 80,
          attendanceWeightage: 20,
        },
      },
      operationsTeam: {
        departmentWeightage: {
          revenueWeightage: 30,
          attendanceWeightage: 70,
        },
      },
    };

    const template = templates[templateName];
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    // Build employee filter
    let filter = { isActive: true };
    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      filter["personal.employeeId"] = { $in: employeeIds };
    }
    if (department) {
      filter["org.department"] = department;
    }

    /**
     * ✅ FIX: projection must be consistent.
     * The previous error happens when you mix include/exclude.
     * Here we do inclusion-only: { "personal.employeeId": 1 }
     */
    const employees = await Employee.find(filter, { "personal.employeeId": 1 }).lean();

    const results = {
      total: employees.length,
      updated: 0,
      errors: [],
    };

    for (const emp of employees) {
      try {
        const empId = emp?.personal?.employeeId;
        if (!empId) continue;

        await SalaryConfig.findOneAndUpdate(
          { employeeId: empId },
          { $set: template },
          { upsert: true, runValidators: true }
        );

        results.updated++;
      } catch (err) {
        results.errors.push({
          employeeId: emp?.personal?.employeeId,
          error: err.message,
        });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error("Apply template error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION EXPORT/IMPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export configurations (JSON)
 * GET /export
 */
router.get("/export", authenticate, requireAdmin, async (req, res) => {
  try {
    // Get company config
    const companyConfig = await CompanyConfig.findOne({ isActive: true }).lean();

    // Get all employee configs (employeeId is string, so no populate)
    const employeeConfigs = await SalaryConfig.find({}).lean();

    // Fetch employee names for mapping
    const employeeIds = employeeConfigs.map((c) => c.employeeId).filter(Boolean);

    const employees = await Employee.find(
      { "personal.employeeId": { $in: employeeIds } },
      { "personal.employeeId": 1, "personal.name": 1 }
    ).lean();

    const nameMap = new Map(
      employees.map((e) => [e?.personal?.employeeId, e?.personal?.name])
    );

    const employeeConfigsWithNames = employeeConfigs.map((c) => ({
      ...c,
      employeeName: nameMap.get(c.employeeId) || "",
    }));

    const exportData = {
      company: companyConfig || null,
      employees: employeeConfigsWithNames,
      exportedAt: new Date(),
      exportedBy: req.user?.email,
    };

    const filename = `salary_config_export_${new Date().toISOString().split("T")[0]}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Import configurations (JSON)
 * POST /import
 */
router.post("/import", authenticate, requireAdmin, async (req, res) => {
  try {
    const { importData } = req.body || {};

    if (!importData || !importData.company || !importData.employees) {
      return res.status(400).json({ success: false, message: "Invalid import data" });
    }

    // Import company config
    const companyConfig = await CompanyConfig.findOneAndUpdate(
      { isActive: true },
      { $set: importData.company },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    const results = {
      total: importData.employees.length,
      imported: 0,
      errors: [],
    };

    for (const empConfig of importData.employees) {
      try {
        const empId = String(empConfig.employeeId || "").trim();
        if (!empId) {
          results.errors.push({ employeeId: "", error: "Missing employeeId" });
          continue;
        }

        // strip helper fields (like employeeName)
        const { employeeName, _id, __v, ...clean } = empConfig;

        // Ensure new fields exist
        if (clean.accuracyBonusAmount == null) clean.accuracyBonusAmount = 1000;
        if (!clean.accuracyBonusFrequency) clean.accuracyBonusFrequency = "monthly";

        await SalaryConfig.findOneAndUpdate(
          { employeeId: empId },
          { $set: { ...clean, employeeId: empId } },
          { new: true, upsert: true, runValidators: true }
        );

        results.imported++;
      } catch (err) {
        results.errors.push({
          employeeId: empConfig.employeeId,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Configurations imported successfully",
      companyConfig,
      results,
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
