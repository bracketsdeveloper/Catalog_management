const express = require("express");
const router = express.Router();
  
const DispatchSchedule = require("../models/DispatchSchedule");
const DeliveryReport  = require("../models/DeliveryReport");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

/**
 * GET  /api/admin/delivery-completed
 *   - Merge DispatchSchedule (status="sent") with any existing DeliveryReport
 *   - Always set sentOn = DeliveryReport.sentOn || DispatchSchedule.sentOn
 */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // all dispatched rows
    const dispatched = await DispatchSchedule.find({ status: "sent" }).lean();
    // all existing DR docs
    const reports    = await DeliveryReport.find({}).lean();

    const reportMap = reports.reduce((m, r) => {
      m[r.dispatchId.toString()] = r;
      return m;
    }, {});

    const merged = dispatched.map((d) => {
      const existing = reportMap[d._id.toString()];

      // pick sentOn from DB if present, else from dispatch schedule
      const sentOnValue = existing?.sentOn || d.sentOn;

      if (existing) {
        return {
          ...existing,
          // override/ensure sentOn
          sentOn: sentOnValue,
        };
      }

      // brand new row (no DR created yet)
      return {
        dispatchId:            d._id,
        batchType:             d.batchType,
        jobSheetNumber:        d.jobSheetNumber,
        clientCompanyName:     d.clientCompanyName,
        eventName:             d.eventName,
        product:               d.product,
        dispatchQty:           d.dispatchQty,
        deliveredSentThrough:  d.modeOfDelivery,
        dcNumber:              d.dcNumber || "",
        // inject sentOn straight from DispatchSchedule
        sentOn:                sentOnValue,
        deliveredOn:           null,
        status:                "Pending",
        followUp:              [],
        excelFileName:         null,
        excelData:             [],
        createdBy:             null,
        updatedAt:             null,
      };
    });

    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Fetch failed" });
  }
});

module.exports = router;
