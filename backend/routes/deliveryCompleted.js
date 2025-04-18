const router = require("express").Router();
const DeliveryReport = require("../models/DeliveryReport");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * GET /api/admin/delivery-completed
 * Returns DeliveryReport rows where ALL rows of the same jobSheetNumber
 * (or jobSheetId) are status === "Delivered".
 *
 * If you key your reports by jobSheetId, flip the field below.
 */
router.get("/", authenticate, authorizeAdmin, async (_req, res) => {
  try {
    /* --------- ❶ aggregate job‑sheets fully delivered --------- */
    const fullyDelivered = await DeliveryReport.aggregate([
      {
        $group: {
          _id: "$jobSheetNumber", // ← change to "$jobSheetId" if you store the id
          total: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] },
          },
        },
      },
      { $match: { $expr: { $eq: ["$total", "$delivered"] } } },
    ]);

    const jobSheetNumbers = fullyDelivered.map((d) => d._id);
    if (jobSheetNumbers.length === 0) return res.json([]);

    /* --------- ❷ fetch the actual rows --------- */
    const rows = await DeliveryReport.find({
      jobSheetNumber: { $in: jobSheetNumbers },
    }).lean();

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error computing delivery completed" });
  }
});

module.exports = router;
