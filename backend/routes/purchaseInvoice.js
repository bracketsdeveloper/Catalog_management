// routes/purchaseInvoice.js
const express = require("express");
const router = express.Router();
const PurchaseInvoice = require("../models/PurchaseInvoice");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Create Purchase Invoice
router.post("/purchaseinvoices", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Set createdBy using the authenticated user details (email or name)
    const createdBy = req.user ? req.user.email || req.user.name : "Unknown";
    const invoiceData = { ...req.body, createdBy };
    const newInvoice = new PurchaseInvoice(invoiceData);
    await newInvoice.save();
    res.status(201).json({ message: "Purchase Invoice created", purchaseInvoice: newInvoice });
  } catch (error) {
    console.error("Error creating purchase invoice:", error);
    res.status(500).json({ message: "Server error creating purchase invoice", error: error.message });
  }
});

// Get all Purchase Invoices (optional)
router.get("/purchaseinvoices", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoices = await PurchaseInvoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);
    res.status(500).json({ message: "Server error fetching invoices" });
  }
});

// Get single Purchase Invoice by ID
router.get("/purchaseinvoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await PurchaseInvoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching purchase invoice:", error);
    res.status(500).json({ message: "Server error fetching invoice" });
  }
});

// Update Purchase Invoice
router.put("/purchaseinvoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedInvoice = await PurchaseInvoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedInvoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice updated", purchaseInvoice: updatedInvoice });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ message: "Server error updating invoice" });
  }
});

// Delete Purchase Invoice
router.delete("/purchaseinvoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedInvoice = await PurchaseInvoice.findByIdAndDelete(req.params.id);
    if (!deletedInvoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice deleted" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ message: "Server error deleting invoice" });
  }
});

module.exports = router;
