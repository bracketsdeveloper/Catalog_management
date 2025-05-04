const express = require("express");
const Event   = require("../models/Event");
const PC      = require("../models/PotentialClient");
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
    ipAddress: req.ip
  };
}

/** CREATE **/
router.post(
  "/events",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { potentialClient, schedules: rawSchedules } = req.body;

      // sanitize schedules: remove empty assignedTo
      const schedules = (rawSchedules || []).map(s => {
        const c = { ...s };
        if (!c.assignedTo) delete c.assignedTo;
        return c;
      });

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

/** READ ALL **/
router.get(
  "/events",
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

/** UPDATE **/
router.put(
  "/events/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const ev = await Event.findById(req.params.id);
      if (!ev) return res.status(404).json({ message: "Not found" });

      const { schedules: rawSchedules } = req.body;
      const logs = [];

      if (Array.isArray(rawSchedules)) {
        // sanitize
        const schedules = rawSchedules.map(s => {
          const c = { ...s };
          if (!c.assignedTo) delete c.assignedTo;
          return c;
        });
        logs.push(makeLog(req, "update", "schedules", ev.schedules, schedules));
        ev.schedules = schedules;
      }

      if (logs.length) ev.logs.push(...logs);
      await ev.save();
      res.json({ message: "Updated", event: ev, logs });
    } catch (err) {
      console.error("Error updating event:", err);
      res.status(400).json({ message: err.message });
    }
  }
);

/** DELETE **/
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
