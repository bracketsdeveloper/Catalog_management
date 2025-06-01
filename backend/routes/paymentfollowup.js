const express = require("express");
const router = express.Router();
const PaymentFollowUp = require("../models/PaymentFollowUp");
const DispatchSchedule = require("../models/DispatchSchedule");
const InvoiceFollowUp = require("../models/InvoiceFollowUp");
const InvoicesSummary = require("../models/InvoiceSummary");
const JobSheet = require("../models/JobSheet");
const Company = require("../models/Company");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  const { search = "" } = req.query;
  try {
    console.log("Fetching Payment Follow-Up data with params:", { search });

    // Step 1: Fetch all required data without pagination
    const [invoiceFollowUps, dispatchRows, invoiceSummaries, savedFollowUps, jobSheets, companies] =
      await Promise.all([
        InvoiceFollowUp.find({
          $or: [
            { jobSheetNumber: { $regex: search, $options: "i" } },
            { clientCompanyName: { $regex: search, $options: "i" } },
            { invoiceNumber: { $regex: search, $options: "i" } },
          ],
        }).lean(),
        DispatchSchedule.find({}).lean(),
        InvoicesSummary.find({}).lean(),
        PaymentFollowUp.find({}).lean(),
        JobSheet.find({}).lean(),
        Company.find({}).lean(),
      ]);

    console.log({
      invoiceFollowUps: invoiceFollowUps.length,
      dispatchRows: dispatchRows.length,
      invoiceSummaries: invoiceSummaries.length,
      savedFollowUps: savedFollowUps.length,
      jobSheets: jobSheets.length,
      companies: companies.length,
    });

    if (!invoiceFollowUps.length || !dispatchRows.length) {
      console.log("No InvoiceFollowUp or DispatchSchedule records found.");
      return res.json([]);
    }

    // Step 2: Create lookup maps
    const followUpMap = {};
    for (const f of invoiceFollowUps) {
      if (f.dispatchId) followUpMap[f.dispatchId.toString()] = f;
    }

    const summaryMap = {};
    for (const s of invoiceSummaries) {
      summaryMap[s.invoiceNumber] = s;
    }

    const paymentMap = {};
    for (const p of savedFollowUps) {
      if (p.dispatchId && p.invoiceNumber) {
        paymentMap[`${p.dispatchId.toString()}-${p.invoiceNumber}`] = p;
      }
    }

    const jobSheetMap = {};
    for (const j of jobSheets) {
      jobSheetMap[j.jobSheetNumber] = {
        clientName: j.clientName || "",
      };
    }

    const companyMap = {};
    for (const c of companies) {
      companyMap[c.name] = c.paymentTerms;
    }

    // Step 3: Filter valid dispatchRows
    const validDispatchRows = dispatchRows.filter((d) => followUpMap[d._id.toString()]);
    console.log(`Valid dispatch rows: ${validDispatchRows.length}`);

    // Step 4: Merge data
    const formatDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : null);

    const merged = validDispatchRows.flatMap((d) => {
      const followUp = followUpMap[d._id.toString()];
      if (!followUp) {
        console.log(`No followUp for dispatchId: ${d._id}`);
        return [];
      }

      const invoiceNumbers = followUp.invoiceNumber
        ? followUp.invoiceNumber.split(",").map((n) => n.trim()).filter(Boolean)
        : [];
      console.log(`DispatchId: ${d._id}, InvoiceNumbers: ${invoiceNumbers}`);

      return invoiceNumbers.map((invoiceNumber) => {
        const summary = summaryMap[invoiceNumber] || {};
        const paymentKey = `${d._id.toString()}-${invoiceNumber}`;
        const existing = paymentMap[paymentKey] || {};

        // Calculate dueDate
        const invoiceDate = summary.invoiceDate ? new Date(summary.invoiceDate) : null;
        let dueDate = existing.dueDate ? new Date(existing.dueDate) : invoiceDate;
        if (invoiceDate && followUp.clientCompanyName && companyMap[followUp.clientCompanyName]) {
          const terms = companyMap[followUp.clientCompanyName];
          const days = parseInt(terms, 10);
          if (!isNaN(days)) {
            dueDate = new Date(invoiceDate);
            dueDate.setDate(invoiceDate.getDate() + days);
          }
        }

        // Calculate overDueSince
        const today = new Date();
        const overDueSince = dueDate
          ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
          : null;

        // Handle paymentReceived
        let totalPaymentReceived = 0;
        let paymentReceivedArray = [];
        if (Array.isArray(existing.paymentReceived)) {
          paymentReceivedArray = existing.paymentReceived;
          totalPaymentReceived = paymentReceivedArray.reduce(
            (sum, p) => sum + (p.amount || 0),
            0
          );
        } else if (typeof existing.paymentReceived === "number" && existing.paymentReceived > 0) {
          paymentReceivedArray = [
            {
              paymentDate: existing.updatedAt || new Date(),
              referenceNumber: `LEGACY-${existing._id || invoiceNumber}`,
              bankName: "Unknown",
              amount: existing.paymentReceived,
              updatedOn: existing.updatedAt || new Date(),
            },
          ];
          totalPaymentReceived = existing.paymentReceived;
        }

        return {
          _id: existing._id || undefined,
          dispatchId: d._id,
          jobSheetNumber: followUp.jobSheetNumber || "",
          clientCompanyName: followUp.clientCompanyName || "",
          clientName: jobSheetMap[followUp.jobSheetNumber]?.clientName || "",
          invoiceNumber,
          invoiceDate: formatDate(summary.invoiceDate),
          invoiceAmount: summary.invoiceAmount || 0,
          invoiceMailed: summary.invoiceMailed === true ? "Yes" : summary.invoiceMailed === false ? "No" : summary.invoiceMailed || "No",
          invoiceMailedOn: formatDate(summary.invoiceMailedOn),
          dueDate: formatDate(dueDate),
          overDueSince,
          followUps: existing.followUps || [],
          paymentReceived: paymentReceivedArray,
          totalPaymentReceived,
          discountAllowed: existing.discountAllowed || 0,
          TDS: existing.TDS || 0,
          remarks: existing.remarks || "",
        };
      });
    });

    console.log(`Merged records: ${merged.length}`);
    res.json(merged);
  } catch (err) {
    console.error("Payment Follow-Up Error:", err);
    res.status(500).json({ message: "Server error fetching Payment Follow-Up" });
  }
});

/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const doc = new PaymentFollowUp({
      ...req.body,
      invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : null,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      invoiceMailedOn: req.body.invoiceMailedOn ? new Date(req.body.invoiceMailedOn) : null,
      invoiceAmount: parseFloat(req.body.invoiceAmount) || 0,
      paymentReceived: Array.isArray(req.body.paymentReceived) ? req.body.paymentReceived : [],
      discountAllowed: parseFloat(req.body.discountAllowed) || 0,
      TDS: parseFloat(req.body.TDS) || 0,
      remarks: req.body.remarks || "",
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
      {
        ...req.body,
        invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        invoiceMailedOn: req.body.invoiceMailedOn ? new Date(req.body.invoiceMailedOn) : null,
        invoiceAmount: parseFloat(req.body.invoiceAmount) || 0,
        paymentReceived: Array.isArray(req.body.paymentReceived) ? req.body.paymentReceived : [],
        discountAllowed: parseFloat(req.body.discountAllowed) || 0,
        TDS: parseFloat(req.body.TDS) || 0,
        remarks: req.body.remarks || "",
        updatedAt: Date.now(),
      },
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