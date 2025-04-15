// routes/productionjobsheetinvoice.js
const express = require("express");
const router = express.Router();
const ProductionJobSheetInvoice = require("../models/ProductionJobSheetInvoice");
const ProductionJobSheet = require("../models/ProductionJobsheet");
const JobSheet = require("../models/JobSheet"); // If needed for sourcing info.
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// GET all production job sheet invoices (aggregated)
// Returns both already saved invoices and virtual invoices generated from production job sheets with status "received".
router.get("/aggregated", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Get existing invoice records.
    let invoiceRecords = await ProductionJobSheetInvoice.find({}).lean().sort({ createdAt: -1 });

    // Query ProductionJobSheet to find entries with status "received".
    const prodJobSheets = await ProductionJobSheet.find({ status: "received" }).lean();

    // Build virtual invoices for each received ProductionJobSheet without an existing invoice.
    const virtualInvoices = [];
    prodJobSheets.forEach((prodJS) => {
      // Check if an invoice already exists for this production job sheet.
      const exists = invoiceRecords.some(
        (inv) =>
          inv.productionJobSheetId?.toString() === prodJS._id.toString()
      );
      if (!exists) {
        virtualInvoices.push({
          // Generate a unique virtual _id based on production job sheet _id.
          _id: `virtual-${prodJS._id}`,
          productionJobSheetId: prodJS._id,
          orderConfirmationDate: prodJS.jobSheetCreatedDate, // Using the jobSheetCreatedDate as confirmation date.
          jobSheetNumber: prodJS.jobSheetNumber,
          clientCompanyName: prodJS.clientCompanyName,
          eventName: prodJS.eventName,
          product: prodJS.product,
          // For sourceFrom, you might choose to pull from a related JobSheet record if needed.
          sourceFrom: "",
          cost: "",
          negotiatedCost: "",
          paymentModes: [],
          vendorInvoiceNumber: "",
          vendorInvoiceReceived: "No",
          createdAt: prodJS.createdAt,
          updatedAt: prodJS.updatedAt,
          isVirtual: true, // Mark as virtual record.
        });
      }
    });

    // Combine saved and virtual invoices.
    const combinedInvoices = [...invoiceRecords, ...virtualInvoices];
    // Sort by orderConfirmationDate descending.
    combinedInvoices.sort((a, b) => new Date(b.orderConfirmationDate) - new Date(a.orderConfirmationDate));
    res.json(combinedInvoices);
  } catch (error) {
    console.error("Error fetching production job sheet invoices:", error);
    res.status(500).json({ message: "Server error fetching invoices" });
  }
});

// GET a single invoice by ID.
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await ProductionJobSheetInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ message: "Server error fetching invoice" });
  }
});

// POST: create a new production job sheet invoice.
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };

    // Minimal required fields check.
    const requiredFields = [
      "productionJobSheetId",
      "orderConfirmationDate",
      "jobSheetNumber",
      "clientCompanyName",
      "eventName",
      "product",
      "cost",
      "negotiatedCost",
      "vendorInvoiceNumber",
      "vendorInvoiceReceived",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return res.status(400).json({ message: `${field} is missing` });
      }
    }

    // (Optional) Lookup corresponding JobSheet if you need to set sourcing details.
    const jobSheet = await JobSheet.findOne({ jobSheetNumber: data.jobSheetNumber });
    if (jobSheet) {
      const matchingItem = jobSheet.items.find((item) => item.product === data.product);
      data.sourceFrom = matchingItem ? matchingItem.sourcingFrom || "" : "";
    } else {
      data.sourceFrom = "";
    }

    // Convert vendorInvoiceNumber to uppercase.
    data.vendorInvoiceNumber = data.vendorInvoiceNumber.toUpperCase();

    const newInvoice = new ProductionJobSheetInvoice(data);
    await newInvoice.save();
    res.status(201).json({ message: "Invoice created", invoice: newInvoice });
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ message: "Server error creating invoice" });
  }
});

// PUT: update an existing production job sheet invoice.
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.vendorInvoiceNumber) {
      data.vendorInvoiceNumber = data.vendorInvoiceNumber.toUpperCase();
    }
    // Optionally update sourceFrom by checking JobSheet.
    if (data.jobSheetNumber && data.product) {
      const jobSheet = await JobSheet.findOne({ jobSheetNumber: data.jobSheetNumber });
      if (jobSheet) {
        const matchingItem = jobSheet.items.find((item) => item.product === data.product);
        data.sourceFrom = matchingItem ? matchingItem.sourcingFrom || "" : "";
      }
    }

    const updatedInvoice = await ProductionJobSheetInvoice.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    if (!updatedInvoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice updated", invoice: updatedInvoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ message: "Server error updating invoice" });
  }
});

module.exports = router;
