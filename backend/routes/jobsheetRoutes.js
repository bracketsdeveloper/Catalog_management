const express = require("express");
const router = express.Router();
const JobSheet = require("../models/JobSheet");
const Log = require("../models/Log");
const Opportunity = require("../models/Opportunity");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose");

async function createLog(action, oldValue, newValue, user, ip) {
  try {
    await Log.create({
      action,
      field: "jobsheet",
      oldValue,
      newValue,
      performedBy: user?._id || null,
      performedAt: new Date(),
      ipAddress: ip,
    });
  } catch (err) {
    console.error("Error creating job sheet log:", err);
  }
}

// Create a new job sheet (POST)
router.post("/jobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      eventName,
      opportunityNumber,
      orderDate,
      clientCompanyName,
      clientName,
      contactNumber,
      deliveryDate,
      deliveryTime,
      crmIncharge,
      items,
      poNumber,
      poStatus,
      deliveryType,
      deliveryMode,
      deliveryCharges,
      deliveryAddress = [],
      brandingFileName,
      giftBoxBagsDetails,
      packagingInstructions,
      otherDetails,
      referenceQuotation,
      isDraft = false,
    } = req.body;

    if (
      !orderDate ||
      !clientCompanyName ||
      !clientName ||
      !deliveryDate ||
      !items ||
      items.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Missing required fields or no items provided" });
    }

    const filteredAddresses = Array.isArray(deliveryAddress)
      ? deliveryAddress.filter((addr) => addr.trim() !== "")
      : [];

    const newJobSheet = new JobSheet({
      eventName,
      opportunityNumber,
      orderDate,
      clientCompanyName,
      clientName,
      contactNumber,
      deliveryDate,
      deliveryTime,
      crmIncharge,
      items,
      poNumber,
      poStatus,
      deliveryType,
      deliveryMode,
      deliveryCharges,
      deliveryAddress: filteredAddresses,
      brandingFileName,
      giftBoxBagsDetails,
      packagingInstructions,
      otherDetails,
      referenceQuotation,
      createdBy: req.user.email,
      isDraft: !!isDraft,
    });

    const savedJobSheet = await newJobSheet.save();
    await createLog("create", null, savedJobSheet, req.user, req.ip);

    res.status(201).json({
      message: "Job sheet created",
      jobSheet: savedJobSheet,
    });
  } catch (error) {
    console.error("Error creating job sheet:", error);
    res.status(500).json({ message: "Server error creating job sheet" });
  }
});

// GET /jobsheets with pagination, search, and filters
router.get("/jobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      draftOnly,
      searchQuery,
      orderFromDate,
      orderToDate,
      deliveryFromDate,
      deliveryToDate,
      page = 1,
      limit = 100,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const andConditions = [];

    // Draft filter
    if (draftOnly === "true") {
      andConditions.push({ isDraft: true, createdBy: req.user.email });
    } else {
      andConditions.push({
        $or: [{ isDraft: false }, { isDraft: { $exists: false } }],
      });
    }

    // Search filter
    if (searchQuery) {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      andConditions.push({
        $or: [
          { clientCompanyName: regex },
          { eventName: regex },
          { referenceQuotation: regex },
          { clientName: regex },
          { jobSheetNumber: regex },
        ],
      });
    }

    // Order date filter
    if (orderFromDate) {
      const fromDate = new Date(orderFromDate);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ message: "Invalid orderFromDate format" });
      }
      andConditions.push({ orderDate: { $gte: fromDate } });
    }
    if (orderToDate) {
      const toDate = new Date(orderToDate);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid orderToDate format" });
      }
      andConditions.push({ orderDate: { $lte: toDate } });
    }

    // Delivery date filter
    if (deliveryFromDate) {
      const fromDate = new Date(deliveryFromDate);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ message: "Invalid deliveryFromDate format" });
      }
      andConditions.push({ deliveryDate: { $gte: fromDate } });
    }
    if (deliveryToDate) {
      const toDate = new Date(deliveryToDate);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid deliveryToDate format" });
      }
      andConditions.push({ deliveryDate: { $lte: toDate } });
    }

    const query = andConditions.length ? { $and: andConditions } : {};
    const skip = (pageNum - 1) * limitNum;

    console.log("Executing job sheets query:", JSON.stringify(query, null, 2));

    const [jobSheets, total] = await Promise.all([
      JobSheet.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      JobSheet.countDocuments(query),
    ]);

    console.log(`Found ${jobSheets.length} job sheets, total: ${total}`);

    res.json({
      jobSheets,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      totalJobSheets: total,
    });
  } catch (error) {
    console.error("Error fetching job sheets:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({
      message: "Server error fetching job sheets",
      error: error.message,
    });
  }
});

