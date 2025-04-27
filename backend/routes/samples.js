// routes/samples.js
const express = require("express");
const router = express.Router();
const Sample = require("../models/Sample");
const Product = require("../models/Product");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Helper to set productPicture from Product.images[0]
async function attachProductPicture(body) {
  if (body.productId) {
    const prod = await Product.findOne({ productId: body.productId }).lean();
    if (prod && Array.isArray(prod.images) && prod.images.length > 0) {
      body.productPicture = prod.images[0];
    }
  }
}

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
      ? { $or: [
          { sampleReferenceCode: { $regex: search, $options: "i" } },
          { productName:         { $regex: search, $options: "i" } }
        ]}
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
    const deleted = await Sample.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Sample deleted" });
  } catch (err) {
    console.error("Error deleting sample:", err);
    res.status(500).json({ message: "Server error deleting sample" });
  }
});

module.exports = router;
