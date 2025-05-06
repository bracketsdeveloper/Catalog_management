const express = require("express");
const router = express.Router();
const xlsx = require("xlsx");
const multer = require("multer");
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


    const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB max, 1 file
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files allowed."), false);
    }
  },
});

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

    //bulk upload via excel sheet
 /* ===== Multer Memory Storage Config ===== */

router.post(
  "/upload-vendors",
  authenticate,
  authorizeAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Please upload a file" });
      }

      // Parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const vendors = xlsx.utils.sheet_to_json(sheet);

      if (!vendors.length) {
        return res.status(400).json({ message: "No data found in the file" });
      }

      // Sanitize vendors
    const sanitizedVendors = vendors.map((vendor, index) => {
  let clients = [];

  // Safe JSON parse
  if (vendor.clients && typeof vendor.clients === "string") {
    try {
      const parsed = JSON.parse(vendor.clients);
      if (Array.isArray(parsed)) {
        clients = sanitiseClients(parsed); // your existing sanitizer
      }
    } catch (e) {
      console.warn(`Row ${index + 2} has invalid clients JSON`);
    }
  }

  return {
    vendorName: vendor.vendorName?.trim(),
    vendorCompany: vendor.vendorCompany?.trim(),
    brandDealing: vendor.brandDealing?.trim(),
    location: vendor.location?.trim(),
    gst: vendor.gst?.trim(),
    bankName: vendor.bankName?.trim(),
    accountNumber: vendor.accountNumber?.toString().trim(),
    ifscCode: vendor.ifscCode?.trim(),
    clients,
    createdBy: req.user.id,
  };
});


      const created = await Vendor.insertMany(sanitizedVendors);

      res.status(201).json({
        message: "Vendors uploaded successfully",
        vendors: created,
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ message: "Bulk upload failed" });
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