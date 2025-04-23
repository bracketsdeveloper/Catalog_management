// routes/deliveryreports.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");

const DispatchSchedule = require("../models/DispatchSchedule");
const DeliveryReport = require("../models/DeliveryReport");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/* storage for uploaded Excel (in memory) */
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------------------------------------------------- */
/* GET  /api/admin/delivery-reports (aggregated)                   */
/* -------------------------------------------------------------- */
router.get("/", authenticate, authorizeAdmin, async (_req, res) => {
  try {
    const dispatched = await DispatchSchedule.find({ status: "sent" }).lean();
    const reports = await DeliveryReport.find({}).lean();

    const map = {};
    reports.forEach((r) => (map[r.dispatchId.toString()] = r));

    const merged = dispatched.map((d) =>
      map[d._id.toString()]
        ? map[d._id.toString()]
        : {
            dispatchId: d._id,
            batchType: d.batchType,
            jobSheetNumber: d.jobSheetNumber,
            clientCompanyName: d.clientCompanyName,
            eventName: d.eventName,
            product: d.product,
            dispatchQty: d.dispatchQty,
            deliveredSentThrough: d.modeOfDelivery,
            dcNumber: d.dcNumber || "", // Initialize DC#
            status: "Pending",
          }
    );

    res.json(merged);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fetch failed" });
  }
});

/* POST create (with optional excel upload) */
router.post(
  "/",
  authenticate,
  authorizeAdmin,
  upload.single("excel"),
  async (req, res) => {
    try {
      const body = JSON.parse(req.body.data); // front-end sends JSON string
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

/* PUT update (also supports excel upload / replace) */
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

      const updated = await DeliveryReport.findByIdAndUpdate(
        req.params.id,
        body,
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Update failed" });
    }
  }
);

module.exports = router;