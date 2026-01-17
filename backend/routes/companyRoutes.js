const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const multer = require("multer");
const Company = require("../models/Company");
const PotentialClient = require("../models/PotentialClient");
const Vendor = require("../models/Vendor");
const User = require("../models/User"); // <-- NEW
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* ===== Multer ===== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) cb(null, true);
    else cb(new Error("Invalid file type. Only Excel files allowed."), false);
  },
});

/* ===== Helpers ===== */
function createLogEntry(req, action, field = null, oldValue = null, newValue = null) {
  return {
    action,
    field,
    oldValue,
    newValue,
    performedBy: req.user.id,
    ipAddress: req.ip,
    performedAt: new Date(),
  };
}

function isEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sa = [...a].map(String).sort();
    const sb = [...b].map(String).sort();
    return sa.every((v, i) => v === sb[i]);
  }
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return a === b;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => isEqual(a[k], b[k]));
}

function sanitiseClients(raw = []) {
  return Array.isArray(raw)
    ? raw
        .filter((c) => c && c.name && c.contactNumber)
        .map((c) => ({
          name: c.name,
          department: c.department || "",
          email: c.email || "",
          contactNumber: c.contactNumber.toString(),
        }))
    : [];
}

function sanitiseCrmIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return [String(raw)].filter(Boolean);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ===== CRM Suggest ===== */
router.get(
  "/companies/crm-suggest",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const q = (req.query.q || "").trim();
      const findQuery = q
        ? {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { email: { $regex: q, $options: "i" } },
              { phone: { $regex: q, $options: "i" } },
            ],
          }
        : {};
      const users = await User.find(findQuery)
        .select("name email phone role isSuperAdmin")
        .limit(15)
        .lean();

      res.json(
        users.map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isSuperAdmin: u.isSuperAdmin,
        }))
      );
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Suggest failed" });
    }
  }
);

/* ===== Search Companies Across Collections ===== */
router.get(
  "/search-companies",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { query } = req.query;
      const regex = new RegExp(query, "i");

      const [companies, potentialClients, vendors] = await Promise.all([
        Company.find({ companyName: regex, deleted: { $ne: true } })
          .select("companyName clients")
          .lean(),
        PotentialClient.find({ companyName: regex })
          .select("companyName contacts")
          .lean(),
        Vendor.find({ vendorName: regex, deleted: { $ne: true } })
          .select("vendorName clients")
          .lean(),
      ]);

      const results = [
        ...companies.map((c) => ({
          _id: c._id,
          name: c.companyName,
          type: "Client",
          clients: c.clients,
        })),
        ...potentialClients.map((pc) => ({
          _id: pc._id,
          name: pc.companyName,
          type: "Potential Client",
          clients: pc.contacts,
        })),
        ...vendors.map((v) => ({
          _id: v._id,
          name: v.vendorName,
          type: "Vendor",
          clients: v.clients,
        })),
      ];

      res.json(results);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Search failed" });
    }
  }
);

/* ===== Create ===== */
router.post(
  "/companies",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
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
        remarks,
        clients: rawClients = [],
        crmIncharge: rawCrm = [], // <-- NEW
      } = req.body;

      if (!companyName || !pincode)
        return res.status(400).json({ message: "Company name and pincode are required" });

      if (await Company.findOne({ companyName: new RegExp(`^${companyName}$`, "i") }))
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
        remarks,
        clients: sanitiseClients(rawClients),
        crmIncharge: sanitiseCrmIds(rawCrm),
        createdBy: req.user.id,
        logs: [createLogEntry(req, "create")],
      });

      const populated = await Company.findById(doc._id)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .populate("crmIncharge", "name email");

      res.status(201).json({ message: "Company created", company: populated });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Create failed" });
    }
  }
);

/* ===== List ===== */
router.get(
  "/companies",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { companyName } = req.query;
      const query = { deleted: { $ne: true } };

      if (companyName) {
        const safe = escapeRegex(companyName);
        query.companyName = { $regex: `^${safe}$`, $options: "i" };
      }

      const companies = await Company.find(query)
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .populate("crmIncharge", "name email");

      res.json(companies);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Fetch failed" });
    }
  }
);

/* ===== Single ===== */
router.get(
  "/companies/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const c = await Company.findById(req.params.id)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .populate("deletedBy", "name email")
        .populate("crmIncharge", "name email");
      if (!c) return res.status(404).json({ message: "Not found" });
      res.json(c);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Fetch failed" });
    }
  }
);

