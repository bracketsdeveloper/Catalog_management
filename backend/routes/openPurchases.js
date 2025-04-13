const express = require("express");
const router = express.Router();
const OpenPurchase = require("../models/OpenPurchase");
const ClosedPurchase = require("../models/ClosedPurchase");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * GET /
 * Fetch all open purchase records combined (aggregated from JobSheets and updated OpenPurchase records).
 * (This endpoint builds an aggregated list.)
 */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // STEP 1: Aggregate from JobSheets
    const jobSheets = await JobSheet.find({});
    let aggregated = [];
    jobSheets.forEach(js => {
      js.items.forEach((item, index) => {
        aggregated.push({
          _id: `temp_${js._id}_${index}`, // Temporary ID
          jobSheetCreatedDate: js.createdAt,
          jobSheetNumber: js.jobSheetNumber,
          clientCompanyName: js.clientCompanyName,
          eventName: js.eventName,
          product: item.product,
          sourcingFrom: item.sourcingFrom,
          vendorContactNumber: "",
          orderConfirmedDate: null,
          expectedReceiveDate: null,
          schedulePickUp: null,
          followUp: [],
          remarks: "",
          status: "pending",
          jobSheetId: js._id,
          isTemporary: true
        });
      });
    });

    // STEP 2: Fetch updated records from OpenPurchase collection
    const updatedRecords = await OpenPurchase.find({});
    updatedRecords.forEach(updated => {
      if (updated.jobSheetId) {
        const index = aggregated.findIndex(rec =>
          rec.jobSheetId &&
          rec.jobSheetId.toString() === updated.jobSheetId.toString() &&
          rec.product === updated.product
        );
        if (index !== -1) {
          aggregated[index] = { ...updated.toObject(), isTemporary: false };
        } else {
          aggregated.push({ ...updated.toObject(), isTemporary: false });
        }
      } else {
        aggregated.push({ ...updated.toObject(), isTemporary: false });
      }
    });

    // Remove duplicates using composite key of jobSheetNumber + product.
    const seen = new Set();
    const finalAggregated = aggregated.filter((rec) => {
      const key = `${rec.jobSheetNumber}_${rec.product}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json(finalAggregated);
  } catch (error) {
    console.error("Error fetching combined open purchases:", error);
    res.status(500).json({ message: "Server error fetching open purchases" });
  }
});

/**
 * POST /
 * Create a new Open Purchase record.
 */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data._id && data._id.startsWith("temp_")) {
      delete data._id;
    }
    const newPurchase = new OpenPurchase(data);
    await newPurchase.save();
    res.status(201).json({ message: "Open purchase created", purchase: newPurchase });
  } catch (error) {
    console.error("Error creating open purchase:", error);
    res.status(500).json({ message: "Server error creating open purchase" });
  }
});

/**
 * PUT /:id
 * Update an existing Open Purchase record.
 * Then check if all products for the same job sheet are received;
 * if so, move them to ClosedPurchase.
 */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedPurchase = await OpenPurchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPurchase) return res.status(404).json({ message: "Open purchase not found" });

    // After updating, check if all OpenPurchase records for this job sheet are "received"
    const jobSheetId = updatedPurchase.jobSheetId;
    if (jobSheetId) {
      // Find the corresponding JobSheet to get list of products
      const jobSheet = await JobSheet.findById(jobSheetId);
      if (jobSheet) {
        const products = jobSheet.items.map(item => item.product);
        // Fetch all OpenPurchase records with this jobSheetId (and product in that list)
        const openPurchases = await OpenPurchase.find({
          jobSheetId,
          product: { $in: products }
        });
        // Check if every record in openPurchases has status "received"
        if (openPurchases.length > 0 && openPurchases.every(p => p.status === "received")) {
          // For each record, create a ClosedPurchase record
          for (const p of openPurchases) {
            const closedData = {
              jobSheetCreatedDate: p.jobSheetCreatedDate,
              jobSheetNumber: p.jobSheetNumber,
              clientCompanyName: p.clientCompanyName,
              eventName: p.eventName,
              product: p.product,
              sourcingFrom: p.sourcingFrom,
              vendorContactNumber: p.vendorContactNumber,
              orderConfirmedDate: p.orderConfirmedDate,
              expectedReceiveDate: p.expectedReceiveDate,
              schedulePickUp: p.schedulePickUp,
              followUp: p.followUp,
              remarks: p.remarks,
              status: p.status,
              jobSheetId: p.jobSheetId,
              createdAt: p.createdAt
            };
            const newClosed = new (require("../models/ClosedPurchase"))(closedData);
            await newClosed.save();
          }
          // Delete these records from OpenPurchase.
          await OpenPurchase.deleteMany({ jobSheetId, product: { $in: products } });
          console.log(`Moved ${openPurchases.length} records for jobSheetId ${jobSheetId} to ClosedPurchase`);
        }
      }
    }

    res.json({ message: "Open purchase updated", purchase: updatedPurchase });
  } catch (error) {
    console.error("Error updating open purchase:", error);
    res.status(500).json({ message: "Server error updating open purchase" });
  }
});

/**
 * DELETE /:id
 * Delete an Open Purchase record.
 */
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedPurchase = await OpenPurchase.findByIdAndDelete(req.params.id);
    if (!deletedPurchase) return res.status(404).json({ message: "Open purchase not found" });
    res.json({ message: "Open purchase deleted" });
  } catch (error) {
    console.error("Error deleting open purchase:", error);
    res.status(500).json({ message: "Server error deleting open purchase" });
  }
});

module.exports = router;
