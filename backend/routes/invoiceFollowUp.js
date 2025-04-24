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
    // Fetch DispatchSchedule rows with status "sent"
    const dispatchRows = await DispatchSchedule.find({ status: "sent" }).lean();
    const savedFollowUps = await InvoiceFollowUp.find({}).lean();
    const jobSheets = await JobSheet.find({}).lean();
    const deliveryReports = await DeliveryReport.find({}).lean();

    // Create maps for quick lookup
    const followUpMap = {};
    savedFollowUps.forEach((f) => (followUpMap[f.dispatchId.toString()] = f));

    const jobSheetMap = {};
    jobSheets.forEach((j) => (jobSheetMap[j.jobSheetNumber] = j));

    const deliveryReportMap = {};
    deliveryReports.forEach((d) => (deliveryReportMap[d.dispatchId.toString()] = d));

    // Merge data
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
        pendingFromDays, // Computed
      };
    });

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching Invoice Follow-Up" });
  }
});

/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exists = await InvoiceFollowUp.findOne({
      dispatchId: req.body.dispatchId,
    });
    if (exists) {
      return res.status(400).json({ message: "Row already exists – use PUT" });
    }
    const doc = new InvoiceFollowUp({
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
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

module.exports = router; 