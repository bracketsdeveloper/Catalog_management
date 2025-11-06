const express = require("express");
const router = express.Router();
const { parse } = require("date-fns");
const Opportunity = require("../models/Opportunity");
const Counter = require("../models/Counter");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose");
const User = require("../models/User");

/* ---------------- utils ---------------- */
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

// Helper function to escape special regex characters
function escapeRegex(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function generateOpportunityCode() {
  const counter = await Counter.findOneAndUpdate(
    { id: "opportunityCode" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq.toString().padStart(4, "0");
}

/* ---------------- routes ---------------- */

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
    const { filter, searchTerm, userName } = req.query;
    const currentUserName = req.user.name;

    const andConditions = [];

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
      }
    }

    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), "i");
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

    const query = andConditions.length ? { $and: andConditions } : {};

    const opportunities = await Opportunity.find(query).sort({ createdAt: -1 }).lean();
    res.json(opportunities);
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res.status(500).json({ message: "Server error fetching opportunities" });
  }
});

router.get("/opportunities-export", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      filter,
      searchTerm,
      userName,
      opportunityStage,
      closureFromDate,
      closureToDate,
      createdFilter,
    } = req.query;

    // ---- helpers ----
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    function getCreatedRange(label) {
      if (!label || label === "All") return null;

      const now = new Date();
      const startOfDay = (d) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
      };
      const endOfDay = (d) => {
        const x = new Date(d);
        x.setHours(23, 59, 59, 999);
        return x;
      };

      const firstDayOfWeek = () => {
        const d = new Date();
        // Assuming week starts on Monday; adjust if you use Sunday
        const day = d.getDay() || 7; // 1..7
        if (day !== 1) d.setDate(d.getDate() - (day - 1));
        return startOfDay(d);
      };
      const lastWeekRange = () => {
        const startThisWeek = firstDayOfWeek();
        const startLastWeek = new Date(startThisWeek);
        startLastWeek.setDate(startLastWeek.getDate() - 7);
        const endLastWeek = new Date(startThisWeek);
        endLastWeek.setMilliseconds(-1); // day before this week start
        return { $gte: startLastWeek, $lte: endLastWeek };
      };
      const firstDayOfMonth = (d = new Date()) =>
        new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const lastMonthRange = () => {
        const firstThisMonth = firstDayOfMonth();
        const firstLastMonth = new Date(firstThisMonth);
        firstLastMonth.setMonth(firstLastMonth.getMonth() - 1);
        const endLastMonth = new Date(firstThisMonth.getTime() - 1);
        return { $gte: firstLastMonth, $lte: endLastMonth };
      };
      const firstDayOfYear = (y = new Date().getFullYear()) =>
        new Date(y, 0, 1, 0, 0, 0, 0);

      switch (label) {
        case "Today":
          return { $gte: startOfDay(now), $lte: endOfDay(now) };
        case "Yesterday": {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return { $gte: startOfDay(y), $lte: endOfDay(y) };
        }
        case "This Week":
          return { $gte: firstDayOfWeek(), $lte: endOfDay(now) };
        case "Last Week":
          return lastWeekRange();
        case "This Month":
          return { $gte: firstDayOfMonth(), $lte: endOfDay(now) };
        case "Last Month":
          return lastMonthRange();
        case "This Year":
          return { $gte: firstDayOfYear(), $lte: endOfDay(now) };
        case "Last Year": {
          const lastYear = now.getFullYear() - 1;
          const start = firstDayOfYear(lastYear);
          const end = new Date(firstDayOfYear(now.getFullYear()) - 1);
          return { $gte: start, $lte: end };
        }
        default:
          return null;
      }
    }

    const currentUserName = req.user.name;
    const andConditions = [];

    // Ownership / scope
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
        // default: all
      }
    }

    // Search
    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), "i");
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

    // Stage filter
    if (opportunityStage && opportunityStage !== "All") {
      andConditions.push({ opportunityStage });
    }

    // Closure date range (yyyy-mm-dd)
    if (closureFromDate || closureToDate) {
      const range = {};
      if (closureFromDate) range.$gte = new Date(closureFromDate);
      if (closureToDate) {
        const to = new Date(closureToDate);
        to.setHours(23, 59, 59, 999);
        range.$lte = to;
      }
      andConditions.push({ closureDate: range });
    }

    // Created filter (matches your FilterPanel options)
    const createdRange = getCreatedRange(createdFilter);
    if (createdRange) {
      andConditions.push({ createdAt: createdRange });
    }

    const query = andConditions.length ? { $and: andConditions } : {};

    const opportunities = await Opportunity.find(query)
      .select(
        "opportunityCode createdAt account opportunityName opportunityDetail opportunityOwner opportunityValue closureDate opportunityStage opportunityStatus"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ opportunities });
  } catch (error) {
    console.error("Error fetching opportunities (export):", error);
    res.status(500).json({ message: "Server error fetching opportunities" });
  }
});


router.get("/opportunities-pages", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      filter,
      searchTerm,
      userName,
      opportunityStage,
      closureFromDate,
      closureToDate,
      createdFilter,
    } = req.query;

    // Strict parse & clamp page/limit
    const parsedPage = parseInt(String(req.query.page ?? ""), 10);
    const parsedLimit = parseInt(String(req.query.limit ?? ""), 10);
    let pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    let limitNum =
      Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 500 ? parsedLimit : 100;

    const skip = (pageNum - 1) * limitNum;

    const currentUserName = req.user.name;
    const andConditions = [];

    // Ownership filter
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
      }
    }

    // Search term
    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), "i");
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

    // Stage filter
    if (opportunityStage && opportunityStage !== "All") {
      andConditions.push({ opportunityStage });
    }

    // Closure date range (expecting yyyy-mm-dd)
    if (closureFromDate || closureToDate) {
      const range = {};
      if (closureFromDate) {
        range.$gte = new Date(closureFromDate);
      }
      if (closureToDate) {
        const to = new Date(closureToDate);
        to.setHours(23, 59, 59, 999);
        range.$lte = to;
      }
      andConditions.push({ closureDate: range });
    }

    // Created filter (Today / 7days / 30days / ...)
    if (createdFilter && createdFilter !== "All") {
      const now = new Date();
      let from;
      switch (createdFilter) {
        case "Today":
          from = new Date();
          from.setHours(0, 0, 0, 0);
          break;
        case "7days":
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      if (from) {
        andConditions.push({ createdAt: { $gte: from } });
      }
    }

    const query = andConditions.length ? { $and: andConditions } : {};

    // Deterministic sort (stable paging)
    const sortSpec = { createdAt: -1, _id: -1 };

    if (process.env.NODE_ENV !== "production") {
      console.log("[/opportunities-pages] page:", pageNum, "limit:", limitNum, "skip:", skip);
    }

    const [opportunities, total] = await Promise.all([
      Opportunity.find(query).sort(sortSpec).skip(skip).limit(limitNum).lean(),
      Opportunity.countDocuments(query),
    ]);

    res.json({
      opportunities,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      currentPage: pageNum,
      totalOpportunities: total,
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res.status(500).json({ message: "Server error fetching opportunities" });
  }
});

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
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

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
