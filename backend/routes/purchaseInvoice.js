const express = require("express");
const router = express.Router();
const PurchaseInvoice = require("../models/PurchaseInvoice");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoices = await PurchaseInvoice.find({}).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);
    res.status(500).json({ message: "Server error fetching purchase invoices" });
  }
});

router.get("/find", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetNumber, product } = req.query;
    const invoice = await PurchaseInvoice.findOne({ jobSheetNumber, product });
    res.json(invoice || {});
  } catch (error) {
    console.error("Error finding purchase invoice:", error);
    res.status(500).json({ message: "Server error finding purchase invoice" });
  }
});

router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await PurchaseInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Purchase invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching purchase invoice:", error);
    res.status(500).json({ message: "Server error fetching purchase invoice" });
  }
});

router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      orderConfirmationDate,
      jobSheetNumber,
      clientName,
      eventName,
      product,
      sourcingFrom,
      cost,
      vendorInvoiceNumber,
    } = req.body;

    if (
      !jobSheetNumber ||
      !product ||
      !orderConfirmationDate ||
      !clientName ||
      !eventName ||
      !sourcingFrom ||
      !cost
    ) {
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    const invoiceData = {
      ...req.body,
      vendorInvoiceNumber: vendorInvoiceNumber ? vendorInvoiceNumber.toUpperCase() : "",
      vendorInvoiceReceived: req.body.vendorInvoiceReceived || "No",
    };

    const invoice = await PurchaseInvoice.findOneAndUpdate(
      { jobSheetNumber, product },
      invoiceData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: "Purchase invoice saved", invoice });
  } catch (error) {
    console.error("Error saving purchase invoice:", error);
    res.status(500).json({ message: "Server error saving purchase invoice" });
  }
});

router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      vendorInvoiceNumber: req.body.vendorInvoiceNumber
        ? req.body.vendorInvoiceNumber.toUpperCase()
        : "",
    };

    const invoice = await PurchaseInvoice.findByIdAndUpdate(
      req.params.id,
      invoiceData,
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({ message: "Purchase invoice not found" });
    }
    res.json({ message: "Purchase invoice updated", invoice });
  } catch (error) {
    console.error("Error updating purchase invoice:", error);
    res.status(500).json({ message: "Server error updating purchase invoice" });
  }
});

router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await PurchaseInvoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Purchase invoice not found" });
    }
    res.json({ message: "Purchase invoice deleted" });
  } catch (error) {
    console.error("Error deleting purchase invoice:", error);
    res.status(500).json({ message: "Server error deleting purchase invoice" });
  }
});

module.exports = router;