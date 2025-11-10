// routes/admin/holidays.js
const express = require("express");
const router = express.Router();
const Holiday = require("../../models/Holiday");
const { authenticate, authorizeAdmin } = require("../../middleware/authenticate");

// Helpers
const isValidISODate = (s) => {
  if (!s) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
};

// List (optionally filter by type=PUBLIC|RESTRICTED, q for name, date range)
router.get("/holidays", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { type, q, from, to } = req.query;
    const filter = {};
    if (type === "PUBLIC" || type === "RESTRICTED") filter.type = type;
    if (q) filter.name = { $regex: q, $options: "i" };
    if (from || to) {
      filter.date = {};
      if (from && isValidISODate(from)) filter.date.$gte = new Date(from);
      if (to && isValidISODate(to)) filter.date.$lte = new Date(to);
    }

    const items = await Holiday.find(filter)
      .populate("createdBy", "name email")
      .sort({ date: 1, name: 1 });

    res.json({ holidays: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
});

// Create
router.post("/holidays", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { type, date, name } = req.body;

    if (!(type === "PUBLIC" || type === "RESTRICTED"))
      return res.status(400).json({ message: "Invalid type" });

    if (!isValidISODate(date))
      return res.status(400).json({ message: "Invalid date" });

    if (!name || !name.trim())
      return res.status(400).json({ message: "Holiday name required" });

    const doc = await Holiday.create({
      type,
      date: new Date(date),
      name: name.trim(),
      createdBy: req.user.id,
    });

    const populated = await doc.populate("createdBy", "name email");
    res.status(201).json({ message: "Created", holiday: populated });
  } catch (e) {
    if (e?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Already exists for this date and list" });
    }
    console.error(e);
    res.status(500).json({ message: "Create failed" });
  }
});

// Update (name, date)
router.put("/holidays/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name } = req.body;

    const payload = {};
    if (date) {
      if (!isValidISODate(date))
        return res.status(400).json({ message: "Invalid date" });
      payload.date = new Date(date);
    }
    if (name !== undefined) {
      if (!name || !name.trim())
        return res.status(400).json({ message: "Holiday name required" });
      payload.name = name.trim();
    }

    const updated = await Holiday.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Updated", holiday: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Already exists for this date and list" });
    }
    console.error(e);
    res.status(500).json({ message: "Update failed" });
  }
});

// Delete
router.delete("/holidays/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Holiday.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
