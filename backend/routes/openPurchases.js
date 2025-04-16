const express = require("express");
const router = express.Router();
const OpenPurchase = require("../models/OpenPurchase");
const ClosedPurchase = require("../models/ClosedPurchase");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const sendMail = require("../utils/sendMail");
const User = require("../models/User");

// routes/openPurchases.js (snippet from the GET endpoint)
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const sortKey = req.query.sortKey || "deliveryDateTime";
    const sortDirection = req.query.sortDirection === "desc" ? -1 : 1;

    const jobSheets = await JobSheet.find({});
    let aggregated = [];
    jobSheets.forEach(js => {
      js.items.forEach((item, index) => {
        const deliveryDate = js.deliveryDate ? new Date(js.deliveryDate) : null;
        aggregated.push({
          _id: `temp_${js._id}_${index}`,
          jobSheetCreatedDate: js.createdAt,
          jobSheetNumber: js.jobSheetNumber,
          clientCompanyName: js.clientCompanyName,
          eventName: js.eventName,
          product: item.product,
          sourcingFrom: item.sourcingFrom,
          // NEW: Set qtyRequired from item's quantity and default qtyOrdered
          qtyRequired: item.quantity,
          qtyOrdered: 0,
          deliveryDateTime: deliveryDate,
          vendorContactNumber: "",
          orderConfirmedDate: null,
          expectedReceiveDate: null,
          schedulePickUp: null,
          followUp: [],
          remarks: "",
          status: "",
          jobSheetId: js._id,
          isTemporary: true
        });
      });
    });

    // Merge in records stored in the database
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

    // Remove duplicates then sort
    const seen = new Set();
    const finalAggregated = aggregated.filter((rec) => {
      const key = `${rec.jobSheetNumber}_${rec.product}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    finalAggregated.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (!aVal && !bVal) return 0;
      if (!aVal) return sortDirection === 1 ? 1 : -1;
      if (!bVal) return sortDirection === 1 ? -1 : 1;
      if (sortKey.includes("Date") || sortKey === "schedulePickUp" || sortKey === "deliveryDateTime") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return -sortDirection;
      if (aVal > bVal) return sortDirection;
      return 0;
    });

    res.json(finalAggregated);
  } catch (error) {
    console.error("Error fetching combined open purchases:", error);
    res.status(500).json({ message: "Server error fetching open purchases" });
  }
});


// routes/openPurchases.js (snippet from POST endpoint)
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data._id && data._id.startsWith("temp_")) {
      delete data._id;
    }
    if (data.jobSheetId) {
      const js = await JobSheet.findById(data.jobSheetId);
      if (js && js.deliveryDate) {
        data.deliveryDateTime = new Date(js.deliveryDate);
      }
    }
    // data.qtyRequired should ideally be coming from the aggregated JobSheet item.
    // data.qtyOrdered will come from the form input.
    const newPurchase = new OpenPurchase(data);
    await newPurchase.save();
    res.status(201).json({ message: "Open purchase created", purchase: newPurchase });
  } catch (error) {
    console.error("Error creating open purchase:", error);
    res.status(500).json({ message: "Server error creating open purchase" });
  }
});

// And in the PUT endpoint, the same pattern applies:
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.jobSheetId) {
      const js = await JobSheet.findById(updateData.jobSheetId);
      if (js && js.deliveryDate) {
        updateData.deliveryDateTime = new Date(js.deliveryDate);
      }
    }
    const updatedPurchase = await OpenPurchase.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedPurchase)
      return res.status(404).json({ message: "Open purchase not found" });
    
    // (Logic to move records to ClosedPurchase if all items are received remains unchanged.)
    // ...

    // Email alert if status is "alert" remains unchanged.
    // ...

    res.json({ message: "Open purchase updated", purchase: updatedPurchase });
  } catch (error) {
    console.error("Error updating open purchase:", error);
    res.status(500).json({ message: "Server error updating open purchase" });
  }
});


router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.jobSheetId) {
      const js = await JobSheet.findById(updateData.jobSheetId);
      if (js && js.deliveryDate) {
        updateData.deliveryDateTime = new Date(js.deliveryDate);
      }
    }
    const updatedPurchase = await OpenPurchase.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedPurchase)
      return res.status(404).json({ message: "Open purchase not found" });

    const jobSheetId = updatedPurchase.jobSheetId;
    if (jobSheetId) {
      const jobSheet = await JobSheet.findById(jobSheetId);
      if (jobSheet) {
        const products = jobSheet.items.map(item => item.product);
        const openPurchases = await OpenPurchase.find({
          jobSheetId,
          product: { $in: products }
        });
        if (openPurchases.length > 0 && openPurchases.every(p => p.status === "received")) {
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
              createdAt: p.createdAt,
              deliveryDateTime: p.deliveryDateTime
            };
            const newClosed = new ClosedPurchase(closedData);
            await newClosed.save();
          }
          await OpenPurchase.deleteMany({ jobSheetId, product: { $in: products } });
          console.log(`Moved ${openPurchases.length} records for jobSheetId ${jobSheetId} to ClosedPurchase`);
        }
      }
    }

    // If updated status is alert, send email to all super-admin users.
    if (updatedPurchase.status === "alert") {
      const purchaseObj = updatedPurchase.toObject();

      // Create an HTML email body with bold headings.
      let mailBody = "";
      const fields = [
        "jobSheetCreatedDate",
        "jobSheetNumber",
        "clientCompanyName",
        "eventName",
        "product",
        "sourcingFrom",
        "status",
        "jobSheetId",
        "deliveryDateTime"
      ];
      fields.forEach(field => {
        let value = purchaseObj[field];
        // If the field is a date, format it.
        if (value && (field.includes("Date") || field === "deliveryDateTime")) {
          value = new Date(value).toLocaleString();
        }
        mailBody += `<b>${field}:</b> ${value}<br/>`;
      });

      // Fetch emails of all users with isSuperAdmin true.
      const superAdmins = await User.find({ isSuperAdmin: true });
      const emails = superAdmins.map(user => user.email);
      if (emails.length > 0) {
        await sendMail({
          to: emails.join(","),
          subject: "Alert Raised 🔥🔥!! IN PURCHASES",
          html: mailBody
        });
      }
    }

    res.json({ message: "Open purchase updated", purchase: updatedPurchase });
  } catch (error) {
    console.error("Error updating open purchase:", error);
    res.status(500).json({ message: "Server error updating open purchase" });
  }
});

router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedPurchase = await OpenPurchase.findByIdAndDelete(req.params.id);
    if (!deletedPurchase)
      return res.status(404).json({ message: "Open purchase not found" });
    res.json({ message: "Open purchase deleted" });
  } catch (error) {
    console.error("Error deleting open purchase:", error);
    res.status(500).json({ message: "Server error deleting open purchase" });
  }
});

module.exports = router;

