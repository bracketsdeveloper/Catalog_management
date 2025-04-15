// routes/productionjobsheet.js
const express = require("express");
const router = express.Router();
const ProductionJobSheet = require("../models/ProductionJobsheet");
const OpenPurchase = require("../models/OpenPurchase");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// GET aggregated production job sheets data
router.get("/aggregated", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const openPurchases = await OpenPurchase.find({ status: "received" }).lean();
    const prodJobSheets = await ProductionJobSheet.find({}).lean();
    const prodMap = {};
    prodJobSheets.forEach((pj) => {
      if (pj.openPurchaseId) {
        prodMap[pj.openPurchaseId.toString()] = pj;
      }
    });
    let aggregated = [];
    for (const op of openPurchases) {
      let combined;
      if (prodMap[op._id.toString()]) {
        combined = { ...prodMap[op._id.toString()], isTemporary: false };
      } else {
        combined = {
          ...op,
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
          const matchingItem = js.items.find(
            (item) => item.product === op.product
          );
          if (matchingItem) {
            combined.brandingType = matchingItem.brandingType || "";
            combined.brandingVendor = matchingItem.brandingVendor || "";
          } else {
            combined.brandingType = "";
            combined.brandingVendor = "";
          }
        }
      }
      aggregated.push(combined);
    }
    res.json(aggregated);
  } catch (error) {
    console.error("Error fetching aggregated production job sheets:", error);
    res.status(500).json({
      message:
        "Server error fetching aggregated production job sheets",
    });
  }
});

// Create new production job sheet
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    const newProdJobSheet = new ProductionJobSheet(data);
    await newProdJobSheet.save();
    res.status(201).json({
      message: "Production Job Sheet created",
      productionJobSheet: newProdJobSheet,
    });
  } catch (error) {
    console.error("Error creating production job sheet:", error);
    res.status(500).json({
      message: "Server error creating production job sheet",
    });
  }
});

// Update production job sheet
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };
    const updatedProdJobSheet = await ProductionJobSheet.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedProdJobSheet)
      return res
        .status(404)
        .json({ message: "Production Job Sheet not found" });
    res.json({
      message: "Production Job Sheet updated",
      productionJobSheet: updatedProdJobSheet,
    });
  } catch (error) {
    console.error("Error updating production job sheet:", error);
    res.status(500).json({
      message: "Server error updating production job sheet",
    });
  }
});

module.exports = router;
