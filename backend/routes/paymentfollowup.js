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
    // console.log("Fetching Payment Follow-Up data with params:", { search });

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

    // console.log({
    //   invoiceFollowUps: invoiceFollowUps.length,
    //   dispatchRows: dispatchRows.length,
    //   invoiceSummaries: invoiceSummaries.length,
    //   savedFollowUps: savedFollowUps.length,
    //   jobSheets: jobSheets.length,
    //   companies: companies.length,
    // });

    if (!invoiceFollowUps.length || !dispatchRows.length) {
      // console.log("No InvoiceFollowUp or DispatchSchedule records found.");
      return res.json([]);
    }

    // Step 2: Create lookup maps
    const followUpMap = {};
    for (const f of invoiceFollowUps) {
      if (f.jobSheetNumber) followUpMap[f.jobSheetNumber] = f;
    }

    const dispatchMap = {};
    for (const d of dispatchRows) {
      dispatchMap[d._id.toString()] = d;
    }

    const summaryMap = {};
    for (const s of invoiceSummaries) {
      summaryMap[s.invoiceNumber] = s;
    }

    const paymentMap = {};
    for (const p of savedFollowUps) {
      if (p.jobSheetNumber) {
        paymentMap[p.jobSheetNumber] = p;
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

    // Step 3: Aggregate by jobSheetNumber
    const jobSheetNumbers = [...new Set(invoiceFollowUps.map(f => f.jobSheetNumber))];
    // console.log(`Unique jobSheetNumbers: ${jobSheetNumbers.length}`);

    const formatDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : null);

    const merged = jobSheetNumbers.map(jobSheetNumber => {
      const followUp = followUpMap[jobSheetNumber];
      if (!followUp || !followUp.dispatchId || !dispatchMap[followUp.dispatchId.toString()]) {
        // console.log(`No valid followUp or dispatch for jobSheetNumber: ${jobSheetNumber}`);
        return null;
      }

      const dispatchId = followUp.dispatchId.toString();
      const invoiceNumbers = followUp.invoiceNumber
        ? followUp.invoiceNumber.split(",").map(n => n.trim()).filter(Boolean)
        : [];

      // Aggregate invoice data
      let invoiceAmount = 0;
      let invoiceDate = null;
      let invoiceMailed = "No";
      let invoiceMailedOn = null;
      let dueDate = null;

      invoiceNumbers.forEach(invoiceNumber => {
        const summary = summaryMap[invoiceNumber] || {};
        invoiceAmount += parseFloat(summary.invoiceAmount) || 0;
        if (summary.invoiceDate) {
          const currentInvoiceDate = new Date(summary.invoiceDate);
          if (!invoiceDate || currentInvoiceDate < invoiceDate) {
            invoiceDate = currentInvoiceDate;
          }
        }
        if (summary.invoiceMailed === true) invoiceMailed = "Yes";
        if (summary.invoiceMailedOn) {
          const currentMailedOn = new Date(summary.invoiceMailedOn);
          if (!invoiceMailedOn || currentMailedOn < invoiceMailedOn) {
            invoiceMailedOn = currentMailedOn;
          }
        }
      });

      // Calculate dueDate
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
      const existing = paymentMap[jobSheetNumber] || {};
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
            referenceNumber: `LEGACY-${existing._id || jobSheetNumber}`,
            bankName: "Unknown",
            amount: existing.paymentReceived,
            updatedOn: existing.updatedAt || new Date(),
          },
        ];
        totalPaymentReceived = existing.paymentReceived;
      }

      return {
        _id: existing._id || undefined,
        dispatchId,
        jobSheetNumber,
        clientCompanyName: followUp.clientCompanyName || "",
        clientName: jobSheetMap[jobSheetNumber]?.clientName || "",
        invoiceNumber: invoiceNumbers.join(", "), // Combine invoices
        invoiceDate: formatDate(invoiceDate),
        invoiceAmount,
        invoiceMailed,
        invoiceMailedOn: formatDate(invoiceMailedOn),
        dueDate: formatDate(dueDate),
        overDueSince,
        followUps: existing.followUps || [],
        paymentReceived: paymentReceivedArray,
        totalPaymentReceived,
        discountAllowed: existing.discountAllowed || 0,
        TDS: existing.TDS || 0,
        remarks: existing.remarks || "",
      };
    }).filter(row => row !== null);

    // console.log(`Merged records: ${merged.length}`);
    res.json(merged);
  } catch (err) {
    console.error("Payment Follow-Up Error:", err);
    res.status(500).json({ message: "Server error fetching Payment Follow-Up" });
  }
});

/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Validate that jobSheetNumber is unique in PaymentFollowUp
    const existing = await PaymentFollowUp.findOne({ jobSheetNumber: req.body.jobSheetNumber });
    if (existing) {
      return res.status(400).json({ message: "Payment Follow-Up for this Job Sheet already exists" });
    }

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