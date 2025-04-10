// routes/opportunityRoutes.js

const express = require("express");
const router = express.Router();
const { parse } = require("date-fns"); // Import date-fns parse function
const Opportunity = require("../models/Opportunity");
const Counter = require("../models/Counter"); // Import the Counter model
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * Utility to compare two values deeply
 */
function isEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (!a || !b || (typeof a !== "object" && typeof b !== "object")) return a === b;
  if (a.prototype !== b.prototype) return false;

  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((k) => isEqual(a[k], b[k]));
}

/**
 * Utility to create a log entry
 */
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

/**
 * Utility to generate the next unique opportunityCode.
 * This uses a dedicated counter collection to ensure uniqueness.
 */
async function generateOpportunityCode() {
  const counter = await Counter.findOneAndUpdate(
    { id: "opportunityCode" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq.toString().padStart(4, "0");
}

/**
 * CREATE an Opportunity
 */
router.post("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Parse the closureDate from "dd/MM/yyyy" format to a Date object
    if (req.body.closureDate) {
      req.body.closureDate = parse(req.body.closureDate, "dd/MM/yyyy", new Date());
    }

    // Generate code if none provided
    const code = await generateOpportunityCode();

    // Create the new Opportunity
    const newOpportunity = new Opportunity({
      ...req.body,
      opportunityCode: req.body.opportunityCode || code,
      createdBy: req.user._id?.toString() || "System",
      logs: [createLogEntry(req, "create", null, null, null)],
    });

    // Check if the current user is not the opportunity owner, then add them to the team
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


/**
 * GET all Opportunities
 */
const User = require("../models/User"); // Import the User model

router.get("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { filter } = req.query;
    const userName = req.user.name; // Get current user's name

    let query = {};

    switch (filter) {
      case "my":
        // Directly use username for filtering
        query.opportunityOwner = userName;
        break;
      case "team":
        // Search in teamMembers by username
        query.$or = [
          { "teamMembers.userName": userName }
        ];
        break;
      // 'all' case remains default
    }

    const opportunities = await Opportunity.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(opportunities);
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res.status(500).json({ message: "Server error fetching opportunities" });
  }
});




/**
 * GET single Opportunity
 */
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

/**
 * UPDATE an Opportunity
 * - Compare fields to log what changed
 */
router.put("/opportunities/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    // Generate a code if missing
    if (!req.body.opportunityCode && !opportunity.opportunityCode) {
      const newCode = await generateOpportunityCode();
      req.body.opportunityCode = newCode;
    }

    // Parse the closureDate from "dd/MM/yyyy" format to a Date object
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
      "teamMembers",      // Add nested field here
      "products",         // And so on for other nested data
      "contacts",
      "mediaItems",
      "competitors",
      "notes"
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

/**
 * DELETE an Opportunity (hard delete)
 */
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

/**
 * COMMON LOGS route (aggregates logs for ALL opportunities)
 */
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

module.exports = router;
