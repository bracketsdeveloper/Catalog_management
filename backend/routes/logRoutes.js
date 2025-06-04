const express = require("express");
const router = express.Router();
const Log = require("../models/Log");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

router.post("/logs/latest", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { quotationIds } = req.body;
    if (!Array.isArray(quotationIds) || quotationIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty quotation IDs" });
    }

    // Aggregate to find the latest log for each quotation ID
    const logs = await Log.aggregate([
      { $match: { field: "quotation" } },
      {
        $match: {
          $or: [
            { "newValue._id.$oid": { $in: quotationIds } },
            { "oldValue._id.$oid": { $in: quotationIds } }
          ]
        }
      },
      { $sort: { performedAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $ifNull: ["$newValue._id.$oid", null] },
              "$newValue._id.$oid",
              "$oldValue._id.$oid"
            ]
          },
          latestLog: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "latestLog.performedBy",
          foreignField: "_id",
          as: "performedBy"
        }
      },
      { $unwind: { path: "$performedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          quotationId: "$_id",
          action: "$latestLog.action",
          performedBy: { $ifNull: ["$performedBy", { email: "Unknown" }] },
          performedAt: "$latestLog.performedAt"
        }
      }
    ]);

    // Create a map of quotation IDs to their latest log entry
    const latestLogs = {};
    quotationIds.forEach(id => {
      const log = logs.find(l => l.quotationId === id);
      latestLogs[id] = log ? {
        action: log.action,
        performedBy: log.performedBy,
        performedAt: log.performedAt
      } : {};
    });

    // Log response for debugging
    console.log("Latest logs response:", JSON.stringify(latestLogs, null, 2));

    res.json(latestLogs);
  } catch (err) {
    console.error("Error fetching latest logs:", err);
    res.status(500).json({ message: "Server error fetching latest logs" });
  }
});

module.exports = router;