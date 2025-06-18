const express = require("express");
const router = express.Router();
const InvoicesSummary = require("../models/InvoiceSummary");
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log("Fetching InvoiceFollowUps with invoiceGenerated: Yes...");
    const invoiceFollowUps = await InvoiceFollowUp.find({ invoiceGenerated: "Yes" }).lean();
    console.log("InvoiceFollowUps:", invoiceFollowUps.length, invoiceFollowUps);

    if (!invoiceFollowUps.length) {
      console.log("No InvoiceFollowUps found");
      return res.json([]);
    }

    const [jobSheets, savedSummaries] = await Promise.all([
      JobSheet.find({}).lean(),
      InvoicesSummary.find({}).lean(),
    ]);
    console.log("JobSheets:", jobSheets.length);
    console.log("SavedSummaries:", savedSummaries.length);

    const summaryMap = {};
    savedSummaries.forEach((s) => {
      const key = `${s.dispatchId?.toString()}-${s.invoiceNumber}`;
      summaryMap[key] = s;
    });
    console.log("SummaryMap keys:", Object.keys(summaryMap));

    const jobSheetMap = {};
    jobSheets.forEach((j) => {
      jobSheetMap[j.jobSheetNumber] = {
        clientName: j.clientName || "",
        crmName: j.crmIncharge || "",
      };
    });
    console.log("JobSheetMap keys:", Object.keys(jobSheetMap));

    const merged = invoiceFollowUps.flatMap((followUp) => {
      const invoiceNumbers = followUp.invoiceNumber
        ? followUp.invoiceNumber.split(",").map((n) => n.trim()).filter(Boolean)
        : [];
      console.log(`FollowUp ${followUp._id}: InvoiceNumbers`, invoiceNumbers);

      return invoiceNumbers.map((invoiceNumber) => {
        const key = `${followUp.dispatchId?.toString()}-${invoiceNumber}`;
        const existing = summaryMap[key] || {};
        const jobSheet = jobSheetMap[followUp.jobSheetNumber] || {};

        return {
          _id: existing._id || undefined,
          dispatchId: followUp.dispatchId,
          jobSheetNumber: followUp.jobSheetNumber || "",
          clientCompanyName: followUp.clientCompanyName || "",
          clientName: jobSheet.clientName || "",
          eventName: followUp.eventName || "",
          invoiceNumber,
          invoiceDate: existing.invoiceDate || null,
          invoiceAmount: existing.invoiceAmount || 0,
          invoiceMailed: existing.invoiceMailed || "No",
          invoiceMailedOn: existing.invoiceMailedOn || null,
          invoiceUploadedOnPortal: existing.invoiceUploadedOnPortal || "",
          crmName: jobSheet.crmName || "",
        };
      });
    });
    console.log("Merged rows:", merged.length, merged);

    res.json(merged);
  } catch (err) {
    console.error("Error in GET /invoices-summary:", err);
    res.status(500).json({ message: "Server error fetching Invoices Summary" });
  }
});

router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { dispatchId, invoiceNumber, jobSheetNumber, invoiceMailedOn } = req.body;

    const invoiceNumbers = invoiceNumber
      ? invoiceNumber.split(",").map((n) => n.trim()).filter(Boolean)
      : [];

    if (!invoiceNumbers.length) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    const results = [];
    for (const invNum of invoiceNumbers) {
      const exists = await InvoicesSummary.findOne({
        dispatchId,
        invoiceNumber: invNum,
      });
      if (exists) {
        return res
          .status(400)
          .json({ message: `Invoice number ${invNum} already exists for this dispatch` });
      }

      const jobSheet = jobSheetNumber
        ? await JobSheet.findOne({ jobSheetNumber }).lean()
        : null;

      const doc = new InvoicesSummary({
        ...req.body,
        invoiceNumber: invNum,
        invoiceMailedOn: invoiceMailedOn ? new Date(invoiceMailedOn) : null,
        clientName: jobSheet?.clientName || "",
        crmName: jobSheet?.crmIncharge || "",
        createdBy: req.user.email,
      });
      await doc.save();
      results.push(doc);
    }

    res.status(201).json(results);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: `Invoice number already exists for this dispatch` });
    }
    res.status(500).json({ message: "Create failed", error: err.message });
  }
});

router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { dispatchId, invoiceNumber, jobSheetNumber, invoiceMailedOn } = req.body;

    if (invoiceNumber) {
      const existing = await InvoicesSummary.findOne({
        dispatchId,
        invoiceNumber,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: `Invoice number ${invoiceNumber} already exists for this dispatch` });
      }
    }

    const jobSheet = jobSheetNumber
      ? await JobSheet.findOne({ jobSheetNumber }).lean()
      : null;

    const updated = await InvoicesSummary.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        invoiceMailedOn: invoiceMailedOn ? new Date(invoiceMailedOn) : null,
        clientName: jobSheet?.clientName || "",
        crmName: jobSheet?.crmIncharge || "",
        updatedAt: Date.now(),
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: `Invoice number already exists for this dispatch` });
    }
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;