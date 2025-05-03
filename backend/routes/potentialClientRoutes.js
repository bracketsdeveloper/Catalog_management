const express = require("express");
const PotentialClient = require("../models/PotentialClient");
const User            = require("../models/User");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

const router = express.Router();

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

/** READ ALL (with populated createdBy & contacts.assignedTo) */
router.get(
  "/potential-clients",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { filter = "my", searchTerm } = req.query;
      const userId = req.user._id;
      const and = [];

      // 1) filter scope
      if (filter === "my") {
        and.push({ createdBy: userId });
      } else if (filter === "team") {
        // any contact assigned to me, but not created by me
        and.push(
          { "contacts.assignedTo": userId },
          { createdBy: { $ne: userId } }
        );
      }
      // filter === "all": no extra clause

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
