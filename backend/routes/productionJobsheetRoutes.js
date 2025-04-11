// routes/productionJobsheet.js
const express = require("express");
const router = express.Router();
const ProductionJobsheet = require("../models/ProductionJobsheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Utility function to update followUps with createdBy (if missing)
function populateFollowUps(items, userName) {
  if (items && Array.isArray(items)) {
    return items.map((item) => {
      if (item.followUps && Array.isArray(item.followUps)) {
        item.followUps = item.followUps.map((fu) => ({
          ...fu,
          createdBy: fu.createdBy || userName,
        }));
      }
      return item;
    });
  }
  return items;
}

// Create a new Production Jobsheet
router.post("/productionjobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const currentUser = req.user ? (req.user.email || req.user.name) : "Unknown User";
    // Populate createdBy for each follow-up in items if not provided
    req.body.items = populateFollowUps(req.body.items, currentUser);

    const newProdJobsheet = new ProductionJobsheet({ ...req.body, createdBy: currentUser });
    await newProdJobsheet.save();
    res.status(201).json({ message: "Production Jobsheet created", productionJobsheet: newProdJobsheet });
  } catch (error) {
    console.error("Error creating production jobsheet:", error);
    res.status(500).json({ message: "Server error creating production jobsheet", error: error.message });
  }
});

// Get all Production Jobsheets
router.get("/productionjobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobsheets = await ProductionJobsheet.find().sort({ createdAt: -1 });
    res.json(jobsheets);
  } catch (error) {
    console.error("Error fetching production jobsheets:", error);
    res.status(500).json({ message: "Server error fetching production jobsheets" });
  }
});

// Get a single Production Jobsheet by ID
router.get("/productionjobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobsheet = await ProductionJobsheet.findById(req.params.id);
    if (!jobsheet) {
      return res.status(404).json({ message: "Production jobsheet not found" });
    }
    res.json(jobsheet);
  } catch (error) {
    console.error("Error fetching production jobsheet:", error);
    res.status(500).json({ message: "Server error fetching production jobsheet" });
  }
});

// Update Production Jobsheet
router.put("/productionjobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const currentUser = req.user ? (req.user.email || req.user.name) : "Unknown User";
    // Ensure that every follow-up has createdBy populated
    req.body.items = populateFollowUps(req.body.items, currentUser);
    const updatedJobsheet = await ProductionJobsheet.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedJobsheet) {
      return res.status(404).json({ message: "Production jobsheet not found" });
    }
    res.json({ message: "Production jobsheet updated", productionJobsheet: updatedJobsheet });
  } catch (error) {
    console.error("Error updating production jobsheet:", error);
    res.status(500).json({ message: "Server error updating production jobsheet", error: error.message });
  }
});

// Delete Production Jobsheet
router.delete("/productionjobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedJobsheet = await ProductionJobsheet.findByIdAndDelete(req.params.id);
    if (!deletedJobsheet) {
      return res.status(404).json({ message: "Production jobsheet not found" });
    }
    res.json({ message: "Production jobsheet deleted" });
  } catch (error) {
    console.error("Error deleting production jobsheet:", error);
    res.status(500).json({ message: "Server error deleting production jobsheet" });
  }
});

module.exports = router;
