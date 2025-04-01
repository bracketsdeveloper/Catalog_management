const express = require("express");
const router = express.Router();
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Create a new job sheet
router.post("/jobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      eventName,
      orderDate,
      clientCompanyName,
      clientName,
      contactNumber,
      deliveryDate,
      deliveryTime,
      crmIncharge,
      items,
      poNumber,
      deliveryType,
      deliveryMode,
      deliveryCharges,
      deliveryAddress = [],
      giftBoxBagsDetails,
      packagingInstructions,
      otherDetails,
      referenceQuotation,
    } = req.body;

    if (!orderDate || !clientCompanyName || !clientName || !deliveryDate || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields or no items provided" });
    }

    // Filter out empty addresses
    const filteredAddresses = Array.isArray(deliveryAddress)
      ? deliveryAddress.filter(addr => addr.trim() !== '')
      : [];

    const newJobSheet = new JobSheet({
      eventName,
      orderDate,
      clientCompanyName,
      clientName,
      contactNumber,
      deliveryDate,
      deliveryTime,
      crmIncharge,
      items,
      poNumber,
      deliveryType,
      deliveryMode,
      deliveryCharges,
      deliveryAddress: filteredAddresses,
      giftBoxBagsDetails,
      packagingInstructions,
      otherDetails,
      referenceQuotation,
      createdBy: req.user.email,
    });

    await newJobSheet.save();
    res.status(201).json({ message: "Job sheet created", jobSheet: newJobSheet });
  } catch (error) {
    console.error("Error creating job sheet:", error);
    res.status(500).json({ message: "Server error creating job sheet" });
  }
});

// Get all job sheets
router.get("/jobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobSheets = await JobSheet.find().sort({ createdAt: -1 });
    res.json(jobSheets);
  } catch (error) {
    console.error("Error fetching job sheets:", error);
    res.status(500).json({ message: "Server error fetching job sheets" });
  }
});

// Get a single job sheet
router.get("/jobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobSheet = await JobSheet.findById(req.params.id);
    if (!jobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }
    res.json(jobSheet);
  } catch (error) {
    console.error("Error fetching job sheet:", error);
    res.status(500).json({ message: "Server error fetching job sheet" });
  }
});

// Update a job sheet
router.put("/jobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    if (Array.isArray(req.body.deliveryAddress)) {
      req.body.deliveryAddress = req.body.deliveryAddress.filter(addr => addr.trim() !== '');
    }
    const updatedJobSheet = await JobSheet.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedJobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }
    res.json({ message: "Job sheet updated", jobSheet: updatedJobSheet });
  } catch (error) {
    console.error("Error updating job sheet:", error);
    res.status(500).json({ message: "Server error updating job sheet" });
  }
});

// Delete a job sheet
router.delete("/jobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedJobSheet = await JobSheet.findByIdAndDelete(req.params.id);
    if (!deletedJobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }
    res.json({ message: "Job sheet deleted" });
  } catch (error) {
    console.error("Error deleting job sheet:", error);
    res.status(500).json({ message: "Server error deleting job sheet" });
  }
});

module.exports = router;
