// routes/opportunityRoutes.js
const express = require("express");
const router = express.Router();
const Opportunity = require("../models/Opportunity");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * Utility to generate next opportunityCode.
 * WARNING: This simple approach can have race conditions if multiple opportunities
 * are created simultaneously. For production, consider a dedicated counter.
 */
async function generateOpportunityCode() {
  const count = await Opportunity.countDocuments();
  const nextNum = count + 1;
  return nextNum.toString().padStart(4, "0");
}

// CREATE an Opportunity
router.post("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Generate opportunityCode if not provided
    const code = await generateOpportunityCode();

    const opportunity = new Opportunity({
      ...req.body,
      opportunityCode: req.body.opportunityCode || code,
      createdBy: req.user._id, // store user ID
      logs: [
        {
          userName: req.user.name || "Unknown",
          action: "Created Opportunity",
          date: new Date(),
        },
      ],
    });

    await opportunity.save();
    res.status(201).json({ message: "Opportunity created", opportunity });
  } catch (error) {
    console.error("Error creating opportunity:", error);
    res.status(500).json({ message: "Server error creating opportunity" });
  }
});

// GET all Opportunities
router.get("/opportunities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const opportunities = await Opportunity.find().sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res.status(500).json({ message: "Server error fetching opportunities" });
  }
});

// GET single Opportunity
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

// UPDATE an Opportunity
router.put("/opportunities/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    // If opportunityCode is missing in both the request body and the existing document,
    // generate a new opportunityCode.
    if (!req.body.opportunityCode && !opportunity.opportunityCode) {
      const newCode = await generateOpportunityCode();
      req.body.opportunityCode = newCode;
    }

    // Merge updates into the existing document.
    Object.assign(opportunity, req.body);

    // Add a log entry for the update.
    opportunity.logs.push({
      userName: req.user.name || "Unknown",
      action: "Updated Opportunity",
      date: new Date(),
    });

    await opportunity.save();
    res.json({ message: "Opportunity updated", opportunity });
  } catch (error) {
    console.error("Error updating opportunity:", error);
    res.status(500).json({ message: "Server error updating opportunity" });
  }
});

// DELETE an Opportunity
router.delete("/opportunities/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    // Add a log entry before deletion.
    opportunity.logs.push({
      userName: req.user.name || "Unknown",
      action: "Deleted Opportunity",
      date: new Date(),
    });
    await opportunity.save();

    // Delete the document.
    await Opportunity.findByIdAndDelete(req.params.id);
    res.json({ message: "Opportunity deleted" });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    res.status(500).json({ message: "Server error deleting opportunity" });
  }
});

module.exports = router;
