const express = require("express");
const router = express.Router();
const { parse } = require("date-fns");
const Opportunity = require("../models/Opportunity");
const Counter = require("../models/Counter");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose");
const User = require("../models/User");

function isEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (!a || !b || (typeof a !== "object" && typeof b !== "object")) return a === b;
  if (a.prototype !== b.prototype) return false;

  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((k) => isEqual(a[k], b[k]));
}

function createLogEntry(req, action, field, oldValue, newValue) {
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

async function generateOpportunityCode() {
  const counter = await Counter.findOneAndUpdate(
    { id: "opportunityCode" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq.toString().padStart(4, "0");
}

router.post("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    if (req.body.closureDate) {
      req.body.closureDate = parse(req.body.closureDate, "dd/MM/yyyy", new Date());
    }

    const code = await generateOpportunityCode();

    const newOpportunity = new Opportunity({
      ...req.body,
      opportunityCode: req.body.opportunityCode || code,
      createdBy: req.user._id?.toString() || "System",
      logs: [createLogEntry(req, "create", null, null, null)],
    });

    if (newOpportunity.createdBy !== newOpportunity.opportunityOwner) {
      newOpportunity.teamMembers.push({
        teamMemberCode: newOpportunity.createdBy,
        userName: req.user.name,
        description: "Team member added automatically",
        isActive: true,
      });
    }

    await newOpportunity.save();
    res.status(201).json({ message: "Opportunity created", opportunity: newOpportunity });
  } catch (error) {
    console.error("Error creating opportunity:", error);
    res.status(500).json({ message: "Server error creating opportunity" });
  }
});

router.get("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      filter,
      searchTerm,
      userName,
      page = 1,
      limit = 100,
      opportunityStage,
      closureFromDate,
      closureToDate,
      createdFilter,
    } = req.query;
    const currentUserName = req.user.name;

    // Validate query parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const andConditions = [];

    // User-based filtering
    if (userName && req.user.isSuperAdmin) {
      andConditions.push({ opportunityOwner: userName });
    } else {
      switch (filter) {
        case "my":
          andConditions.push({ opportunityOwner: currentUserName });
          break;
        case "team":
          andConditions.push(
            { "teamMembers.userName": currentUserName },
            { opportunityOwner: { $ne: currentUserName } }
          );
          break;
        default:
          if (!req.user.isSuperAdmin) {
            // Restrict non-super admins to their own or team opportunities
            andConditions.push({
              $or: [
                { opportunityOwner: currentUserName },
                { "teamMembers.userName": currentUserName },
              ],
            });
          }
          break;
      }
    }

    // Search term filtering
    if (searchTerm) {
      const sanitizedSearchTerm = escapeRegex(searchTerm);
      const regex = new RegExp(sanitizedSearchTerm, "i");
      andConditions.push({
        $or: [
          { opportunityCode: regex },
          { opportunityName: regex },
          { account: regex },
          { contact: regex },
          { opportunityStage: regex },
          { opportunityStatus: regex },
          { opportunityDetail: regex },
          { opportunityOwner: regex },
          { createdBy: regex },
          { dealRegistrationNumber: regex },
          { freeTextField: regex },
        ],
      });
    }

    // Opportunity stage filtering
    if (opportunityStage && opportunityStage !== "All") {
      andConditions.push({ opportunityStage });
    }

    // Closure date filtering
    if (closureFromDate) {
      const fromDate = new Date(closureFromDate);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ message: "Invalid closureFromDate format" });
      }
      andConditions.push({ closureDate: { $gte: fromDate } });
    }

    if (closureToDate) {
      const toDate = new Date(closureToDate);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid closureToDate format" });
      }
      andConditions.push({ closureDate: { $lte: toDate } });
    }

    // Created date filtering
    if (createdFilter && createdFilter !== "All") {
      const now = new Date();
      let start, end;
      switch (createdFilter) {
        case "Today":
          start = new Date(now.setHours(0, 0, 0, 0));
          end = new Date(start);
          end.setDate(end.getDate() + 1);
          break;
        case "Yesterday":
          end = new Date(now.setHours(0, 0, 0, 0));
          start = new Date(end);
          start.setDate(start.getDate() - 1);
          break;
        case "This Week":
          start = new Date(now.setDate(now.getDate() - now.getDay()));
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 7);
          break;
        case "Last Week":
          end = new Date(now.setDate(now.getDate() - now.getDay()));
          end.setHours(0, 0, 0, 0);
          start = new Date(end);
          start.setDate(start.getDate() - 7);
          break;
        case "This Month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "Last Month":
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "This Year":
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear() + 1, 0, 1);
          break;
        case "Last Year":
          start = new Date(now.getFullYear() - 1, 0, 1);
          end = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          return res.status(400).json({ message: "Invalid createdFilter value" });
      }
      if (start && end) {
        andConditions.push({ createdAt: { $gte: start, $lt: end } });
      }
    }

    // Build query
    const query = andConditions.length ? { $and: andConditions } : {};
    const skip = (pageNum - 1) * limitNum;

    // Log query for debugging
    console.log("Executing query:", JSON.stringify(query, null, 2));

    // Execute query
    const [opportunities, total] = await Promise.all([
      Opportunity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Opportunity.countDocuments(query),
    ]);

    // Log results for debugging
    console.log(`Found ${opportunities.length} opportunities, total: ${total}`);

    res.json({
      opportunities,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      totalOpportunities: total,
    });
  } catch (error) {
    console.error("Error fetching opportunities:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({
      message: "Server error fetching opportunities",
      error: error.message,
    });
  }
});

