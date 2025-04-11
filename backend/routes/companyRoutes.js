// routes/companyRoutes.js
const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const XLSX = require("xlsx");
const multer = require("multer");

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files are allowed."), false);
    }
  },
});

// Helper function to create log entry
const createLogEntry = (req, action, field, oldValue, newValue) => {
  return {
    action,
    field,
    oldValue,
    newValue,
    performedBy: req.user.id,
    ipAddress: req.ip,
    performedAt: new Date(),
  };
};

// Helper function to compare values
function isEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (!a || !b || (typeof a !== "object" && typeof b !== "object"))
    return a === b;
  if (a.prototype !== b.prototype) return false;

  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((k) => isEqual(a[k], b[k]));
}

// Create a new company
router.post("/companies", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { companyName, brandName, GSTIN, companyEmail, clients, companyAddress } =
      req.body;

    if (!companyName) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const newCompany = new Company({
      companyName,
      brandName,
      GSTIN,
      companyEmail,
      clients,
      companyAddress,
      createdBy: req.user.id,
      logs: [createLogEntry(req, "create", null, null, null)],
    });

    await newCompany.save();

    res.status(201).json({
      message: "Company created successfully",
      company: newCompany,
    });
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({
      message: "Failed to create company",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Get all companies (if query param all=true, fetch all companies without pagination)
// routes/companyRoutes.js
router.get("/companies", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const companies = await Company.find({ deleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Failed to fetch companies" });
  }
});

// Get single company
router.get("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("deletedBy", "name email");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ message: "Failed to fetch company" });
  }
});

// Update company
router.put("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { companyName, brandName, GSTIN, companyEmail, clients, companyAddress } =
      req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const updates = {};
    const logs = [];

    const fieldsToCheck = [
      { name: "companyName", value: companyName },
      { name: "brandName", value: brandName },
      { name: "GSTIN", value: GSTIN },
      { name: "companyEmail", value: companyEmail },
      { name: "companyAddress", value: companyAddress },
      { name: "clients", value: clients },
    ];

    fieldsToCheck.forEach((field) => {
      if (field.value !== undefined && !isEqual(field.value, company[field.name])) {
        logs.push(
          createLogEntry(req, "update", field.name, company[field.name], field.value)
        );
        updates[field.name] = field.value;
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({ message: "No changes detected", company });
    }

    updates.updatedBy = req.user.id;
    const updateQuery = {
      ...updates,
      $push: { logs: { $each: logs } },
    };

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true }
    );

    res.json({
      message: "Company updated successfully",
      company: updatedCompany,
      changes: logs,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ message: "Failed to update company" });
  }
});

// Delete (soft delete) company
router.delete("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.deleted = true;
    company.deletedAt = new Date();
    company.deletedBy = req.user.id;
    company.logs.push(createLogEntry(req, "delete", null, company, null));
    await company.save();

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ message: "Failed to delete company" });
  }
});

// Get company logs
router.get("/companies/:id/logs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate("logs.performedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("deletedBy", "name email");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      company: {
        _id: company._id,
        companyName: company.companyName,
        brandName: company.brandName,
        GSTIN: company.GSTIN,
        createdAt: company.createdAt,
        createdBy: company.createdBy,
        updatedAt: company.updatedAt,
        updatedBy: company.updatedBy,
        deleted: company.deleted,
        deletedAt: company.deletedAt,
        deletedBy: company.deletedBy,
      },
      logs: company.logs,
    });
  } catch (error) {
    console.error("Error fetching company logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// Download template
router.get("/companies/template", authenticate, authorizeAdmin, (req, res) => {
  try {
    const templateData = [
      {
        "Company Name*": "Example Company",
        "Brand Name": "Example Brand",
        GSTIN: "22AAAAA0000A1Z5",
        "Company Email": "example@company.com",
        "Company Address": "123 Main St",
        "Client 1 Name": "Client One",
        "Client 1 Contact": "1234567890",
        "Client 2 Name": "Client Two",
        "Client 2 Contact": "0987654321",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Companies");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=companies_template.xlsx"
    );
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating template:", error);
    res.status(500).json({ message: "Failed to generate template" });
  }
});

// Bulk upload
router.post(
  "/companies/bulk",
  authenticate,
  authorizeAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const companiesToCreate = [];
      const errors = [];

      jsonData.forEach((row, index) => {
        if (!row["Company Name*"]) {
          errors.push(`Row ${index + 2}: Company Name is required`);
          return;
        }

        const clients = [];
        for (let i = 1; i <= 5; i++) {
          const clientName = row[`Client ${i} Name`];
          const clientContact = row[`Client ${i} Contact`];
          if (clientName && clientContact) {
            clients.push({
              name: clientName,
              contactNumber: clientContact.toString(),
            });
          }
        }

        companiesToCreate.push({
          companyName: row["Company Name*"],
          brandName: row["Brand Name"] || "",
          GSTIN: row["GSTIN"] || "",
          companyEmail: row["Company Email"] || "",
          companyAddress: row["Company Address"] || "",
          clients,
          createdBy: req.user.id,
          logs: [createLogEntry(req, "create", null, null, null)],
        });
      });

      if (errors.length > 0) {
        return res.status(400).json({
          message: "Validation errors in uploaded file",
          errors,
        });
      }

      const result = await Company.insertMany(companiesToCreate);
      res.status(201).json({
        message: "Bulk upload completed successfully",
        count: result.length,
        companies: result,
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({
        message: error.message || "Failed to process bulk upload",
        error:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// Example route for returning all logs from all companies in descending order:
router.get("/logs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const companies = await Company.find().select("companyName logs").lean();
    let allLogs = companies.flatMap((company) =>
      (company.logs || []).map((log) => ({
        ...log,
        companyName: company.companyName,
      }))
    );
    allLogs.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
    res.json({ logs: allLogs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

module.exports = router;
