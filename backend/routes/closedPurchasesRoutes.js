const express = require("express");
const router = express.Router();
const ClosedPurchase = require("../models/ClosedPurchase");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * GET /api/admin/closedPurchases
 * Fetch all closed purchase records.
 * (These records should only be those manually saved as closed.)
 */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Return closed purchase records sorted by creation date
    const closedPurchases = await ClosedPurchase.find({}).sort({ createdAt: -1 });
    res.json(closedPurchases);
  } catch (error) {
    console.error("Error fetching closed purchases:", error);
    res.status(500).json({ message: "Server error fetching closed purchases" });
  }
});

/**
 * POST /api/admin/closedPurchases
 * Save a Closed Purchase record by upserting (inserting or updating if duplicate found).
 * This helps avoid duplication based on the composite key (jobSheetNumber + product).
 */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Define the query based on unique fields (you can adjust if needed)
    const query = {
      jobSheetNumber: req.body.jobSheetNumber,
      product: req.body.product
    };

    // Options: upsert true means create if not found; new true returns the updated document.
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const closedPurchase = await ClosedPurchase.findOneAndUpdate(query, req.body, options);
    res.status(201).json({ message: "Closed purchase saved", purchase: closedPurchase });
  } catch (error) {
    console.error("Error saving closed purchase:", error);
    res.status(500).json({ message: "Server error saving closed purchase" });
  }
});

/**
 * PUT /api/admin/closedPurchases/:id
 * Update an existing Closed Purchase record.
 */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedClosed = await ClosedPurchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedClosed) return res.status(404).json({ message: "Closed purchase not found" });
    res.json({ message: "Closed purchase updated", purchase: updatedClosed });
  } catch (error) {
    console.error("Error updating closed purchase:", error);
    res.status(500).json({ message: "Server error updating closed purchase" });
  }
});

/**
 * DELETE /api/admin/closedPurchases/:id
 * Delete a Closed Purchase record.
 */
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedClosed = await ClosedPurchase.findByIdAndDelete(req.params.id);
    if (!deletedClosed) return res.status(404).json({ message: "Closed purchase not found" });
    res.json({ message: "Closed purchase deleted" });
  } catch (error) {
    console.error("Error deleting closed purchase:", error);
    res.status(500).json({ message: "Server error deleting closed purchase" });
  }
});

module.exports = router;