// GET /jobsheets/:id
router.get("/jobsheets/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;

    const filter = isObjectId
      ? { $or: [{ _id: id }, { jobSheetNumber: id }] }
      : { jobSheetNumber: id };

    const jobSheet = await JobSheet.findOne(filter);
    if (!jobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }

    if (jobSheet.isDraft && jobSheet.createdBy !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Forbidden: you are not the owner of this draft." });
    }

    res.json(jobSheet);
  } catch (error) {
    console.error("Error fetching job sheet:", error);
    res.status(500).json({ message: "Server error fetching job sheet" });
  }
});

// PUT /jobsheets/:id
router.put("/jobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    if (Array.isArray(req.body.deliveryAddress)) {
      req.body.deliveryAddress = req.body.deliveryAddress.filter(
        (addr) => addr.trim() !== ""
      );
    }

    if (typeof req.body.isDraft !== "undefined") {
      req.body.isDraft = !!req.body.isDraft;
    }

    if (Array.isArray(req.body.items)) {
      req.body.items = req.body.items.map((item) => ({
        ...item,
        brandingType: Array.isArray(item.brandingType)
          ? item.brandingType
          : typeof item.brandingType === "string" && item.brandingType.trim() !== ""
          ? [item.brandingType]
          : [],
      }));
    }

    const jobSheet = await JobSheet.findById(req.params.id);
    if (!jobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }

    if (jobSheet.isDraft && jobSheet.createdBy !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Forbidden: you are not the owner of this draft." });
    }

    const updatedJobSheet = await JobSheet.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    await createLog("update", jobSheet, updatedJobSheet, req.user, req.ip);

    res.json({ message: "Job sheet updated", jobSheet: updatedJobSheet });
  } catch (error) {
    console.error("Error updating job sheet:", error);
    res.status(500).json({ message: "Server error updating job sheet" });
  }
});

// DELETE /jobsheets/:id
router.delete("/jobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobSheet = await JobSheet.findById(req.params.id);
    if (!jobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }

    if (jobSheet.isDraft && jobSheet.createdBy !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Forbidden: you are not the owner of this draft." });
    }

    await JobSheet.findByIdAndDelete(req.params.id);
    await createLog("delete", jobSheet, null, req.user, req.ip);

    res.json({ message: "Job sheet deleted" });
  } catch (error) {
    console.error("Error deleting job sheet:", error);
    res.status(500).json({ message: "Server error deleting job sheet" });
  }
});

// POST /jobsheets/logs/latest
router.post("/jobsheets/logs/latest", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetIds } = req.body;
    if (!Array.isArray(jobSheetIds) || jobSheetIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty job sheet IDs" });
    }

    const objectIds = jobSheetIds.map((id) => new mongoose.Types.ObjectId(id));

    const logs = await Log.aggregate([
      { $match: { field: "jobsheet" } },
      {
        $match: {
          $or: [{ "newValue._id": { $in: objectIds } }, { "oldValue._id": { $in: objectIds } }],
        },
      },
      { $sort: { performedAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$newValue._id", null] }, "$newValue._id", "$oldValue._id"],
          },
          latestLog: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "latestLog.performedBy",
          foreignField: "_id",
          as: "performedBy",
        },
      },
      { $unwind: { path: "$performedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          jobSheetId: "$_id",
          action: "$latestLog.action",
          performedBy: { $ifNull: ["$performedBy", { email: "Unknown" }] },
          performedAt: "$latestLog.performedAt",
        },
      },
    ]);

    const latestLogs = {};
    jobSheetIds.forEach((id) => {
      const log = logs.find((l) => l.jobSheetId.toString() === id);
      latestLogs[id] = log
        ? {
            action: log.action,
            performedBy: log.performedBy,
            performedAt: log.performedAt,
          }
        : {};
    });

    console.log("Latest logs response:", JSON.stringify(latestLogs, null, 2));

    res.json(latestLogs);
  } catch (err) {
    console.error("Error fetching latest logs:", err);
    res.status(500).json({ message: "Server error fetching latest logs" });
  }
});

// GET /opportunities/suggestions
router.get("/opportunities/suggestions", authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.json([]);
    }

    const regex = new RegExp(search, "i");
    const opportunities = await Opportunity.find({
      $or: [{ opportunityCode: regex }, { opportunityName: regex }],
    })
      .select("opportunityCode opportunityName")
      .limit(10)
      .lean();

    res.json(opportunities);
  } catch (error) {
    console.error("Error fetching opportunity suggestions:", error);
    res.status(500).json({ message: "Server error fetching opportunity suggestions" });
  }
});

module.exports = router;