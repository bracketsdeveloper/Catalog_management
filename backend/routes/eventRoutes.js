const express = require("express");
const Event = require("../models/Event");
const Company = require("../models/Company");
const PotentialClient = require("../models/PotentialClient");
const Vendor = require("../models/Vendor");
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
    ipAddress: req.ip,
  };
}

// Build & sanitize schedules array from raw input
function buildSchedules(raw = []) {
  return raw
    .map((s) => {
      const sch = {};
      if (!s.scheduledOn) {
        console.warn("Skipping schedule with missing scheduledOn:", s);
        return null;
      }
      if (s.scheduledOn) sch.scheduledOn = new Date(s.scheduledOn);
      if (s.action) sch.action = s.action;
      if (s.assignedTo) sch.assignedTo = s.assignedTo;
      if (s.discussion) sch.discussion = s.discussion;
      if (s.status) sch.status = s.status;
      if (s.reschedule) sch.reschedule = new Date(s.reschedule);
      if (s.remarks) sch.remarks = s.remarks;
      return sch;
    })
    .filter(Boolean);
}

// Helper to populate company details
async function populateCompany(event) {
  let companyDoc = null;
  if (event.company && event.companyType) {
    if (event.companyType === "Client") {
      companyDoc = await Company.findById(event.company).select("companyName").lean();
    } else if (event.companyType === "Potential Client") {
      companyDoc = await PotentialClient.findById(event.company).select("companyName").lean();
    } else if (event.companyType === "Vendor") {
      companyDoc = await Vendor.findById(event.company).select("vendorName").lean();
    }
  }
  return {
    ...event,
    companyName: companyDoc
      ? companyDoc.companyName || companyDoc.vendorName || event.companyName
      : event.companyName,
  };
}

/** CREATE Event **/
router.post("/events", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { company: companyId, companyType, schedules: rawSchedules } = req.body;
    const schedules = buildSchedules(rawSchedules);

    let companyName = "";
    if (companyId && companyType) {
      if (companyType === "Client") {
        const company = await Company.findById(companyId).lean();
        companyName = company?.companyName || "";
      } else if (companyType === "Potential Client") {
        const pc = await PotentialClient.findById(companyId).lean();
        companyName = pc?.companyName || "";
      } else if (companyType === "Vendor") {
        const vendor = await Vendor.findById(companyId).lean();
        companyName = vendor?.vendorName || "";
      }
    }

    const ev = new Event({
      company: companyId,
      companyType,
      companyName,
      schedules,
      createdBy: req.user._id,
      logs: [makeLog(req, "create")],
    });

    await ev.save();
    const populatedEvent = await populateCompany(ev.toObject());
    res.status(201).json({ message: "Created", event: populatedEvent });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(400).json({ message: err.message });
  }
});

/** READ All / Filtered Events **/
router.get("/events", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { filter } = req.query; // 'my' | 'team' | 'all'
    const userId = req.user._id;
    let query = {};

    if (filter === "my") {
      query.createdBy = userId;
    } else if (filter === "team") {
      query["schedules.assignedTo"] = userId;
    } else if (filter === "all") {
      query = {};
    } else {
      query.createdBy = userId;
    }

    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .populate("schedules.assignedTo", "name")
      .populate("createdBy", "name")
      .lean();

    const populatedEvents = await Promise.all(events.map(populateCompany));
    res.json(populatedEvents);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** READ ALL Events for Calendar **/
router.get("/eventscal", authenticate, async (req, res) => {
  try {
    const isSuperAdmin = req.user.isSuperAdmin;
    let query = {};

    if (!isSuperAdmin) {
      // Non-super-admins see events they created or are assigned to
      query = {
        $or: [
          { createdBy: req.user._id },
          { "schedules.assignedTo": req.user._id },
        ],
      };
    }

    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .populate("schedules.assignedTo", "name")
      .populate("createdBy", "name")
      .lean();

    const populatedEvents = await Promise.all(events.map(populateCompany));
    res.json(populatedEvents);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/** UPDATE Event **/
router.put("/events/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Not found" });

    const { company: companyId, companyType, schedules: rawSchedules } = req.body;
    let updates = {};

    if (companyId && companyType) {
      let companyName = "";
      if (companyType === "Client") {
        const company = await Company.findById(companyId).lean();
        companyName = company?.companyName || "";
      } else if (companyType === "Potential Client") {
        const pc = await PotentialClient.findById(companyId).lean();
        companyName = pc?.companyName || "";
      } else if (companyType === "Vendor") {
        const vendor = await Vendor.findById(companyId).lean();
        companyName = vendor?.vendorName || "";
      }
      updates.company = companyId;
      updates.companyType = companyType;
      updates.companyName = companyName;
      ev.logs.push(makeLog(req, "update", "company", ev.company, companyId));
      ev.logs.push(makeLog(req, "update", "companyType", ev.companyType, companyType));
      ev.logs.push(makeLog(req, "update", "companyName", ev.companyName, companyName));
    }

    if (Array.isArray(rawSchedules)) {
      const newSchedules = buildSchedules(rawSchedules);
      ev.logs.push(makeLog(req, "update", "schedules", ev.schedules, newSchedules));
      updates.schedules = newSchedules;
    }

    if (Object.keys(updates).length) {
      Object.assign(ev, updates);
      await ev.save();
    }

    const populatedEvent = await populateCompany(ev.toObject());
    res.json({ message: "Updated", event: populatedEvent });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(400).json({ message: err.message });
  }
});

/** DELETE Event **/
router.delete("/events/:id", authenticate, authorizeAdmin, async (req, res) => {
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
});

module.exports = router;