const express = require("express");
const router = express.Router();
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const DispatchSchedule = require("../models/DispatchSchedule");
const JobSheet = require("../models/JobSheet");
const DeliveryReport = require("../models/DeliveryReport");
const Quotation = require("../models/Quotation");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* GET /api/admin/invoice-followup?view={new|old|closed} */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { view = "old" } = req.query; // Default to "old" view
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    let rows = [];

    if (view === "new") {
      // Fetch from JobSheets created today
      const jobSheets = await JobSheet.find({
        createdAt: { $gte: today },
        isDraft: { $ne: true }, // Exclude drafts
      }).lean();

      const quotationMap = Object.fromEntries(
        (await Quotation.find({}).lean()).map(q => [q.quotationNumber, q.grandTotal])
      );

      rows = jobSheets.map(j => {
        const dispatchedOn = j.deliveryDate || today;
        const pendingFromDays = Math.floor(
          (today - new Date(dispatchedOn)) / (1000 * 60 * 60 * 24)
        );

        return {
          orderDate: j.orderDate,
          jobSheetNumber: j.jobSheetNumber,
          clientCompanyName: j.clientCompanyName,
          clientName: j.clientName,
          eventName: j.eventName,
          quotationNumber: j.referenceQuotation || "",
          crmName: j.crmIncharge || "",
          product: j.items[0]?.product || "", // First item product
          dispatchedOn,
          deliveredThrough: "",
          poStatus: j.poStatus || "",
          partialQty: 0,
          invoiceGenerated: "No",
          invoiceNumber: "",
          quotationTotal: quotationMap[j.referenceQuotation] || 0,
          pendingFromDays,
        };
      });
    } else {
      // Fetch for "old" or "closed" view
      const dispatchRows = await DispatchSchedule.find({ status: "sent" }).lean();
      const savedFollowUps = await InvoiceFollowUp.find({}).lean();
      const jobSheets = await JobSheet.find({}).lean();
      const deliveryReports = await DeliveryReport.find({}).lean();
      const quotations = await Quotation.find({}).lean();

      const followUpMap = Object.fromEntries(
        savedFollowUps.filter(f => f.dispatchId).map(f => [f.dispatchId.toString(), f])
      );
      const jobSheetMap = Object.fromEntries(
        jobSheets.map(j => [j.jobSheetNumber, j])
      );
      const deliveryReportMap = Object.fromEntries(
        deliveryReports.filter(d => d.dispatchId).map(d => [d.dispatchId.toString(), d])
      );
      const quotationMap = Object.fromEntries(
        quotations.map(q => [q.quotationNumber, q.grandTotal])
      );

      // Merge records for "old" view
      const merged = dispatchRows.map(d => {
        const existing = followUpMap[d._id.toString()];
        const jobSheet = jobSheetMap[d.jobSheetNumber] || {};
        const delivery = deliveryReportMap[d._id.toString()] || {};

        const dispatchedOn = d.sentOn ? new Date(d.sentOn) : today;
        const pendingFromDays = Math.floor(
          (today - dispatchedOn) / (1000 * 60 * 60 * 24)
        );

        return {
          ...(existing || {}),
          _id: existing?._id || undefined,
          dispatchId: d._id,
          orderDate: jobSheet.orderDate,
          jobSheetNumber: d.jobSheetNumber,
          clientCompanyName: d.clientCompanyName,
          clientName: jobSheet.clientName || "",
          eventName: d.eventName,
          quotationNumber: jobSheet.referenceQuotation || "",
          crmName: jobSheet.crmIncharge || "",
          product: d.product,
          dispatchedOn,
          deliveredThrough: delivery.deliveredSentThrough || "",
          poStatus: jobSheet.poStatus || "",
          partialQty: existing?.partialQty || 0,
          invoiceGenerated: existing?.invoiceGenerated || "No",
          invoiceNumber: existing?.invoiceNumber || "",
          quotationTotal: quotationMap[jobSheet.referenceQuotation] || 0,
          pendingFromDays,
        };
      });

      // Add manually created follow-ups (no dispatchId)
      const manualFollowUps = savedFollowUps
        .filter(f => !f.dispatchId)
        .map(f => {
          const dispatchedOn = f.dispatchedOn ? new Date(f.dispatchedOn) : today;
          const pendingFromDays = Math.floor(
            (today - dispatchedOn) / (1000 * 60 * 60 * 24)
          );

          return {
            ...f,
            quotationTotal: quotationMap[f.quotationNumber] || 0,
            pendingFromDays,
          };
        });

      rows = [...merged, ...manualFollowUps];

      // Filter for "closed" view
      if (view === "closed") {
        rows = rows.filter(r => r.invoiceGenerated === "Yes");
      } else if (view === "old") {
        rows = rows.filter(r => r.invoiceGenerated !== "Yes");
      }
    }

    res.json(rows);
  } catch (err) {
    console.error("GET InvoiceFollowUp error:", err);
    res.status(500).json({ message: "Server error fetching Invoice Follow-Up" });
  }
});

/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { dispatchId, quotationNumber } = req.body;

    // Only check for existing record if dispatchId is provided
    if (dispatchId) {
      const exists = await InvoiceFollowUp.findOne({ dispatchId });
      if (exists) {
        return res.status(400).json({ message: "Row already exists – use PUT" });
      }
    }

    // Fetch quotationTotal if quotationNumber is provided
    let quotationTotal = 0;
    if (quotationNumber) {
      const quotation = await Quotation.findOne({ quotationNumber }).lean();
      quotationTotal = quotation?.grandTotal || 0;
    }

    const doc = new InvoiceFollowUp({
      ...req.body,
      quotationTotal,
      createdBy: req.user.email,
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    console.error("InvoiceFollowUp POST error:", err);
    res.status(500).json({ message: "Create failed", error: err.message });
  }
});

/* UPDATE */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { quotationNumber } = req.body;

    // Fetch quotationTotal if quotationNumber is provided
    let quotationTotal = 0;
    if (quotationNumber) {
      const quotation = await Quotation.findOne({ quotationNumber }).lean();
      quotationTotal = quotation?.grandTotal || 0;
    }

    const updated = await InvoiceFollowUp.findByIdAndUpdate(
      req.params.id,
      { ...req.body, quotationTotal, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error("InvoiceFollowUp PUT error:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router;