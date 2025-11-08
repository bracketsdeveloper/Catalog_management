// routes/adminVendors.js
const express = require("express");
const router = express.Router();
const xlsx = require("xlsx");
const multer = require("multer");
const Vendor = require("../models/Vendor");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* ---------------- Utils ---------------- */
const sanitiseClients = (raw = []) =>
  Array.isArray(raw)
    ? raw
        .filter((c) => c && c.name && c.contactNumber)
        .map((c) => ({
          name: c.name,
          contactNumber: c.contactNumber.toString(),
        }))
    : [];

const normaliseReliability = (val) => {
  const s = (val || "").toString().trim().toLowerCase();
  return s === "non-reliable" || s === "non reliable" ? "non-reliable" : "reliable";
};

/** Ensure one primary in an array (first item becomes primary if none) */
function ensurePrimary(arr, key = "isPrimary") {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const anyPrimary = arr.some((x) => !!x[key]);
  if (!anyPrimary) arr[0][key] = true;
  // de-dupe empties
  return arr.filter((x) => Object.values(x).some((v) => v !== "" && v != null));
}

/** Normalise incoming GST payload (array or legacy single) */
function normaliseGsts(body) {
  // preferred: array of {gst,label,isPrimary}
  if (Array.isArray(body.gstNumbers)) {
    const mapped = body.gstNumbers
      .map((g) => ({
        gst: (g?.gst || "").toString().trim(),
        label: (g?.label || "").toString().trim(),
        isPrimary: !!g?.isPrimary,
      }))
      .filter((g) => g.gst);
    return ensurePrimary(mapped, "isPrimary");
  }
  // legacy single string in body.gst
  if (body.gst) {
    return ensurePrimary([{ gst: body.gst.toString().trim(), label: "", isPrimary: true }], "isPrimary");
  }
  return [];
}

/** Normalise incoming bank accounts payload (array or legacy singles) */
function normaliseBanks(body) {
  if (Array.isArray(body.bankAccounts)) {
    const mapped = body.bankAccounts
      .map((b) => ({
        bankName: (b?.bankName || "").toString().trim(),
        accountNumber: (b?.accountNumber || "").toString().trim(),
        ifscCode: (b?.ifscCode || "").toString().trim(),
        accountHolder: (b?.accountHolder || "").toString().trim(),
        branch: (b?.branch || "").toString().trim(),
        isPrimary: !!b?.isPrimary,
      }))
      .filter((b) => b.bankName || b.accountNumber || b.ifscCode);
    return ensurePrimary(mapped, "isPrimary");
  }
  // legacy triad
  if (body.bankName || body.accountNumber || body.ifscCode) {
    return ensurePrimary([
      {
        bankName: (body.bankName || "").toString().trim(),
        accountNumber: (body.accountNumber || "").toString().trim(),
        ifscCode: (body.ifscCode || "").toString().trim(),
        accountHolder: "",
        branch: "",
        isPrimary: true,
      },
    ], "isPrimary");
  }
  return [];
}

/* ---------------- Upload config ---------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) cb(null, true);
    else cb(new Error("Invalid file type. Only Excel files allowed."), false);
  },
});

/* ---------------- Get all vendors (non-deleted) ---------------- */
router.get("/vendors", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const vendors = await Vendor.find({ deleted: false }).select(
      "vendorName vendorCompany brandDealing location clients postalCode reliability " +
      "gstNumbers bankAccounts " +
      // legacy fields still selected for old UIs
      "gst bankName accountNumber ifscCode " +
      "createdAt createdBy updatedAt updatedBy deletedAt deletedBy"
    );
    res.json(vendors);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fetch vendors failed" });
  }
});

/* ---------------- Create vendor ---------------- */
router.post("/vendors", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      vendorName,
      vendorCompany,
      brandDealing,
      location,
      clients: rawClients = [],
      postalCode,
      reliability,
    } = req.body;

    if (!vendorName) return res.status(400).json({ message: "Vendor name is required" });
    if (postalCode && !/^\d{6}$/.test(String(postalCode).trim()))
      return res.status(400).json({ message: "Postal code must be 6 digits" });

    const gstNumbers = normaliseGsts(req.body);
    const bankAccounts = normaliseBanks(req.body);

    const doc = await Vendor.create({
      vendorName,
      vendorCompany,
      brandDealing,
      location,
      clients: sanitiseClients(rawClients),
      postalCode: postalCode?.toString().trim() || "",
      reliability: normaliseReliability(reliability),
      gstNumbers,
      bankAccounts,
      // keep legacy fields empty for new inserts
      gst: undefined,
      bankName: undefined,
      accountNumber: undefined,
      ifscCode: undefined,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Vendor created", vendor: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Create failed" });
  }
});

