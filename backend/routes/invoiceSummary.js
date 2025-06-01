const express = require("express");
const router = express.Router();
const InvoicesSummary = require("../models/InvoiceSummary");
const DispatchSchedule = require("../models/DispatchSchedule");
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoiceFollowUps = await InvoiceFollowUp.find({}).lean();
    if (!invoiceFollowUps.length) {
      return res.json([]);
    }

    const dispatchIds = invoiceFollowUps
      .map((f) => f.dispatchId)
      .filter((id) => id);

    const [dispatchRows, jobSheets, savedSummaries] = await Promise.all([
      DispatchSchedule.find({
        status: "sent",
        _id: { $in: dispatchIds },
      }).lean(),
      JobSheet.find({}).lean(),
      InvoicesSummary.find({}).lean(),
    ]);

    const followUpMap = {};
    invoiceFollowUps.forEach((f) => {
      if (f.dispatchId) {
        followUpMap[f.dispatchId.toString()] = f;
      }
    });

    const summaryMap = {};
    savedSummaries.forEach((s) => {
      summaryMap[s.invoiceNumber] = s;
    });

    const jobSheetMap = {};
    jobSheets.forEach((j) => {
      jobSheetMap[j.jobSheetNumber] = {
        clientName: j.clientName || "",
        crmName: j.crmIncharge || "",
      };
    });

    const dispatchMap = {};
    dispatchRows.forEach((d) => {
      const followUp = followUpMap[d._id.toString()];
      if (!followUp) return;

      const jobSheetNumber = followUp.jobSheetNumber || "";
      if (!jobSheetNumber) {
        console.warn(`Missing jobSheetNumber for dispatchId ${d._id}`);
        return;
      }

      if (
        !dispatchMap[jobSheetNumber] ||
        new Date(d.sentOn) > new Date(dispatchMap[jobSheetNumber].sentOn)
      ) {
        dispatchMap[jobSheetNumber] = d;
      }
    });

    const uniqueDispatchRows = Object.values(dispatchMap);

    const merged = uniqueDispatchRows.flatMap((d) => {
      const followUp = followUpMap[d._id.toString()];
      const invoiceNumbers = followUp.invoiceNumber
        ? followUp.invoiceNumber.split(",").map((n) => n.trim()).filter(Boolean)
        : [];

      return invoiceNumbers.map((invoiceNumber) => {
        const existing = summaryMap[invoiceNumber] || {};
        const jobSheet = jobSheetMap[followUp.jobSheetNumber] || {};

        return {
          _id: existing._id || undefined,
          dispatchId: d._id,
          jobSheetNumber: followUp.jobSheetNumber || "",
          clientCompanyName: followUp.clientCompanyName || "",
          clientName: jobSheet.clientName || "",
          eventName: followUp.eventName || "",
          invoiceNumber,
          invoiceDate: existing.invoiceDate || null,
          invoiceAmount: existing.invoiceAmount || 0,
          invoiceMailed: existing.invoiceMailed || "No",
          invoiceMailedOn: existing.invoiceMailedOn || null, // Include new field
          invoiceUploadedOnPortal: existing.invoiceUploadedOnPortal || "",
          crmName: jobSheet.crmName || "",
        };
      });
    });

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching Invoices Summary" });
  }
});

router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { dispatchId, invoiceNumber, jobSheetNumber, invoiceMailedOn } = req.body;

    // Split invoiceNumber if comma-separated
    const invoiceNumbers = invoiceNumber
      ? invoiceNumber.split(",").map((n) => n.trim()).filter(Boolean)
      : [];

    if (!invoiceNumbers.length) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    const results = [];
    for (const invNum of invoiceNumbers) {
      // Check for existing invoiceNumber
      const exists = await InvoicesSummary.findOne({
        invoiceNumber: invNum,
      });
      if (exists) {
        return res
          .status(400)
          .json({ message: `Invoice number ${invNum} already exists` });
      }

      // Fetch jobSheet for clientName and crmName
      const jobSheet = jobSheetNumber
        ? await JobSheet.findOne({ jobSheetNumber }).lean()
        : null;

      const doc = new InvoicesSummary({
        ...req.body,
        invoiceNumber: invNum,
        invoiceMailedOn: invoiceMailedOn ? new Date(invoiceMailedOn) : null, // Handle new field
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
        .json({ message: `Invoice number already exists` });
    }
    res.status(500).json({ message: "Create failed", error: err.message });
  }
});

router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { invoiceNumber, jobSheetNumber, invoiceMailedOn } = req.body;

    // If invoiceNumber is being updated, check for conflicts
    if (invoiceNumber) {
      const existing = await InvoicesSummary.findOne({
        invoiceNumber,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res
          .status(400)
          .json({ message: `Invoice number ${invoiceNumber} already exists` });
      }
    }

    // Fetch jobSheet for clientName and crmName
    const jobSheet = jobSheetNumber
      ? await JobSheet.findOne({ jobSheetNumber }).lean()
      : null;

    const updated = await InvoicesSummary.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        invoiceMailedOn: invoiceMailedOn ? new Date(invoiceMailedOn) : null, // Handle new field
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
        .json({ message: `Invoice number already exists` });
    }
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;