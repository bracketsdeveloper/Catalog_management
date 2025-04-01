// routes/opportunityRoutes.js

const express = require("express");
const router = express.Router();
const Opportunity = require("../models/Opportunity");
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
    performedBy: req.user._id,  // store user ID
    performedAt: new Date(),
    ipAddress: req.ip,
  };
}

/**
 * Utility to generate next opportunityCode.
 * NOTE: This is a naive approach that can suffer from race conditions in production.
 */
async function generateOpportunityCode() {
  const count = await Opportunity.countDocuments();
  const nextNum = count + 1;
  return nextNum.toString().padStart(4, "0");
}

/**
 * CREATE an Opportunity
 */
router.post("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Generate code if none provided
    const code = await generateOpportunityCode();

    const newOpportunity = new Opportunity({
      ...req.body,
      opportunityCode: req.body.opportunityCode || code,
      createdBy: req.user._id?.toString() || "System",
      logs: [
        // Single log entry for creation
        createLogEntry(req, "create", null, null, null),
      ],
    });

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
router.get("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // For demonstration, returning ALL. You can add query filters if needed.
    const opportunities = await Opportunity.find().sort({ createdAt: -1 });
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
 *  - Compare fields to log what changed
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

    // Fields to watch for changes
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
      // etc. If you want to handle arrays like "products" individually, do so similarly
    ];

    // Collect log entries for changed fields
    const logs = [];
    fieldsToCheck.forEach((field) => {
      if (req.body[field] !== undefined) {
        const oldVal = opportunity[field];
        const newVal = req.body[field];
        if (!isEqual(oldVal, newVal)) {
          logs.push(createLogEntry(req, "update", field, oldVal, newVal));
          opportunity[field] = newVal; // update
        }
      }
    });

    // If nothing changed
    if (logs.length === 0) {
      return res.status(200).json({ message: "No changes detected", opportunity });
    }

    // If array fields changed, you could log them similarly
    // e.g. compare old products vs new products

    // Append logs
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

    // Log the delete
    opportunity.logs.push(
      createLogEntry(req, "delete", null, opportunity.opportunityName, null)
    );
    await opportunity.save();

    // Then truly remove from DB
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
// Example aggregator route in your server (opportunityRoutes.js):
router.get("/opportunities/logs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const allOpps = await Opportunity.find().select("opportunityName logs").lean();
    let allLogs = allOpps.flatMap((opp) =>
      (opp.logs || []).map((log) => ({
        ...log,
        opportunityName: opp.opportunityName,
      }))
    );
    // sort descending by performedAt
    allLogs.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
    res.json({ logs: allLogs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});


module.exports = router;
