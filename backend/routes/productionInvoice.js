// routes/productionInvoice.js
const express = require("express");
const router = express.Router();
const ProductionInvoice = require("../models/ProductionInvoice");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Create a new Production Invoice
router.post("/productioninvoices", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const currentUser = req.user ? (req.user.email || req.user.name) : "Unknown User";
    const newInvoice = new ProductionInvoice({ ...req.body, createdBy: currentUser });
    await newInvoice.save();
    res.status(201).json({ message: "Production Invoice created", productionInvoice: newInvoice });
  } catch (error) {
    console.error("Error creating production invoice:", error);
    res.status(500).json({ message: "Server error creating production invoice", error: error.message });
  }
});

// Get all Production Invoices
router.get("/productioninvoices", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoices = await ProductionInvoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching production invoices:", error);
    res.status(500).json({ message: "Server error fetching production invoices" });
  }
});

// Get single Production Invoice by ID
router.get("/productioninvoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await ProductionInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Production invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching production invoice:", error);
    res.status(500).json({ message: "Server error fetching production invoice" });
  }
});

// Update Production Invoice
router.put("/productioninvoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedInvoice = await ProductionInvoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedInvoice) {
      return res.status(404).json({ message: "Production invoice not found" });
    }
    res.json({ message: "Production invoice updated", productionInvoice: updatedInvoice });
  } catch (error) {
    console.error("Error updating production invoice:", error);
    res.status(500).json({ message: "Server error updating production invoice", error: error.message });
  }
});

// Delete Production Invoice
router.delete("/productioninvoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedInvoice = await ProductionInvoice.findByIdAndDelete(req.params.id);
    if (!deletedInvoice) {
      return res.status(404).json({ message: "Production invoice not found" });
    }
    res.json({ message: "Production invoice deleted" });
  } catch (error) {
    console.error("Error deleting production invoice:", error);
    res.status(500).json({ message: "Server error deleting production invoice" });
  }
});

module.exports = router;
