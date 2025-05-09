// backend/routes/companyRoutes.js
const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const multer = require("multer");
const Company = require("../models/Company");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* ===== Multer ===== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files allowed."), false);
    }
  },
});

/* ===== Helpers ===== */
const createLogEntry = (
  req,
  action,
  field = null,
  oldValue = null,
  newValue = null
) => ({
  action,
  field,
  oldValue,
  newValue,
  performedBy: req.user.id,
  ipAddress: req.ip,
  performedAt: new Date(),
});

const isEqual = (a, b) => {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return a === b;
  if (a.prototype !== b.prototype) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => isEqual(a[k], b[k]));
};

const sanitiseClients = (raw = []) =>
  Array.isArray(raw)
    ? raw
        .filter((c) => c && c.name && c.contactNumber)
        .map((c) => ({
          name: c.name,
          department: c.department || "",
          email: c.email || "",
          contactNumber: c.contactNumber.toString(),
        }))
    : [];

/* ===== Create ===== */
router.post("/companies", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      companyName,
      brandName,
      segment,
      GSTIN,
      vendorCode,
      portalUpload,
      paymentTerms,
      companyAddress,
      pincode,
      clients: rawClients = [],
    } = req.body;

    if (!companyName || !pincode)
      return res.status(400).json({ message: "Company name and pincode are required" });

    if (
      await Company.findOne({
        companyName: new RegExp(`^${companyName}$`, "i"),
      })
    )
      return res.status(400).json({ message: "Company already exists" });

    const doc = await Company.create({
      companyName,
      brandName,
      segment,
      GSTIN,
      vendorCode,
      portalUpload,
      paymentTerms,
      companyAddress,
      pincode,
      clients: sanitiseClients(rawClients),
      createdBy: req.user.id,
      logs: [createLogEntry(req, "create")],
    });

    res.status(201).json({ message: "Company created", company: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Create failed" });
  }
});

/* ===== List ===== */
router.get("/companies", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { companyName } = req.query;
    const query = { deleted: { $ne: true } };
    if (companyName)
      query.companyName = { $regex: `^${companyName}$`, $options: "i" };

    const companies = await Company.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.json(companies);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fetch failed" });
  }
});

/* ===== Single ===== */
router.get("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const c = await Company.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("deletedBy", "name email");
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  } catch (e) {
    console.error(e);
    
    res.status(500).json({ message: "Fetch failed" });
  }
});

/* ===== Update ===== */
router.put("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      companyName,
      brandName,
      segment,
      GSTIN,
      vendorCode,
      portalUpload,
      paymentTerms,
      companyAddress,
      pincode,
      clients: rawClients,
    } = req.body;

    const doc = await Company.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    if (
      companyName &&
      !isEqual(companyName, doc.companyName) &&
      (await Company.findOne({
        companyName: new RegExp(`^${companyName}$`, "i"),
        _id: { $ne: doc._id },
      }))
    )
      return res.status(400).json({ message: "Company name already exists" });

    const updates = {};
    const logs = [];

    const check = (field, value) => {
      if (value !== undefined && !isEqual(value, doc[field])) {
        updates[field] = value;
        logs.push(createLogEntry(req, "update", field, doc[field], value));
      }
    };

    check("companyName", companyName);
    check("brandName", brandName);
    check("segment", segment);
    check("vendorCode", vendorCode);
    check("portalUpload", portalUpload);
    check("paymentTerms", paymentTerms);
    check("GSTIN", GSTIN);
    check("companyAddress", companyAddress);
    check("pincode", pincode);

    if (rawClients !== undefined) check("clients", sanitiseClients(rawClients));

    if (!Object.keys(updates).length)
      return res.status(200).json({ message: "No changes", company: doc });

    updates.updatedAt = new Date();
    updates.updatedBy = req.user.id;

    const updated = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: updates, $push: { logs: { $each: logs } } },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.json({ message: "Updated", company: updated, changes: logs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Update failed" });
  }
});

/* ===== Delete (soft) ===== */
router.delete(
  "/companies/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const doc = await Company.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: "Not found" });

      doc.deleted = true;
      doc.deletedAt = new Date();
      doc.deletedBy = req.user.id;
      doc.logs.push(createLogEntry(req, "delete"));
      await doc.save();

      res.json({ message: "Deleted" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Delete failed" });
    }
  }
);

/* ===== Logs (single) ===== */
router.get(
  "/companies/:id/logs",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const c = await Company.findById(req.params.id)
        .populate("logs.performedBy", "name email")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .populate("deletedBy", "name email");
      if (!c) return res.status(404).json({ message: "Not found" });

      res.json({
        company: {
          _id: c._id,
          companyName: c.companyName,
          brandName: c.brandName,
          GSTIN: c.GSTIN,
          pincode: c.pincode,
          createdAt: c.createdAt,
          createdBy: c.createdBy,
          updatedAt: c.updatedAt,
          updatedBy: c.updatedBy,
          deleted: c.deleted,
          deletedAt: c.deletedAt,
          deletedBy: c.deletedBy,
        },
        logs: c.logs,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Fetch logs failed" });
    }
  }
);

/* ===== Logs (all) ===== */
router.get("/logs", authenticate, authorizeAdmin, async (_req, res) => {
  try {
    const companies = await Company.find().select("companyName logs").lean();
    const logs = companies.flatMap((c) =>
      (c.logs || []).map((l) => ({ ...l, companyName: c.companyName }))
    );
    logs.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
    res.json({ logs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fetch logs failed" });
  }
});

/* ===== Template ===== */
router.get(
  "/companies/template",
  authenticate,
  authorizeAdmin,
  (_req, res) => {
    try {
      const data = [
        {
          "Company Name*": "Example Co",
          "Brand Name": "Example Brand",
          GSTIN: "22AAAAA0000A1Z5",
          "Company Address": "123 Main St",
          "Pincode*": "560001",
          "Client 1 Name": "Alice",
          "Client 1 Department": "Procurement",
          "Client 1 Email": "alice@example.com",
          "Client 1 Contact": "9876543210",
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Companies");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      res
        .set({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=companies_template.xlsx",
        })
        .send(buf);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Template gen failed" });
    }
  }
);

/* ===== Bulk Upload ===== */
router.post(
  "/companies/bulk",
  authenticate,
  authorizeAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file" });

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const toCreate = [];
      const errors = [];

      rows.forEach((r, i) => {
        if (!r["Company Name*"] || !r["Pincode*"]) {
          errors.push(`Row ${i + 2}: Company Name and Pincode required`);
          return;
        }

        const clients = [];
        for (let n = 1; n <= 5; n++) {
          const name = r[`Client ${n} Name`];
          const dept = r[`Client ${n} Department`];
          const email = r[`Client ${n} Email`];
          const contact = r[`Client ${n} Contact`];
          if (name && contact) {
            clients.push({
              name,
              department: dept,
              email,
              contactNumber: contact.toString(),
            });
          }
        }

        toCreate.push({
          companyName: r["Company Name*"],
          brandName: r["Brand Name"] || "",
          GSTIN: r["GSTIN"] || "",
          companyAddress: r["Company Address"] || "",
          pincode: r["Pincode*"].toString(),
          clients,
          createdBy: req.user.id,
          logs: [createLogEntry(req, "create")],
        });
      });

      if (errors.length)
        return res.status(400).json({ message: "Errors", errors });

      const inserted = await Company.insertMany(toCreate);
      res
        .status(201)
        .json({ message: "Bulk upload done", count: inserted.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Bulk upload failed" });
    }
  }
);

module.exports = router;
