const express = require("express");
const router = express.Router();
const ClosedPurchase = require("../models/ClosedPurchase");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * GET /api/admin/closedPurchases
 * Fetch all closed purchase records, optionally filtered by partial splits.
 * Query param: partial=true to include only records with qtyOrdered < qtyRequired or status="received".
 */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { partial } = req.query;
    let query = {};
    if (partial === "true") {
      query = {
        $or: [
          { $expr: { $lt: ["$qtyOrdered", "$qtyRequired"] } },
          { status: "received" },
        ],
      };
    }
    const closedPurchases = await ClosedPurchase.find(query).sort({ createdAt: -1 });
    res.json(closedPurchases);
  } catch (error) {
    console.error("Error fetching closed purchases:", error);
    res.status(500).json({ message: "Server error fetching closed purchases" });
  }
});

/**
 * POST /api/admin/closedPurchases
 * Create a new Closed Purchase record (manual closure, not for splits).
 */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const closedPurchase = new ClosedPurchase({
      ...req.body,
      jobSheetId: req.body.jobSheetId ? new mongoose.Types.ObjectId(req.body.jobSheetId) : undefined,
      size: req.body.size || "",
      splitId: new mongoose.Types.ObjectId(), // Ensure unique splitId
      status: req.body.status || "received",
      closedAt: new Date(),
    });
    await closedPurchase.save();
    res.status(201).json({ message: "Closed purchase created", purchase: closedPurchase });
  } catch (error) {
    console.error("Error creating closed purchase:", error);
    res.status(500).json({ message: "Server error creating closed purchase: " + error.message });
  }
});

/**
 * PUT /api/admin/closedPurchases/:id
 * Update an existing Closed Purchase record.
 */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedClosed = await ClosedPurchase.findByIdAndUpdate(
      req.params.id,
      { ...req.body, size: req.body.size || "" },
      { new: true }
    );
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