/* ===== Update ===== */
router.put(
  "/companies/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
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
        remarks,
        clients: rawClients,
        crmIncharge: rawCrm, // <-- NEW
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
        if (value !== undefined) {
          const v = field === "clients" ? sanitiseClients(value)
            : field === "crmIncharge" ? sanitiseCrmIds(value)
            : value;
          if (!isEqual(v, doc[field])) {
            updates[field] = v;
            logs.push(createLogEntry(req, "update", field, doc[field], v));
          }
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
      check("remarks", remarks);
      check("clients", rawClients);
      check("crmIncharge", rawCrm); // <-- NEW

      if (!Object.keys(updates).length)
        return res.json({ message: "No changes", company: doc });

      updates.updatedAt = new Date();
      updates.updatedBy = req.user.id;

      const updated = await Company.findByIdAndUpdate(
        req.params.id,
        { $set: updates, $push: { logs: { $each: logs } } },
        { new: true, runValidators: true }
      )
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .populate("crmIncharge", "name email");

      res.json({ message: "Updated", company: updated, changes: logs });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Update failed" });
    }
  }
);

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
        .populate("logs.performedBy", "name email") // Already present
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .populate("deletedBy", "name email")
        .populate("crmIncharge", "name email");
      if (!c) return res.status(404).json({ message: "Not found" });

      // Transform logs to include performedBy details more clearly
      const transformedLogs = c.logs.map(log => ({
        ...log.toObject(),
        performedBy: log.performedBy ? {
          _id: log.performedBy._id,
          name: log.performedBy.name,
          email: log.performedBy.email
        } : null
      }));

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
          crmIncharge: c.crmIncharge,
        },
        logs: transformedLogs,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Fetch logs failed" });
    }
  }
);

/* ===== Logs (all) ===== */
router.get(
  "/logs",
  authenticate,
  authorizeAdmin,
  async (_req, res) => {
    try {
      const companies = await Company.find()
        .populate("logs.performedBy", "name email") // NEW: Populate performedBy
        .select("companyName logs")
        .lean();
      
      // Flatten logs and include company name and performedBy details
      const logs = companies.flatMap((c) =>
        (c.logs || []).map((l) => ({
          ...l,
          companyName: c.companyName,
          performedBy: l.performedBy ? {
            _id: l.performedBy._id,
            name: l.performedBy.name,
            email: l.performedBy.email
          } : null
        }))
      );
      
      logs.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
      res.json({ logs });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Fetch logs failed" });
    }
  }
);

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
          Remarks: "Priority client",
          "CRM Incharge Emails (comma)": "jane@acme.com,john@acme.com", // <-- NEW
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
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r["Company Name*"] || !r["Pincode*"]) {
          errors.push(`Row ${i + 2}: Company Name and Pincode required`);
          continue;
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

        // map CRM emails -> user ids (best-effort)
        let crmIncharge = [];
        if (r["CRM Incharge Emails (comma)"]) {
          const emails = String(r["CRM Incharge Emails (comma)"])
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (emails.length) {
            const foundUsers = await User.find({ email: { $in: emails } }).select("_id email");
            const mapSet = new Set(foundUsers.map((u) => String(u._id)));
            crmIncharge = Array.from(mapSet);
          }
        }

        toCreate.push({
          companyName: r["Company Name*"],
          brandName: r["Brand Name"] || "",
          GSTIN: r["GSTIN"] || "",
          companyAddress: r["Company Address"] || "",
          pincode: r["Pincode*"].toString(),
          remarks: r["Remarks"] || "",
          crmIncharge, // <-- NEW
          clients,
          createdBy: req.user.id,
          logs: [createLogEntry(req, "create")],
        });
      }

      if (errors.length) return res.status(400).json({ message: "Errors", errors });

      const inserted = await Company.insertMany(toCreate);
      res.status(201).json({ message: "Bulk upload done", count: inserted.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Bulk upload failed" });
    }
  }
);

/* ===== Add Contact (by companyName) ===== */
router.put(
  "/companies/:companyName/add-contact",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { companyName, contact } = req.body;
      if (!contact.name || !contact.contactNumber) {
        return res.status(400).json({ message: "Contact name and number are required" });
      }
      const doc = await Company.findOne({
        companyName: new RegExp(`^${escapeRegex(companyName)}$`, "i"),
      });
      if (!doc) return res.status(404).json({ message: "Company not found" });
      doc.clients.push(contact);
      doc.logs.push(createLogEntry(req, "add-contact", "clients", null, contact));
      await doc.save();
      res.json({ message: "Contact added", contact });
    } catch (e) {
      console.error("Error adding contact:", e);
      res.status(500).json({ message: "Add contact failed" });
    }
  }
);

module.exports = router;
