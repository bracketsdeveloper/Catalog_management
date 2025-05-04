const express = require("express");
const router = express.Router();
const Vendor = require("../models/Vendor"); 
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");


const sanitiseClients = (raw = []) =>
  Array.isArray(raw)
    ? raw
        .filter((c) => c && c.name && c.contactNumber)
        .map((c) => ({
          name: c.name,
          contactNumber: c.contactNumber.toString(),
        }))
    : [];

// Get all active (non-deleted) vendors
router.get("/vendors", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const vendors = await Vendor.find({ deleted: false })
      .select(
        "vendorName vendorCompany brandDealing location clients gst bankName accountNumber ifscCode createdAt createdBy updatedAt updatedBy deletedAt deletedBy"
      );
    
    // Send the vendors data in the response
    res.json(vendors);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fetch vendors failed" });
  }
});

// Get all active (non-deleted) vendors

/* ===== Create ===== */
router.post("/vendors", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { vendorName,
            vendorCompany, 
            brandDealing,
            location, 
            clients: rawClients = [],
            gst, 
            bankName, 
            accountNumber,
            ifscCode } = req.body;

    if (!vendorName)
      return res.status(400).json({ message: "Vendor name is required" });

     
    const doc = await Vendor.create({
      vendorName,
      vendorCompany,
      brandDealing,
      location,
      clients: sanitiseClients(rawClients),
      gst,
      bankName,
      accountNumber,
      ifscCode,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Vendor created", vendor: doc });
  

        }catch (e) {
        console.error(e);
        res.status(500).json({ message: "Create failed" });
        }
    });

router.delete(
  "/vendors/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const hardDelete = req.query.hard === "true"; // ?hard=true

      const doc = await Vendor.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: "Vendor not found" });

      if (hardDelete) {
        await Vendor.findByIdAndDelete(req.params.id);
        return res.json({ message: "Permanently deleted" });
      }

      // Soft delete
      doc.deleted = true;
      doc.deletedAt = new Date();
      doc.deletedBy = req.user.id;

      await doc.save();

      res.json({ message: "Soft deleted successfully" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Delete failed" });
    }
  }
);

    module.exports = router;