const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticate, requireAdmin } = require("../middleware/hrmsAuth");
const CompanyConfig = require("../models/CompanyConfig");
const SalaryConfig = require("../models/Salaryconfig");
const Employee = require("../models/Employee");

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get company configuration
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
 */
router.put("/company", authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    
    // Ensure version is updated
    if (updates.version) {
      const versionParts = updates.version.split('.');
      if (versionParts.length === 2) {
        const major = parseInt(versionParts[0]);
        const minor = parseInt(versionParts[1]) + 1;
        updates.version = `${major}.${minor}`;
      }
    }
    
    updates.lastUpdatedBy = req.user?._id;
    updates.lastUpdatedAt = new Date();
    
    const config = await CompanyConfig.findOneAndUpdate(
      { isActive: true },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json({ success: true, message: "Company config updated", config });
    
  } catch (error) {
    console.error("Update company config error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all configuration templates
 */
router.get("/templates", authenticate, requireAdmin, async (req, res) => {
  try {
    // Default templates
    const templates = {
      acePrintPack: {
        name: "Ace Print Pack Default",
        description: "Default configuration for Ace Print Pack",
        settings: {
          attendanceSettings: {
            dailyWorkHours: 9,
            standardStartTime: "10:00",
            standardEndTime: "19:00"
          },
          biWeeklyRule: {
            targetHours: 99,
            gracePeriodHours: 2,
            deductionPerHour: 500
          },
          saturdaysPattern: "1st_3rd",
          leavePolicy: {
            sickLeave: {
              perMonth: 1,
              nonCumulative: true
            },
            earnedLeave: {
              per20WorkingDays: 1.25,
              maxCarryForward: 30
            }
          }
        }
      },
      salesTeam: {
        name: "Sales Team Template",
        description: "Configuration for sales department",
        settings: {
          departmentWeightage: {
            revenueWeightage: 80,
            attendanceWeightage: 20
          }
        }
      },
      operationsTeam: {
        name: "Operations Team Template",
        description: "Configuration for operations department",
        settings: {
          departmentWeightage: {
            revenueWeightage: 30,
            attendanceWeightage: 70
          }
        }
      }
    };
    
    res.json({ success: true, templates });
    
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Apply template to employees
 */
router.post("/apply-template", authenticate, requireAdmin, async (req, res) => {
  try {
    const { templateName, employeeIds, department } = req.body;
    
    if (!templateName) {
      return res.status(400).json({ success: false, message: "Template name required" });
    }
    
    // Define templates
    const templates = {
      salesTeam: {
        departmentWeightage: {
          revenueWeightage: 80,
          attendanceWeightage: 20
        }
      },
      operationsTeam: {
        departmentWeightage: {
          revenueWeightage: 30,
          attendanceWeightage: 70
        }
      }
    };
    
    const template = templates[templateName];
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    
    // Build employee filter
    let filter = { isActive: true };
    if (employeeIds && employeeIds.length > 0) {
      filter["personal.employeeId"] = { $in: employeeIds };
    }
    if (department) {
      filter["org.department"] = department;
    }
    
    const employees = await Employee.find(filter, { "personal.employeeId": 1 }).lean();
    
    const results = {
      total: employees.length,
      updated: 0,
      errors: []
    };
    
    for (const emp of employees) {
      try {
        await SalaryConfig.findOneAndUpdate(
          { employeeId: emp.personal.employeeId },
          { $set: template },
          { upsert: true }
        );
        results.updated++;
      } catch (err) {
        results.errors.push({
          employeeId: emp.personal.employeeId,
          error: err.message
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
 * Export configurations
 */
router.get("/export", authenticate, requireAdmin, async (req, res) => {
  try {
    const XLSX = require("xlsx");
    
    // Get company config
    const companyConfig = await CompanyConfig.findOne({ isActive: true }).lean();
    
    // Get all employee configs
    const employeeConfigs = await SalaryConfig.find({})
      .populate('employeeId', 'personal.name personal.employeeId')
      .lean();
    
    // Prepare data
    const exportData = {
      company: companyConfig,
      employees: employeeConfigs,
      exportedAt: new Date(),
      exportedBy: req.user?.email
    };
    
    const filename = `salary_config_export_${new Date().toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
    
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Import configurations
 */
router.post("/import", authenticate, requireAdmin, async (req, res) => {
  try {
    const { importData } = req.body;
    
    if (!importData || !importData.company || !importData.employees) {
      return res.status(400).json({ success: false, message: "Invalid import data" });
    }
    
    // Import company config
    const companyConfig = await CompanyConfig.findOneAndUpdate(
      { isActive: true },
      { $set: importData.company },
      { new: true, upsert: true }
    );
    
    // Import employee configs
    const results = {
      total: importData.employees.length,
      imported: 0,
      errors: []
    };
    
    for (const empConfig of importData.employees) {
      try {
        await SalaryConfig.findOneAndUpdate(
          { employeeId: empConfig.employeeId },
          { $set: empConfig },
          { new: true, upsert: true }
        );
        results.imported++;
      } catch (err) {
        results.errors.push({
          employeeId: empConfig.employeeId,
          error: err.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: "Configurations imported successfully",
      results 
    });
    
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;