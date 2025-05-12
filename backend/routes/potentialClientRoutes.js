const express = require("express");
const PotentialClient = require("../models/PotentialClient");
const User = require("../models/User");
const multer = require("multer");
const xlsx = require("xlsx");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB max, 1 file
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files allowed."), false);
    }
  },
});

function makeLog(req, action, field = null, oldValue = null, newValue = null) {
  return {
    action,
    field,
    oldValue,
    newValue,
    performedBy: req.user._id,
    performedAt: new Date(),
    ipAddress: req.ip,
  };
}

/** CREATE */
router.post(
  "/potential-clients",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { companyName, contacts } = req.body;
      const pc = new PotentialClient({
        companyName,
        contacts,
        createdBy: req.user._id,
        logs: [makeLog(req, "create")],
      });
      await pc.save();
      res.status(201).json({ message: "Created", potentialClient: pc });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
);

/** BULK UPLOAD */
router.post(
  "/upload-potential-clients",
  authenticate,
  authorizeAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Please upload a file" });
      }

      // Read and parse Excel
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      if (!data.length) {
        return res.status(400).json({ message: "No data found in the file" });
      }

      // Group contacts by companyName
      const grouped = {};
      for (const row of data) {
        const companyName = row.companyName?.trim();
        if (!companyName) continue;

        if (!grouped[companyName]) {
          grouped[companyName] = [];
        }

        grouped[companyName].push({
          clientName: row.clientName?.trim(),
          designation: row.designation?.trim(),
          source: row.source?.trim(),
          mobile: row.mobile?.toString().trim(),
          email: row.email?.trim(),
          location: row.location?.trim(),
          assignedTo: req.user._id,
        });
      }

      // Create potential clients with contacts
      const potentialClients = await Promise.all(
        Object.entries(grouped).map(async ([companyName, contacts]) => {
          const pc = new PotentialClient({
            companyName,
            contacts,
            createdBy: req.user._id,
            logs: [makeLog(req, "bulk-create")],
          });
          return pc.save();
        })
      );

      res.status(201).json({
        message: "Potential clients uploaded successfully",
        potentialClients,
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ message: "Bulk upload failed" });
    }
  }
);

/** READ ALL (with populated createdBy & contacts.assignedTo) */
router.get(
  "/potential-clients",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { filter = "my", searchTerm, all } = req.query;
      const userId = req.user._id;
      const isSuperAdmin = req.user.isSuperAdmin; // Assuming isSuperAdmin is set in req.user
      const and = [];

      // 1) filter scope
      if (all === "true" && isSuperAdmin) {
        // Superadmin with ?all=true: no filtering, return all potential clients
      } else if (filter === "my") {
        and.push({ createdBy: userId });
      } else if (filter === "team") {
        // any contact assigned to me, but not created by me
        and.push(
          { "contacts.assignedTo": userId },
          { createdBy: { $ne: userId } }
        );
      }
      // filter === "all" (non-superadmin): no extra clause, but still subject to other filters

      // 2) text search across all fields
      if (searchTerm) {
        const re = new RegExp(searchTerm, "i");
        and.push({
          $or: [
            { companyName: re },
            { "contacts.clientName": re },
            { "contacts.designation": re },
            { "contacts.source": re },
            { "contacts.mobile": re },
            { "contacts.email": re },
            { "contacts.location": re },
          ],
        });
      }

      const query = and.length ? { $and: and } : {};

      const list = await PotentialClient.find(query)
        .sort({ createdAt: -1 })
        .populate("createdBy", "name")
        .populate("contacts.assignedTo", "name")
        .lean();

      res.json(list);
    } catch (err) {
      console.error("Error fetching potential clients:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/** READ ONE */
router.get(
  "/potential-clients/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const pc = await PotentialClient.findById(req.params.id)
        .populate("createdBy", "name")
        .populate("contacts.assignedTo", "name")
        .lean();
      if (!pc) return res.status(404).json({ message: "Not found" });
      res.json(pc);
    } catch (err) {
      console.error("Error fetching that potential client:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/** UPDATE */
router.put(
  "/potential-clients/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const pc = await PotentialClient.findById(req.params.id);
      if (!pc) return res.status(404).json({ message: "Not found" });

      const logs = [];

      if (req.body.companyName && req.body.companyName !== pc.companyName) {
        logs.push(
          makeLog(
            req,
            "update",
            "companyName",
            pc.companyName,
            req.body.companyName
          )
        );
        pc.companyName = req.body.companyName;
      }

      if (req.body.contacts) {
        logs.push(
          makeLog(req, "update", "contacts", pc.contacts, req.body.contacts)
        );
        pc.contacts = req.body.contacts;
      }

      if (logs.length) pc.logs.push(...logs);

      await pc.save();
      res.json({ message: "Updated", potentialClient: pc, logs });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
);

/** DELETE */
router.delete(
  "/potential-clients/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const pc = await PotentialClient.findById(req.params.id);
      if (!pc) return res.status(404).json({ message: "Not found" });

      pc.logs.push(makeLog(req, "delete"));
      await pc.save();
      await PotentialClient.findByIdAndDelete(req.params.id);

      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;