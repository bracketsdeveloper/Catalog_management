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
    // 1) Pull all received open‑purchases
    const openPurchases = await OpenPurchase.find({ status: "received" }).lean();

    // 2) Pull all ProductionJobSheets
    const prodJobSheets = await ProductionJobSheet.find({}).lean();
    const prodMap = prodJobSheets.reduce((m, pj) => {
      if (pj.openPurchaseId) m[pj.openPurchaseId.toString()] = pj;
      return m;
    }, {});

    // 3) Collect all jobSheetIds so we can bulk fetch
    const jsIds = [...new Set(
      openPurchases
        .map(op => op.jobSheetId)
        .filter(id => id)
        .map(id => id.toString())
    )];

    const jobSheets = await JobSheet.find({ _id: { $in: jsIds } }).lean();
    const jsMap = jobSheets.reduce((m, js) => { m[js._id.toString()] = js; return m; }, {});

    // 4) Build aggregated in one loop, no extra awaits
    const aggregated = openPurchases.map(op => {
      const base = prodMap[op._id.toString()]
        ? { ...prodMap[op._id.toString()], isTemporary: false }
        : {
            ...op,
            qtyOrdered: 0,
            expectedPostBranding: "",
            schedulePickUp: null,
            followUp: [],
            remarks: "",
            status: "",
            isTemporary: true,
          };

      const js = jsMap[op.jobSheetId?.toString()];
      if (js?.items) {
        const match = js.items.find(i => i.product === op.product);
        base.qtyRequired      = match?.quantity      ?? 0;
        base.brandingType     = match?.brandingType   ?? "";
        base.brandingVendor   = match?.brandingVendor ?? "";
      } else {
        base.qtyRequired = 0;
      }

      return base;
    });
    

    return res.json(aggregated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching aggregated production job sheets" });
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
