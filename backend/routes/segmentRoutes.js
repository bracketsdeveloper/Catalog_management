const express = require("express");
const router = express.Router();
const Segment = require("../models/Segment");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * CREATE
 */
router.post("/segments", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { segmentName, priceQueries = [], quantityQueries = [] } = req.body;
    if (!segmentName) {
      return res.status(400).json({ message: "Segment name is required" });
    }
    const exists = await Segment.findOne({ segmentName });
    if (exists) {
      return res.status(400).json({ message: "Segment already exists" });
    }
    const doc = await Segment.create({
      segmentName,
      priceQueries,
      quantityQueries,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: "Segment created", segment: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Create failed" });
  }
});

/**
 * LIST
 */
router.get("/segments", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const segments = await Segment.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json(segments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Fetch failed" });
  }
});

/**
 * GET ONE
 */
router.get("/segments/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const seg = await Segment.findById(req.params.id);
    if (!seg) return res.status(404).json({ message: "Not found" });
    res.json(seg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Fetch failed" });
  }
});

/**
 * UPDATE
 */
router.put("/segments/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { segmentName, priceQueries, quantityQueries } = req.body;
    const doc = await Segment.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    const updates = {};
    if (segmentName && segmentName !== doc.segmentName) {
      const dup = await Segment.findOne({ segmentName, _id: { $ne: doc._id } });
      if (dup) return res.status(400).json({ message: "Name exists" });
      updates.segmentName = segmentName;
    }
    if (Array.isArray(priceQueries)) {
      updates.priceQueries = priceQueries;
    }
    if (Array.isArray(quantityQueries)) {
      updates.quantityQueries = quantityQueries;
    }
    if (!Object.keys(updates).length) {
      return res.status(200).json({ message: "No changes", segment: doc });
    }
    updates.updatedAt = new Date();
    const updated = await Segment.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({ message: "Updated", segment: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

/**
 * DELETE
 */
router.delete("/segments/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    await Segment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;