/* ---------------- Bulk upload (Excel) ----------------
   Back-compat columns supported:
   - gst, bankName, accountNumber, ifscCode -> mapped to arrays with a single entry
------------------------------------------------------ */
router.post(
  "/upload-vendors",
  authenticate,
  authorizeAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Please upload a file" });

      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet);
      if (!rows.length) return res.status(400).json({ message: "No data found in the file" });

      const docs = rows.map((r, idx) => {
        // clients column may contain JSON string
        let clients = [];
        if (r.clients && typeof r.clients === "string") {
          try {
            const parsed = JSON.parse(r.clients);
            if (Array.isArray(parsed)) clients = sanitiseClients(parsed);
          } catch {
            console.warn(`Row ${idx + 2}: invalid clients JSON`);
          }
        }
        const postal = r.postalCode?.toString().trim();
        if (postal && !/^\d{6}$/.test(postal)) console.warn(`Row ${idx + 2}: invalid postal code`);

        const body = {
          gst: r.gst,
          bankName: r.bankName,
          accountNumber: r.accountNumber,
          ifscCode: r.ifscCode,
        };

        const gstNumbers = normaliseGsts(body);
        const bankAccounts = normaliseBanks(body);

        return {
          vendorName: r.vendorName?.toString().trim(),
          vendorCompany: r.vendorCompany?.toString().trim(),
          brandDealing: r.brandDealing?.toString().trim(),
          location: r.location?.toString().trim(),
          clients,
          postalCode: postal || "",
          reliability: normaliseReliability(r.reliability),
          gstNumbers,
          bankAccounts,
          // scrub legacy on fresh insert
          gst: undefined,
          bankName: undefined,
          accountNumber: undefined,
          ifscCode: undefined,
          createdBy: req.user.id,
        };
      });

      const created = await Vendor.insertMany(docs);
      res.status(201).json({ message: "Vendors uploaded successfully", vendors: created });
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ message: "Bulk upload failed" });
    }
  }
);

/* ---------------- Update vendor ---------------- */
router.put("/vendors/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const {
      vendorName,
      vendorCompany,
      brandDealing,
      location,
      clients,
      postalCode,
      reliability,
    } = req.body;

    if (!vendorName || typeof vendorName !== "string")
      return res.status(400).json({ message: "Vendor name is required" });

    if (postalCode && !/^\d{6}$/.test(String(postalCode).trim()))
      return res.status(400).json({ message: "Postal code must be 6 digits" });

    const gstNumbers = normaliseGsts(req.body);
    const bankAccounts = normaliseBanks(req.body);

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      {
        vendorName,
        vendorCompany,
        brandDealing,
        location,
        clients: sanitiseClients(clients),
        postalCode: postalCode?.toString().trim() || "",
        reliability: normaliseReliability(reliability),
        gstNumbers,
        bankAccounts,
        updatedAt: new Date(),
        updatedBy: req.user.id,
        // wipe legacy fields on update to avoid future confusion
        gst: undefined,
        bankName: undefined,
        accountNumber: undefined,
        ifscCode: undefined,
      },
      { new: true }
    );

    if (!updatedVendor) return res.status(404).json({ message: "Vendor not found" });
    res.json({ message: "Vendor updated", vendor: updatedVendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- Delete vendor ---------------- */
router.delete("/vendors/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const hardDelete = req.query.hard === "true";
    const doc = await Vendor.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Vendor not found" });

    if (hardDelete) {
      await Vendor.findByIdAndDelete(req.params.id);
      return res.json({ message: "Permanently deleted" });
    }

    doc.deleted = true;
    doc.deletedAt = new Date();
    doc.deletedBy = req.user.id;
    await doc.save();

    res.json({ message: "Soft deleted successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
