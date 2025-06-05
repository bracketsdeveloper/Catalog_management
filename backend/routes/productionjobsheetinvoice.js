const express = require("express");
const router = express.Router();
const ProductionJobSheetInvoice = require("../models/ProductionJobSheetInvoice");
const ProductionJobSheet = require("../models/ProductionJobsheet");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// GET invoices by jobSheetNumber
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheet } = req.query;
    console.log("Query parameters received:", { jobSheet }); // Debug log

    let filter = {};
    if (jobSheet) {
      filter.jobSheetNumber = { $regex: jobSheet, $options: "i" };
      console.log("MongoDB filter applied:", filter); // Debug log
    }

    const invoices = await ProductionJobSheetInvoice.find(filter).sort({ createdAt: -1 });
    console.log("ProductionJobSheetInvoices found:", invoices); // Debug log

    if (!invoices.length) {
      return res.status(200).json([]);
    }
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching production job sheet invoices:", error);
    res.status(500).json({ message: "Server error fetching production job sheet invoices" });
  }
});

// GET aggregated invoices
router.get("/aggregated", authenticate, authorizeAdmin, async (req, res) => {
  try {
    let invoiceRecords = await ProductionJobSheetInvoice.find({}).lean();
    const prodJobSheets = await ProductionJobSheet.find({ status: "received" }).lean();

    const virtualInvoices = [];
    prodJobSheets.forEach((pjs) => {
      const exists = invoiceRecords.some(
        (inv) => inv.productionJobSheetId?.toString() === pjs._id.toString()
      );
      if (!exists) {
        virtualInvoices.push({
          _id: `virtual-${pjs._id}`,
          productionJobSheetId: pjs._id,
          orderConfirmationDate: pjs.jobSheetCreatedDate,
          jobSheetNumber: pjs.jobSheetNumber,
          clientCompanyName: pjs.clientCompanyName,
          eventName: pjs.eventName,
          product: pjs.product,
          qtyRequired: pjs.qtyRequired || 0,
          qtyOrdered: pjs.qtyOrdered || 0,
          sourceFrom: "",
          cost: "",
          negotiatedCost: "",
          paymentModes: [],
          vendorInvoiceNumber: "",
          vendorInvoiceReceived: "No",
          paymentStatus: "Not Paid",
          createdAt: pjs.createdAt,
          updatedAt: pjs.updatedAt,
          isVirtual: true,
        });
      }
    });

    const combined = [...invoiceRecords, ...virtualInvoices].sort(
      (a, b) => new Date(b.orderConfirmationDate) - new Date(a.orderConfirmationDate)
    );
    res.json(combined);
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({ message: "Server error fetching invoices" });
  }
});

// GET single invoice
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await ProductionJobSheetInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    console.error("Error fetching invoice:", err);
    res.status(500).json({ message: "Server error fetching invoice" });
  }
});

// POST create invoice
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.isVirtual;

    const required = [
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
      "paymentStatus",
    ];
    for (const f of required) {
      if (!data[f]) return res.status(400).json({ message: `${f} is missing` });
    }

    const js = await JobSheet.findOne({ jobSheetNumber: data.jobSheetNumber });
    data.sourceFrom = js?.items.find((i) => i.product === data.product)?.sourcingFrom || "";
    data.vendorInvoiceNumber = data.vendorInvoiceNumber.toUpperCase();

    const inv = new ProductionJobSheetInvoice(data);
    await inv.save();
    res.status(201).json({ message: "Invoice created", invoice: inv });
  } catch (err) {
    console.error("Error creating invoice:", err);
    res.status(500).json({ message: "Server error creating invoice" });
  }
});

// PUT update invoice
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.vendorInvoiceNumber) data.vendorInvoiceNumber = data.vendorInvoiceNumber.toUpperCase();

    if (data.jobSheetNumber && data.product) {
      const js = await JobSheet.findOne({ jobSheetNumber: data.jobSheetNumber });
      data.sourceFrom = js?.items.find((i) => i.product === data.product)?.sourcingFrom || "";
    }

    const updated = await ProductionJobSheetInvoice.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice updated", invoice: updated });
  } catch (err) {
    console.error("Error updating invoice:", err);
    res.status(500).json({ message: "Server error updating invoice" });
  }
});

module.exports = router;