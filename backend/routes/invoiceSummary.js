// routes/invoicessummary.js
const express = require("express");
const router = express.Router();
const InvoicesSummary = require("../models/InvoiceSummary");
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const DispatchSchedule = require("../models/DispatchSchedule");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// GET all Invoices Summary records
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const summaries = await InvoicesSummary.find()
      .populate({
        path: "invoiceFollowUpId",
        select: "jobSheetNumber clientCompanyName eventName invoiceNumber",
      })
      .lean();
    console.log(`Fetched ${summaries.length} InvoicesSummary records`);
    res.json(summaries);
  } catch (err) {
    console.error("Error fetching InvoicesSummary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST a new Invoices Summary record
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      dispatchId,
      invoiceDate,
      invoiceAmount,
      invoiceMailed,
      invoiceUploadedOnPortal,
    } = req.body;

    // Verify DispatchSchedule
    const dispatch = await DispatchSchedule.findById(dispatchId);
    if (!dispatch || dispatch.status !== "sent") {
      console.log(`Invalid DispatchSchedule: ${dispatchId}`);
      return res.status(400).json({ message: "Invalid or non-sent DispatchSchedule" });
    }

    // Verify InvoiceFollowUp
    const invoiceFollowUp = await InvoiceFollowUp.findOne({ dispatchId });
    if (!invoiceFollowUp) {
      console.log(`InvoiceFollowUp not found for dispatchId: ${dispatchId}`);
      return res.status(400).json({ message: "InvoiceFollowUp not found for this DispatchSchedule" });
    }

    const summary = new InvoicesSummary({
      dispatchId,
      invoiceFollowUpId: invoiceFollowUp._id,
      jobSheetNumber: invoiceFollowUp.jobSheetNumber,
      clientCompanyName: invoiceFollowUp.clientCompanyName,
      eventName: invoiceFollowUp.eventName,
      invoiceNumber: invoiceFollowUp.invoiceNumber,
      invoiceDate,
      invoiceAmount,
      invoiceMailed,
      invoiceUploadedOnPortal,
      createdBy: req.user.email,
    });

    await summary.save();
    console.log(`Created InvoicesSummary: ${summary._id}`);
    res.status(201).json(summary);
  } catch (err) {
    console.error("Error creating InvoicesSummary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update an Invoices Summary record
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      invoiceDate,
      invoiceAmount,
      invoiceMailed,
      invoiceUploadedOnPortal,
    } = req.body;

    const summary = await InvoicesSummary.findById(req.params.id);
    if (!summary) {
      console.log(`InvoicesSummary not found: ${req.params.id}`);
      return res.status(404).json({ message: "Invoices Summary not found" });
    }

    summary.invoiceDate = invoiceDate || summary.invoiceDate;
    summary.invoiceAmount = invoiceAmount || summary.invoiceAmount;
    summary.invoiceMailed = invoiceMailed || summary.invoiceMailed;
    summary.invoiceUploadedOnPortal = invoiceUploadedOnPortal || summary.invoiceUploadedOnPortal;
    summary.updatedAt = Date.now();
    summary.createdBy = req.user.email;

    await summary.save();
    console.log(`Updated InvoicesSummary: ${summary._id}`);
    res.json(summary);
  } catch (err) {
    console.error("Error updating InvoicesSummary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;