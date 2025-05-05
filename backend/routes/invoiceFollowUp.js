// routes/invoicefollowup.js
const express = require("express");
const router = express.Router();
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const DispatchSchedule = require("../models/DispatchSchedule");
const JobSheet = require("../models/JobSheet");
const DeliveryReport = require("../models/DeliveryReport");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* GET /api/admin/invoice-followup */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const dispatchRows = await DispatchSchedule.find({ status: "sent" }).lean();
    const savedFollowUps = await InvoiceFollowUp.find({}).lean();
    const jobSheets = await JobSheet.find({}).lean();
    const deliveryReports = await DeliveryReport.find({}).lean();

    // Create maps
    const followUpMap = Object.fromEntries(
      savedFollowUps.filter(f => f.dispatchId).map(f => [f.dispatchId.toString(), f])
    );

    const jobSheetMap = Object.fromEntries(
      jobSheets.map(j => [j.jobSheetNumber, j])
    );

    const deliveryReportMap = Object.fromEntries(
      deliveryReports.filter(d => d.dispatchId).map(d => [d.dispatchId.toString(), d])
    );

    // Merge records
    const merged = dispatchRows.map((d) => {
      const existing = followUpMap[d._id.toString()];
      const jobSheet = jobSheetMap[d.jobSheetNumber] || {};
      const delivery = deliveryReportMap[d._id.toString()] || {};

      const today = new Date();
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
        eventName: d.eventName,
        quotationNumber: jobSheet.referenceQuotation || "",
        crmName: jobSheet.crmIncharge || "",
        product: d.product,
        dispatchedOn: d.sentOn,
        deliveredThrough: delivery.deliveredSentThrough || "",
        poStatus: jobSheet.poStatus || "",
        partialQty: existing?.partialQty || 0,
        invoiceGenerated: existing?.invoiceGenerated || "No",
        invoiceNumber: existing?.invoiceNumber || "",
        pendingFromDays,
      };
    });

    // Add manually created followups (no dispatchId)
    const manualFollowUps = savedFollowUps
      .filter(f => !f.dispatchId)
      .map(f => {
        const today = new Date();
        const dispatchedOn = f.dispatchedOn ? new Date(f.dispatchedOn) : today;
        const pendingFromDays = Math.floor(
          (today - dispatchedOn) / (1000 * 60 * 60 * 24)
        );

        return {
          ...f,
          pendingFromDays,
        };
      });

    res.json([...merged, ...manualFollowUps]);
  } catch (err) {
    console.error("GET InvoiceFollowUp error:", err);
    res.status(500).json({ message: "Server error fetching Invoice Follow-Up" });
  }
});

/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { dispatchId } = req.body;

    // Only check for existing record if dispatchId is provided
    if (dispatchId) {
      const exists = await InvoiceFollowUp.findOne({ dispatchId });
      if (exists) {
        return res.status(400).json({ message: "Row already exists – use PUT" });
      }
    }

    const doc = new InvoiceFollowUp({
      ...req.body,
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
    const updated = await InvoiceFollowUp.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
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