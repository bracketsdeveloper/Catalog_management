// routes/paymentfollowup.js
const express = require("express");
const router = express.Router();
const PaymentFollowUp = require("../models/PaymentFollowUp");
const DispatchSchedule = require("../models/DispatchSchedule");
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const InvoicesSummary = require("../models/InvoiceSummary");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* GET /api/admin/payment-followup */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Step 1: Fetch all InvoiceFollowUp entries
    const invoiceFollowUps = await InvoiceFollowUp.find({}).lean();
    if (!invoiceFollowUps.length) {
      return res.json([]);
    }

    // Step 2: Get dispatchIds from InvoiceFollowUp
    const dispatchIds = invoiceFollowUps.map((f) => f.dispatchId);

    // Step 3: Fetch DispatchSchedule rows with status "sent" and matching dispatchIds
    const dispatchRows = await DispatchSchedule.find({
      status: "sent",
      _id: { $in: dispatchIds },
    }).lean();

    // Step 4: Fetch InvoicesSummary and PaymentFollowUp entries
    const invoiceSummaries = await InvoicesSummary.find({}).lean();
    const savedFollowUps = await PaymentFollowUp.find({}).lean();

    // Create maps for quick lookup
    const followUpMap = {};
    invoiceFollowUps.forEach((f) => (followUpMap[f.dispatchId.toString()] = f));

    const summaryMap = {};
    invoiceSummaries.forEach((s) => (summaryMap[s.dispatchId.toString()] = s));

    const paymentMap = {};
    savedFollowUps.forEach((p) => (paymentMap[p.dispatchId.toString()] = p));

    // Step 5: Group by invoiceNumber and pick the latest dispatchId
    const dispatchMap = {};
    dispatchRows.forEach((d) => {
      const followUp = followUpMap[d._id.toString()];
      if (!followUp) return;

      const invoiceNumber = followUp.invoiceNumber || "";
      if (!invoiceNumber) return;

      if (
        !dispatchMap[invoiceNumber] ||
        new Date(d.sentOn) > new Date(dispatchMap[invoiceNumber].sentOn)
      ) {
        dispatchMap[invoiceNumber] = d;
      }
    });

    const uniqueDispatchRows = Object.values(dispatchMap);

    // Step 6: Merge data
    const merged = uniqueDispatchRows.map((d) => {
      const followUp = followUpMap[d._id.toString()];
      const summary = summaryMap[d._id.toString()] || {};
      const existing = paymentMap[d._id.toString()] || {};

      const today = new Date();
      const dueDate = existing.dueDate ? new Date(existing.dueDate) : null;
      const overDueSince = dueDate
        ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
        : null;

      return {
        _id: existing?._id || undefined,
        dispatchId: d._id,
        invoiceNumber: followUp.invoiceNumber || "",
        invoiceDate: existing.invoiceDate || null,
        invoiceAmount: existing.invoiceAmount || 0,
        invoiceMailed: summary.invoiceMailed || "No",
        dueDate: existing.dueDate || null,
        overDueSince,
        followUps: existing.followUps || [],
        paymentReceived: existing.paymentReceived || 0,
      };
    });

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching Payment Follow-Up" });
  }
});

/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exists = await PaymentFollowUp.findOne({
      dispatchId: req.body.dispatchId,
    });
    if (exists) {
      return res.status(400).json({ message: "Row already exists – use PUT" });
    }
    const doc = new PaymentFollowUp({
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
    const updated = await PaymentFollowUp.findByIdAndUpdate(
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