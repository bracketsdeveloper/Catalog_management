const express = require("express");
const router = express.Router();
const InvoicesSummary = require("../models/InvoiceSummary");
const DispatchSchedule = require("../models/DispatchSchedule");
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
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

    const dispatchRows = await DispatchSchedule.find({
      status: "sent",
      _id: { $in: dispatchIds },
    }).lean();

    const savedSummaries = await InvoicesSummary.find({}).lean();

    const followUpMap = {};
    invoiceFollowUps.forEach((f) => {
      if (f.dispatchId) {
        followUpMap[f.dispatchId.toString()] = f;
      }
    });

    const summaryMap = {};
    savedSummaries.forEach((s) => {
      const key = `${s.dispatchId.toString()}-${s.invoiceNumber}`;
      summaryMap[key] = s;
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
        const key = `${d._id.toString()}-${invoiceNumber}`;
        const existing = summaryMap[key] || {};

        return {
          _id: existing._id || undefined,
          dispatchId: d._id,
          jobSheetNumber: followUp.jobSheetNumber || "",
          clientCompanyName: followUp.clientCompanyName || "",
          eventName: followUp.eventName || "",
          invoiceNumber,
          invoiceDate: existing.invoiceDate || null,
          invoiceAmount: existing.invoiceAmount || 0,
          invoiceMailed: existing.invoiceMailed || "No",
          invoiceUploadedOnPortal: existing.invoiceUploadedOnPortal || "",
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
    const exists = await InvoicesSummary.findOne({
      dispatchId: req.body.dispatchId,
      invoiceNumber: req.body.invoiceNumber,
    });
    if (exists) {
      return res.status(400).json({ message: "Row already exists – use PUT" });
    }
    const doc = new InvoicesSummary({
      ...req.body,
      createdBy: req.user.email,
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Create failed" });
  }
});

router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updated = await InvoicesSummary.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;