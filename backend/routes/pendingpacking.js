// routes/pendingpacking.js
const express = require("express");
const router = express.Router();

const ProductionJobSheet = require("../models/ProductionJobsheet");
const PendingPacking = require("../models/PendingPacking");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* ------------------------------------------------------------------ */
/* GET /api/admin/packing-pending                                     */
/* ------------------------------------------------------------------ */
// routes/pendingpacking.js
/* … existing imports … */

/* ------------------------------------------------------------------ */
/* GET  /api/admin/packing-pending                                     */
/* ------------------------------------------------------------------ */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
    try {
      const prodSheets = await ProductionJobSheet.find({ status: "received" }).lean();
      const savedPendings = await PendingPacking.find({}).lean();
  
      /* map of saved rows for quick lookup */
      const savedMap = {};
      savedPendings.forEach((pp) => {
        savedMap[pp.productionJobSheetId.toString()] = pp;
      });
  
      const merged = prodSheets.map((p) => {
        const existing = savedMap[p._id.toString()];
        if (existing) {
          /* ensure Qty fields remain accurate if prod sheet changed */
          return {
            ...existing,
            qtyOrdered: p.qtyRequired,          // ← display “Qty Ordered”
            qtyToBeDelivered: p.qtyOrdered,     // ← display “Qty to Deliver”
          };
        }
  
        /* transient object if not yet saved */
        return {
          productionJobSheetId: p._id,
  
          jobSheetCreatedDate: p.jobSheetCreatedDate,
          jobSheetNumber: p.jobSheetNumber,
          expectedDeliveryDate: p.deliveryDateTime,
          clientCompanyName: p.clientCompanyName,
          eventName: p.eventName,
          product: p.product,
  
          /* correct mapping -------------------------------------- */
          qtyOrdered: p.qtyRequired,          // Qty Ordered
          qtyToBeDelivered: p.qtyOrdered,     // Qty to Deliver
  
          brandedProductExpectedOn: p.expectedPostBranding
            ? new Date(p.expectedPostBranding.getTime() - 24 * 60 * 60 * 1000)
            : null,
  
          jobSheetValidated: "No",
          status: "None",
          followUp: [],
        };
      });
  
      res.json(merged);
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error fetching packing data" });
    }
  });
  

/* ------------------------------------------------------------------ */
/* POST (create new)                                                  */
/* ------------------------------------------------------------------ */
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      /* if already exists, reject */
      const exists = await PendingPacking.findOne({
        productionJobSheetId: req.body.productionJobSheetId,
      });
      if (exists) {
        return res.status(400).json({ message: "Row already exists – use PUT" });
      }

      const doc = new PendingPacking({
        ...req.body,
        createdBy: req.user.email,
      });

      await doc.save();
      res.status(201).json(doc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Create failed" });
    }
  }
);

/* ------------------------------------------------------------------ */
/* PUT (update existing)                                              */
/* ------------------------------------------------------------------ */
router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const updated = await PendingPacking.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Update failed" });
    }
  }
);

module.exports = router;
