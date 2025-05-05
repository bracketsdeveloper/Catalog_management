// routes/invoicessummary.js
const express = require("express");
const router = express.Router();
const InvoicesSummary = require("../models/InvoiceSummary");
const DispatchSchedule = require("../models/DispatchSchedule");
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// /* GET /api/admin/invoices-summary */
// router.get("/", authenticate, authorizeAdmin, async (req, res) => {
//   try {
//     // Step 1: Fetch all InvoiceFollowUp entries
//     const invoiceFollowUps = await InvoiceFollowUp.find({}).lean();
//     if (!invoiceFollowUps.length) {
//       return res.json([]); // If no InvoiceFollowUp entries exist, return empty array
//     }

//     // Step 2: Get the dispatchIds from InvoiceFollowUp
//     const dispatchIds = invoiceFollowUps.map((f) => f.dispatchId);

//     // Step 3: Fetch DispatchSchedule rows with status "sent" and matching dispatchIds
//     const dispatchRows = await DispatchSchedule.find({
//       status: "sent",
//       _id: { $in: dispatchIds },
//     }).lean();

//     // Step 4: Fetch InvoicesSummary entries
//     const savedSummaries = await InvoicesSummary.find({}).lean();

//     // Create maps for quick lookup
//     const followUpMap = {};
//     invoiceFollowUps.forEach((f) => (followUpMap[f.dispatchId.toString()] = f));

//     const summaryMap = {};
//     savedSummaries.forEach((s) => (summaryMap[s.dispatchId.toString()] = s));

//     // Step 5: Group by jobSheetNumber and pick the latest dispatchId
//     const dispatchMap = {};
//     dispatchRows.forEach((d) => {
//       const followUp = followUpMap[d._id.toString()];
//       if (!followUp) return; // Skip if no InvoiceFollowUp entry exists

//       const jobSheetNumber = followUp.jobSheetNumber || "";
//       if (!jobSheetNumber) return; // Skip if jobSheetNumber is empty

//       if (
        //  !dispatchMap[jobSheetNumber] ||
//         new Date(d.sentOn) > new Date(dispatchMap[jobSheetNumber].sentOn)
//       ) {
//         dispatchMap[jobSheetNumber] = d;
//       }
//     });

//     // Step 6: Convert grouped dispatch rows to array
//     const uniqueDispatchRows = Object.values(dispatchMap);

//     // Step 7: Merge data with only intended fields
//     const merged = uniqueDispatchRows.map((d) => {
//       const followUp = followUpMap[d._id.toString()];
//       const existing = summaryMap[d._id.toString()] || {};

//       return {
//         _id: existing?._id || undefined,
//         dispatchId: d._id,
//         jobSheetNumber: followUp.jobSheetNumber || "",
//         clientCompanyName: followUp.clientCompanyName || "",
//         eventName: followUp.eventName || "",
//         invoiceNumber: followUp.invoiceNumber || "",
//         invoiceDate: existing.invoiceDate || null,
//         invoiceAmount: existing.invoiceAmount || 0,
//         invoiceMailed: existing.invoiceMailed || "No",
//         invoiceUploadedOnPortal: existing.invoiceUploadedOnPortal || "",
//       };
//     });

//     res.json(merged);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error fetching Invoices Summary" });
//   }
// });


router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoiceFollowUps = await InvoiceFollowUp.find({}).lean();
    if (!invoiceFollowUps.length) {
      return res.json([]);
    }

    // Remove null/undefined dispatchIds
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
      if (s.dispatchId) {
        summaryMap[s.dispatchId.toString()] = s;
      }
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

    const merged = uniqueDispatchRows.map((d) => {
      const followUp = followUpMap[d._id.toString()];
      const existing = summaryMap[d._id.toString()] || {};

      return {
        _id: existing?._id || undefined,
        dispatchId: d._id,
        jobSheetNumber: followUp.jobSheetNumber || "",
        clientCompanyName: followUp.clientCompanyName || "",
        eventName: followUp.eventName || "",
        invoiceNumber: followUp.invoiceNumber || "",
        invoiceDate: existing.invoiceDate || null,
        invoiceAmount: existing.invoiceAmount || 0,
        invoiceMailed: existing.invoiceMailed || "No",
        invoiceUploadedOnPortal: existing.invoiceUploadedOnPortal || "",
      };
    });

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching Invoices Summary" });
  }
});


/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const exists = await InvoicesSummary.findOne({
      dispatchId: req.body.dispatchId,
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

/* UPDATE */
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