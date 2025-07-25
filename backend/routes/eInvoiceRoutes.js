// routes/eInvoiceRoutes.js

const express = require("express");
const router = express.Router();
const EInvoice = require("../models/EInvoice");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * @route   GET /einvoices
 * @desc    Fetch all e‑invoices
 * @access  Admin
 */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoices = await EInvoice.find()
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    console.error("Error fetching all e‑invoices:", err);
    res.status(500).json({ message: "Server error fetching e‑invoices" });
  }
});

/**
 * @route   GET /einvoices/:id
 * @desc    Fetch a single e‑invoice by its ID
 * @access  Admin
 */
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await EInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "E‑Invoice not found" });
    }
    res.json(invoice);
  } catch (err) {
    console.error(`Error fetching e‑invoice ${req.params.id}:`, err);
    res.status(500).json({ message: "Server error fetching e‑invoice" });
  }
});

module.exports = router;
