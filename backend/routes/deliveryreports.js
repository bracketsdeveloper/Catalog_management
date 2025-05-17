// routes/deliveryreports.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");

const DispatchSchedule = require("../models/DispatchSchedule");
const DeliveryReport = require("../models/DeliveryReport");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

const upload = multer({ storage: multer.memoryStorage() });

/* GET aggregated delivery reports */
router.get("/", authenticate, authorizeAdmin, async (_req, res) => {
  try {
    const dispatched = await DispatchSchedule.find({ status: "sent" }).lean();
    const reports = await DeliveryReport.find({}).lean();

    const reportMap = {};
    reports.forEach((r) => (reportMap[r.dispatchId.toString()] = r));

    const merged = dispatched.map((d) => {
      const existing = reportMap[d._id.toString()];
      if (existing) {
        return {
          ...existing,
          sentOn: existing.sentOn || d.sentOn,
        };
      }
      return {
        dispatchId: d._id,
        batchType: d.batchType,
        jobSheetNumber: d.jobSheetNumber,
        clientCompanyName: d.clientCompanyName,
        eventName: d.eventName,
        product: d.product,
        dispatchQty: d.dispatchQty,
        deliveredSentThrough: d.modeOfDelivery,
        dcNumber: d.dcNumber || "",
        status: "Pending",
        sentOn: d.sentOn,
      };
    });

    res.json(merged);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fetch failed" });
  }
});

/* POST create */
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  upload.single("excel"),
  async (req, res) => {
    try {
      const body = JSON.parse(req.body.data);
      if (req.file) {
        const wb = XLSX.read(req.file.buffer, { type: "buffer" });
        const first = wb.SheetNames[0];
        body.excelFileName = req.file.originalname;
        body.excelData = XLSX.utils.sheet_to_json(wb.Sheets[first]);
      }
      body.createdBy = req.user.email;

      const doc = new DeliveryReport(body);
      await doc.save();
      res.status(201).json(doc);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Create failed" });
    }
  }
);

/* PUT update */
router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  upload.single("excel"),
  async (req, res) => {
    try {
      const body = JSON.parse(req.body.data);
      if (req.file) {
        const wb = XLSX.read(req.file.buffer, { type: "buffer" });
        const first = wb.SheetNames[0];
        body.excelFileName = req.file.originalname;
        body.excelData = XLSX.utils.sheet_to_json(wb.Sheets[first]);
      }
      body.updatedAt = Date.now();

      const updated = await DeliveryReport.findByIdAndUpdate(req.params.id, body, { new: true });
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Update failed" });
    }
  }
);

module.exports = router;
