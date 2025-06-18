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

    // Step 1: Fetch all required data
    const [invoiceFollowUps, dispatchRows, invoiceSummaries, savedFollowUps, jobSheets, companies] =
      await Promise.all([
        InvoiceFollowUp.find({
          invoiceGenerated: "Yes", // Only fetch where invoiceGenerated is "Yes"
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

    if (!invoiceFollowUps.length) {
      console.log("No InvoiceFollowUp records found.");
      return res.json([]);
    }

    // Step 2: Create lookup maps
    const dispatchMap = {};
    for (const d of dispatchRows) {
      if (d.jobSheetNumber) {
        dispatchMap[d.jobSheetNumber] = dispatchMap[d.jobSheetNumber] || d._id.toString();
      }
    }

    const summaryMap = {};
    for (const s of invoiceSummaries) {
      summaryMap[s.invoiceNumber] = s;
    }

    const paymentMap = {};
    for (const p of savedFollowUps) {
      if (p.jobSheetNumber && p.invoiceNumber) {
        paymentMap[`${p.jobSheetNumber}-${p.invoiceNumber}`] = p;
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

    // Step 3: Aggregate by jobSheetNumber and invoiceNumber
    const formatDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : null);

    const merged = invoiceFollowUps.flatMap((followUp) => {
      if (!followUp.jobSheetNumber || !followUp.dispatchId) {
        console.log(`Skipping followUp with missing jobSheetNumber or dispatchId: ${followUp._id}`);
        return [];
      }

      const invoiceNumbers = followUp.invoiceNumber
        ? followUp.invoiceNumber.split(",").map((n) => n.trim()).filter(Boolean)
        : [];

      if (!invoiceNumbers.length) {
        console.log(`No invoiceNumbers for followUp: ${followUp._id}`);
        return [];
      }

      const dispatchId = dispatchMap[followUp.jobSheetNumber];
      if (!dispatchId) {
        console.log(`No dispatchId found for jobSheetNumber: ${followUp.jobSheetNumber}`);
        return [];
      }

      return invoiceNumbers.map((invoiceNumber) => {
        const summary = summaryMap[invoiceNumber] || {};
        const paymentKey = `${followUp.jobSheetNumber}-${invoiceNumber}`;
        const existing = paymentMap[paymentKey] || {};

        // Calculate dueDate
        const invoiceDate = summary.date;
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
        const overDueSince =
          dueDate && Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

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
              bankName: "",
              amount: existing.paymentReceived,
              updatedOn: existing.updatedAt || new Date(),
            },
          ];
          totalPaymentReceived = existing.paymentReceived;
        }

        return {
          _id: existing._id || undefined,
          dispatchId,
          jobSheetNumber: followUp.jobSheetNumber,
          clientCompanyName: followUp.clientCompanyName || "",
          clientName: jobSheetMap[followUp.jobSheetNumber]?.clientName || "",
          invoiceNumber,
          invoiceDate: formatDate(summary.invoiceDate),
          invoiceAmount: parseFloat(summary.invoiceAmount) || 0,
          invoiceMailed: summary.invoiceMailed === "Yes" ? "Yes" : "No",
          invoiceMailedOn: formatDate(summary.invoiceMailedOn),
          dueDate: formatDate(dueDate),
          overDueSince,
          followUps: existing.followUps || [],
          paymentReceived: paymentReceivedArray,
          totalPaymentReceived,
          discountAllowed: parseFloat(existing.discountAllowed) || 0,
          TDS: parseFloat(existing.TDS) || 0,
          remarks: existing.remarks || "",
        };
      });
    }).filter((row) => row);

    console.log(`Merged records: ${merged.length}`);
    res.json(merged);
  } catch (err) {
    console.error("Payment Fetch Error:", err);
    res.status(500).json({ message: "Error fetching Payment Follow-Up" });
  }
});

/* CREATE */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetNumber, invoiceNumber, dispatchId } = req.body;

    // Validate required fields
    if (!jobSheetNumber || !invoiceNumber || !dispatchId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const doc = new PaymentFollowUp({
      ...req.body,
      dispatchId,
      jobSheetNumber,
      invoiceNumber,
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
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Payment already exists for this dispatch, job sheet, and invoice" });
    }
    res.status(400).json({ message: "Create failed" });
  }
});

/* UPDATE */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetNumber, invoiceNumber, dispatchId } = req.body;

    // Validate required fields
    if (!jobSheetNumber || !invoiceNumber || !dispatchId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const updated = await PaymentFollowUp.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        dispatchId,
        jobSheetNumber,
        invoiceNumber,
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

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Payment already exists for this dispatch, job sheet, and invoice" });
    }
    res.status(400).json({ message: "Update failed" });
  }
});

module.exports = router;