// Helper function to escape special regex characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/opportunities/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }
    res.json(opportunity);
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    res.status(500).json({ message: "Server error fetching opportunity" });
  }
});

router.put("/opportunities/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    if (!req.body.opportunityCode && !opportunity.opportunityCode) {
      const newCode = await generateOpportunityCode();
      req.body.opportunityCode = newCode;
    }

    if (req.body.closureDate) {
      req.body.closureDate = parse(req.body.closureDate, "dd/MM/yyyy", new Date());
    }

    const fieldsToCheck = [
      "opportunityName",
      "account",
      "contact",
      "opportunityType",
      "opportunityStage",
      "opportunityStatus",
      "opportunityDetail",
      "opportunityValue",
      "currency",
      "leadSource",
      "closureDate",
      "closureProbability",
      "grossProfit",
      "opportunityPriority",
      "isRecurring",
      "dealRegistrationNumber",
      "freeTextField",
      "opportunityOwner",
      "opportunityCode",
      "isActive",
      "teamMembers",
      "products",
      "contacts",
      "mediaItems",
      "competitors",
      "notes",
    ];

    const logs = [];
    fieldsToCheck.forEach((field) => {
      if (req.body[field] !== undefined) {
        const oldVal = opportunity[field];
        const newVal = req.body[field];
        if (!isEqual(oldVal, newVal)) {
          logs.push(createLogEntry(req, "update", field, oldVal, newVal));
          opportunity[field] = newVal;
        }
      }
    });

    if (logs.length === 0) {
      return res.status(200).json({ message: "No changes detected", opportunity });
    }

    opportunity.logs.push(...logs);
    await opportunity.save();

    res.json({ message: "Opportunity updated", opportunity, changes: logs });
  } catch (error) {
    console.error("Error updating opportunity:", error);
    res.status(500).json({ message: "Server error updating opportunity" });
  }
});

router.delete("/opportunities/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    opportunity.logs.push(createLogEntry(req, "delete", null, opportunity.opportunityName, null));
    await opportunity.save();

    await Opportunity.findByIdAndDelete(req.params.id);

    res.json({ message: "Opportunity deleted" });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    res.status(500).json({ message: "Server error deleting opportunity" });
  }
});

router.get("/opportunities/logs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const allOpps = await Opportunity.find().select("opportunityName logs").lean();
    let allLogs = allOpps.flatMap((opp) =>
      (opp.logs || []).map((log) => ({
        ...log,
        opportunityName: opp.opportunityName,
      }))
    );
    allLogs.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
    res.json({ logs: allLogs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

router.post("/opportunities/logs/latest", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { opportunityIds } = req.body;
    if (!Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty opportunity IDs" });
    }

    const objectIds = opportunityIds
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return res.status(400).json({ message: "No valid opportunity IDs provided" });
    }

    const opportunities = await Opportunity.aggregate([
      { $match: { _id: { $in: objectIds } } },
      { $unwind: "$logs" },
      { $sort: { "logs.performedAt": -1 } },
      {
        $group: {
          _id: "$_id",
          latestLog: { $first: "$logs" },
          opportunityName: { $first: "$opportunityName" },
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
          opportunityId: "$_id",
          action: "$latestLog.action",
          field: "$latestLog.field",
          performedBy: {
            $ifNull: [
              { _id: "$performedBy._id", email: "$performedBy.email", name: "$performedBy.name" },
              { email: "Unknown", name: "Unknown" },
            ],
          },
          performedAt: "$latestLog.performedAt",
          opportunityName: 1,
        },
      },
    ]);

    const latestLogs = {};
    opportunityIds.forEach((id) => {
      const log = opportunities.find((l) => l.opportunityId.toString() === id);
      latestLogs[id] = log
        ? {
            action: log.action,
            field: log.field,
            performedBy: log.performedBy,
            performedAt: log.performedAt,
            opportunityName: log.opportunityName,
          }
        : {};
    });

    res.json(latestLogs);
  } catch (error) {
    console.error("Error fetching latest logs:", error);
    res.status(500).json({ message: "Server error fetching latest logs" });
  }
});

module.exports = router;