// routes/eventRoutes.js
const express = require("express");
const Event   = require("../models/Event");
const PC      = require("../models/PotentialClient");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

const router = express.Router();

// Helper to create audit logs
function makeLog(req, action, field = null, oldValue = null, newValue = null) {
  return {
    action,
    field,
    oldValue,
    newValue,
    performedBy: req.user._id,
    performedAt: new Date(),
    ipAddress: req.ip
  };
}

// Build & sanitize schedules array from raw input
function buildSchedules(raw = []) {
  return raw.map(s => {
    const sch = {};
    if (s.scheduledOn)    sch.scheduledOn = new Date(s.scheduledOn);
    if (s.action)         sch.action      = s.action;
    if (s.assignedTo)     sch.assignedTo  = s.assignedTo;
    if (s.discussion)     sch.discussion  = s.discussion;
    if (s.status)         sch.status      = s.status;
    if (s.reschedule)     sch.reschedule  = new Date(s.reschedule);
    if (s.remarks)        sch.remarks     = s.remarks; 
    return sch;
  });
}

/** CREATE Event **/
router.post(  
  "/events",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { potentialClient, schedules: rawSchedules } = req.body;
      const schedules = buildSchedules(rawSchedules);

      let pcName = "";
      if (potentialClient) {
        const pc = await PC.findById(potentialClient).lean();
        pcName = pc?.companyName || "";
      }

      const ev = new Event({
        potentialClient,
        potentialClientName: pcName,
        schedules,
        createdBy: req.user._id,
        logs: [makeLog(req, "create")]
      });

      await ev.save();
      res.status(201).json({ message: "Created", event: ev });
    } catch (err) {
      console.error("Error creating event:", err);
      res.status(400).json({ message: err.message });
    }
  }
);

/** READ All / Filtered Events **/
router.get(
  "/events",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { filter } = req.query; // 'my' | 'team' | 'all'
      const userId = req.user._id;
      let query = {};

      if (filter === "my") {
        // only events the user created
        query.createdBy = userId;
      } else if (filter === "team") {
        // any event where the user appears in schedules.assignedTo
        query["schedules.assignedTo"] = userId;
      } else if (filter === "all") {
        // no additional filter (superadmins only)
        query = {};
      } else {
        // default to "my"
        query.createdBy = userId;
      }

      const list = await Event.find(query)
        .sort({ createdAt: -1 })
        .populate("potentialClient", "companyName")
        .populate("schedules.assignedTo", "name")
        .populate("createdBy", "name")
        .lean();

      res.json(list);
    } catch (err) {
      console.error("Error fetching events:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/** READ ALL Events **/
router.get(
  "/eventscal",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const list = await Event.find()
        .sort({ createdAt: -1 })
        .populate("potentialClient", "companyName")
        .populate("schedules.assignedTo", "name")
        .populate("createdBy", "name")
        .lean();
      res.json(list);
    } catch (err) {
      console.error("Error fetching events:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/** UPDATE Event **/
router.put(
  "/events/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const ev = await Event.findById(req.params.id);
      if (!ev) return res.status(404).json({ message: "Not found" });

      const { schedules: rawSchedules } = req.body;
      if (Array.isArray(rawSchedules)) {
        const newSchedules = buildSchedules(rawSchedules);
        ev.logs.push(
          makeLog(req, "update", "schedules", ev.schedules, newSchedules)
        );
        ev.schedules = newSchedules;
      }

      await ev.save();
      res.json({ message: "Updated", event: ev });
    } catch (err) {
      console.error("Error updating event:", err);
      res.status(400).json({ message: err.message });
    }
  }
);

/** DELETE Event **/
router.delete(
  "/events/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const ev = await Event.findById(req.params.id);
      if (!ev) return res.status(404).json({ message: "Not found" });

      ev.logs.push(makeLog(req, "delete"));
      await ev.save();
      await Event.findByIdAndDelete(req.params.id);

      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("Error deleting event:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
