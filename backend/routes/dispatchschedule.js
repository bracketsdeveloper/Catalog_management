// routes/dispatchschedule.js
const express = require("express");
const router = express.Router();

const PendingPacking = require("../models/PendingPacking");
const DispatchSchedule = require("../models/DispatchSchedule");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* -------------------------------------------------------------- */
/* GET  /api/admin/dispatch-schedule (aggregated)                  */
/* -------------------------------------------------------------- */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    /* rows eligible for dispatch = packing rows that are Completed */
    const packingRows = await PendingPacking.find({ status: "Completed" }).lean();
    const saved = await DispatchSchedule.find({}).lean();

    const savedMap = {};
    saved.forEach((d) => (savedMap[d.pendingPackingId.toString()] = d));

    const merged = packingRows.map((p) => {
      const existing = savedMap[p._id.toString()];
      if (existing) return existing;

      return {
        pendingPackingId: p._id,
        jobSheetCreatedDate: p.jobSheetCreatedDate,
        jobSheetNumber: p.jobSheetNumber,
        expectedDeliveryDate: p.expectedDeliveryDate,
        clientCompanyName: p.clientCompanyName,
        eventName: p.eventName,
        product: p.product,
        batchType: "Batch",
        jobSheetValidated: "No",
        status: "none",
      };
    });

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching Dispatch Schedule" });
  }
});

/* create */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exists = await DispatchSchedule.findOne({
      pendingPackingId: req.body.pendingPackingId,
    });
    if (exists) {
      return res.status(400).json({ message: "Row already exists – use PUT" });
    }
    const doc = new DispatchSchedule({ ...req.body, createdBy: req.user.email });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Create failed" });
  }
});

/* update */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updated = await DispatchSchedule.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;
