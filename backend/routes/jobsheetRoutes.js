const express = require("express");
const router = express.Router();
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose")
// Create a new job sheet (POST)
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

      // Optional: isDraft status (default to false if not provided)
      isDraft = false,
    } = req.body;

    // Required fields check
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

    // Filter out empty addresses
    const filteredAddresses = Array.isArray(deliveryAddress)
      ? deliveryAddress.filter((addr) => addr.trim() !== "")
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

      // Store isDraft if passed
      isDraft: !!isDraft,
    });

    await newJobSheet.save();
    res.status(201).json({
      message: "Job sheet created",
      jobSheet: newJobSheet,
    });
  } catch (error) {
    console.error("Error creating job sheet:", error);
    res.status(500).json({ message: "Server error creating job sheet" });
  }
});

// GET /jobsheets
// - Accepts optional ?draftOnly=true
// - If draftOnly=true, return only the current user's drafts
// - Otherwise, return production sheets (isDraft=false or missing)
router.get("/jobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { draftOnly } = req.query;
    const filter = {};

    if (draftOnly === "true") {
      // Return only isDraft = true, created by current user
      filter.isDraft = true;
      filter.createdBy = req.user.email;
    } else {
      // Return production sheets: isDraft = false or missing
      filter.$or = [
        { isDraft: false },
        { isDraft: { $exists: false } }, // older docs with no field
      ];
    }

    const jobSheets = await JobSheet.find(filter).sort({ createdAt: -1 });
    res.json(jobSheets);
  } catch (error) {
    console.error("Error fetching job sheets:", error);
    res.status(500).json({ message: "Server error fetching job sheets" });
  }
});

// GET /jobsheets/:id
// - If the job sheet is a draft, only the creator can view it
// - Otherwise, it's visible to any authorized admin
router.get('/jobsheets/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && id.length === 24;

    const filter = isObjectId
      ? { $or: [{ _id: id }, { jobSheetNumber: id }] }
      : { jobSheetNumber: id };

      const jobSheet = await JobSheet.findOne(filter);
    if (!jobSheet) {
      return res.status(404).json({ message: 'Job sheet not found' });
    }

    if (jobSheet.isDraft && jobSheet.createdBy !== req.user.email) {
      return res
        .status(403)
        .json({ message: 'Forbidden: you are not the owner of this draft.' });
    }

    res.json(jobSheet);
  } catch (error) {
    console.error('Error fetching job sheet:', error);
    res.status(500).json({ message: 'Server error fetching job sheet' });
  }
});

// PUT /jobsheets/:id
// - If isDraft is provided, store it
// - If job sheet is a draft, only the creator can update it
// router.put("/jobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
//   try {
//     // Filter out empty addresses
//     if (Array.isArray(req.body.deliveryAddress)) {
//       req.body.deliveryAddress = req.body.deliveryAddress.filter(
//         (addr) => addr.trim() !== ""
//       );
//     }

//     // Check if isDraft is explicitly provided
//     if (typeof req.body.isDraft !== "undefined") {
//       req.body.isDraft = !!req.body.isDraft;
//     }

//     // First find the doc
//     const jobSheet = await JobSheet.findById(req.params.id);
//     if (!jobSheet) {
//       return res.status(404).json({ message: "Job sheet not found" });
//     }

//     // If it's a draft, ensure only the creator can update
//     if (jobSheet.isDraft === true && jobSheet.createdBy !== req.user.email) {
//       return res
//         .status(403)
//         .json({ message: "Forbidden: you are not the owner of this draft." });
//     }

//     // Now update the doc with the new data
//     const updatedJobSheet = await JobSheet.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );

//     res.json({ message: "Job sheet updated", jobSheet: updatedJobSheet });
//   } catch (error) {
//     console.error("Error updating job sheet:", error);
//     res.status(500).json({ message: "Server error updating job sheet" });
//   }
// });

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

    // Normalize brandingType if it exists
    if ("brandingType" in req.body) {
      req.body.brandingType = Array.isArray(req.body.brandingType)
        ? req.body.brandingType
        : typeof req.body.brandingType === "string" && req.body.brandingType.trim() !== ""
          ? [req.body.brandingType]
          : [];
    }

    const jobSheet = await JobSheet.findById(req.params.id);
    if (!jobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }

    if (jobSheet.isDraft === true && jobSheet.createdBy !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Forbidden: you are not the owner of this draft." });
    }

    const updatedJobSheet = await JobSheet.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ message: "Job sheet updated", jobSheet: updatedJobSheet });
  } catch (error) {
    console.error("Error updating job sheet:", error);
    res.status(500).json({ message: "Server error updating job sheet" });
  }
});


// DELETE /jobsheets/:id
// - If job sheet is a draft, only the creator can delete it
router.delete("/jobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobSheet = await JobSheet.findById(req.params.id);
    if (!jobSheet) {
      return res.status(404).json({ message: "Job sheet not found" });
    }

    // If it's a draft, ensure only the creator can delete
    if (jobSheet.isDraft === true && jobSheet.createdBy !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Forbidden: you are not the owner of this draft." });
    }

    await JobSheet.findByIdAndDelete(req.params.id);

    res.json({ message: "Job sheet deleted" });
  } catch (error) {
    console.error("Error deleting job sheet:", error);
    res.status(500).json({ message: "Server error deleting job sheet" });
  }
});

module.exports = router;
