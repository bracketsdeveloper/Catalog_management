const express = require("express");
const router = express.Router();
const Sample = require("../models/Sample");
const Product = require("../models/Product");
const Opportunity = require("../models/Opportunity");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose");

// Helper to set productPicture from Product.images[0]
async function attachProductPicture(body) {
  if (body.productId) {
    const prod = await Product.findOne({ productId: body.productId }).lean();
    if (prod && Array.isArray(prod.images) && prod.images.length > 0) {
      body.productPicture = prod.images[0];
    }
  }
}

// OPPORTUNITY SUGGESTIONS (Moved before /:id)
router.get("/opportunity-suggestions", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { search = "" } = req.query;
    // Sanitize search input to prevent regex errors
    const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query = sanitizedSearch
      ? {
          $or: [
            { opportunityCode: { $regex: sanitizedSearch, $options: "i" } },
            { opportunityName: { $regex: sanitizedSearch, $options: "i" } },
          ],
        }
      : {};
    // Verify Opportunity model exists
    if (!Opportunity) {
      throw new Error("Opportunity model not found");
    }
    const opportunities = await Opportunity.find(query)
      .select("opportunityCode opportunityName")
      .limit(10)
      .lean();
    res.json(opportunities);
  } catch (err) {
    console.error("Error fetching opportunity suggestions:", {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: "Server error fetching opportunity suggestions", error: err.message });
  }
});

// CREATE
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    await attachProductPicture(req.body);
    const sample = new Sample(req.body);
    await sample.save();
    res.status(201).json({ message: "Sample created", sample });
  } catch (err) {
    console.error("Error creating sample:", err);
    res.status(500).json({ message: "Server error creating sample" });
  }
});

// READ ALL
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { search = "" } = req.query;
    const q = search
      ? {
          $or: [
            { sampleReferenceCode: { $regex: search, $options: "i" } },
            { productName: { $regex: search, $options: "i" } },
            { opportunityNumber: { $regex: search, $options: "i" } },
            { remarks: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    const samples = await Sample.find(q).sort({ createdAt: -1 }).lean();
    res.json(samples);
  } catch (err) {
    console.error("Error fetching samples:", err);
    res.status(500).json({ message: "Server error fetching samples" });
  }
});

// READ ONE
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Validate that id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid sample ID" });
    }
    const sample = await Sample.findById(req.params.id).lean();
    if (!sample) return res.status(404).json({ message: "Not found" });
    res.json(sample);
  } catch (err) {
    console.error("Error fetching sample:", err);
    res.status(500).json({ message: "Server error fetching sample" });
  }
});

// UPDATE
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Validate that id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid sample ID" });
    }
    await attachProductPicture(req.body);
    const updated = await Sample.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Sample updated", sample: updated });
  } catch (err) {
    console.error("Error updating sample:", err);
    res.status(500).json({ message: "Server error updating sample" });
  }
});

// DELETE
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // Validate that id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid sample ID" });
    }
    const deleted = await Sample.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Sample deleted" });
  } catch (err) {
    console.error("Error deleting sample:", err);
    res.status(500).json({ message: "Server error deleting sample" });
  }
});

module.exports = router;