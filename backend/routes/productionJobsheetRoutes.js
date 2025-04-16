// routes/productionjobsheet.js
const express = require("express");
const router = express.Router();
const ProductionJobSheet = require("../models/ProductionJobsheet");
const OpenPurchase = require("../models/OpenPurchase");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// GET aggregated
router.get("/aggregated", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const openPurchases = await OpenPurchase.find({ status: "received" }).lean();
    const prodJobSheets = await ProductionJobSheet.find({}).lean();
    const prodMap = {};
    prodJobSheets.forEach((pj) => {
      if (pj.openPurchaseId) prodMap[pj.openPurchaseId.toString()] = pj;
    });

    const aggregated = [];
    for (const op of openPurchases) {
      let combined;
      if (prodMap[op._id.toString()]) {
        combined = { ...prodMap[op._id.toString()], isTemporary: false };
      } else {
        combined = {
          ...op,
          qtyOrdered: 0,
          expectedPostBranding: "",
          schedulePickUp: null,
          followUp: [],
          remarks: "",
          status: "",
          isTemporary: true,
        };
      }

      if (op.jobSheetId) {
        const js = await JobSheet.findById(op.jobSheetId).lean();
        if (js && js.items) {
          const match = js.items.find((i) => i.product === op.product);
          combined.qtyRequired = match ? match.quantity : 0;
          combined.brandingType = match?.brandingType || "";
          combined.brandingVendor = match?.brandingVendor || "";
        }
      } else {
        combined.qtyRequired = 0;
      }

      aggregated.push(combined);
    }
    res.json(aggregated);
  } catch (error) {
    console.error("Error fetching aggregated production job sheets:", error);
    res.status(500).json({ message: "Server error fetching aggregated production job sheets" });
  }
});

// POST create
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const newProdJobSheet = new ProductionJobSheet({ ...req.body });
    await newProdJobSheet.save();
    res.status(201).json({ message: "Production Job Sheet created", productionJobSheet: newProdJobSheet });
  } catch (error) {
    console.error("Error creating production job sheet:", error);
    res.status(500).json({ message: "Server error creating production job sheet" });
  }
});

// PUT update
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updated = await ProductionJobSheet.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Production Job Sheet not found" });
    res.json({ message: "Production Job Sheet updated", productionJobSheet: updated });
  } catch (error) {
    console.error("Error updating production job sheet:", error);
    res.status(500).json({ message: "Server error updating production job sheet" });
  }
});

module.exports = router;
