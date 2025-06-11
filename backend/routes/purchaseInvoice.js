const express = require("express");
const router = express.Router();
const PurchaseInvoice = require("../models/PurchaseInvoice");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetNumber } = req.query;
    let filter = {};
    if (jobSheetNumber) {
      filter.jobSheetNumber = { $regex: `^${jobSheetNumber}$`, $options: "i" };
    }
    const invoices = await PurchaseInvoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);
    res.status(500).json({ message: "Server error fetching purchase invoices" });
  }
});

router.get("/find", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetNumber, product, size } = req.query;
    const filter = {};
    if (jobSheetNumber) {
      filter.jobSheetNumber = { $regex: `^${jobSheetNumber}$`, $options: "i" };
    }
    if (product) {
      filter.product = product;
    }
    if (size) {
      filter.size = size;
    }
    const invoice = await PurchaseInvoice.findOne(filter);
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
      deliveryDateTime,
      jobSheetNumber,
      clientName,
      eventName,
      product,
      size,
      sourcingFrom,
      cost,
      vendorInvoiceNumber,
      qtyRequired,
      qtyOrdered,
    } = req.body;

    if (
      !jobSheetNumber ||
      !product ||
      !orderConfirmationDate ||
      !clientName ||
      !eventName ||
      !sourcingFrom ||
      cost === undefined
    ) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const invoiceData = {
      orderConfirmationDate,
      deliveryDateTime,
      jobSheetNumber,
      clientName,
      eventName,
      product,
      size: size || "",
      sourcingFrom,
      cost,
      negotiatedCost: req.body.negotiatedCost || 0,
      paymentMade: req.body.paymentMade || 0,
      vendorInvoiceNumber: vendorInvoiceNumber
        ? vendorInvoiceNumber.toUpperCase()
        : "",
      vendorInvoiceReceived: req.body.vendorInvoiceReceived || "No",
      paymentStatus: req.body.paymentStatus || "Not Paid",
      qtyRequired: qtyRequired || 0,
      qtyOrdered: qtyOrdered || 0,
    };

    const invoice = await PurchaseInvoice.findOneAndUpdate(
      { jobSheetNumber, product, size: size || "" },
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
      orderConfirmationDate: req.body.orderConfirmationDate,
      deliveryDateTime: req.body.deliveryDateTime,
      jobSheetNumber: req.body.jobSheetNumber,
      clientName: req.body.clientName,
      eventName: req.body.eventName,
      product: req.body.product,
      size: req.body.size || "",
      sourcingFrom: req.body.sourcingFrom,
      cost: req.body.cost || 0,
      negotiatedCost: req.body.negotiatedCost || 0,
      paymentMade: req.body.paymentMade || 0,
      vendorInvoiceNumber: req.body.vendorInvoiceNumber
        ? req.body.vendorInvoiceNumber.toUpperCase()
        : "",
      vendorInvoiceReceived: req.body.vendorInvoiceReceived || "No",
      paymentStatus: req.body.paymentStatus || "Not Paid",
      qtyRequired: req.body.qtyRequired || 0,
      qtyOrdered: req.body.qtyOrdered || 0,
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