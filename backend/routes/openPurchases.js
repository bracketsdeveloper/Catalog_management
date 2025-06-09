const express = require("express");
const router = express.Router();
const OpenPurchase = require("../models/OpenPurchase");
const ClosedPurchase = require("../models/ClosedPurchase");
const JobSheet = require("../models/JobSheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const sendMail = require("../utils/sendMail");
const User = require("../models/User");

router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const sortKey = req.query.sortKey || "deliveryDateTime";
    const sortDirection = req.query.sortDirection === "desc" ? -1 : 1;

    const jobSheets = await JobSheet.find({ isDraft: false });
    const dbRecords = await OpenPurchase.find({});

    let aggregated = [];
    jobSheets.forEach((js) => {
      js.items.forEach((item, index) => {
        const deliveryDate = js.deliveryDate ? new Date(js.deliveryDate) : null;
        aggregated.push({
          _id: `temp_${js._id}_${index}`,
          jobSheetCreatedDate: js.createdAt,
          jobSheetNumber: js.jobSheetNumber,
          clientCompanyName: js.clientCompanyName,
          eventName: js.eventName,
          product: item.product,
          size: item.size || "",
          sourcedBy: item.sourcedBy || "",
          sourcingFrom: item.sourcingFrom || "",
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
          isTemporary: true,
        });
      });
    });

    dbRecords.forEach((db) => {
      const index = aggregated.findIndex(
        (rec) =>
          rec.jobSheetId?.toString() === db.jobSheetId?.toString() &&
          rec.product === db.product &&
          (rec.size || "") === (db.size || "")
      );
      if (index !== -1) {
        aggregated[index] = { ...db.toObject(), isTemporary: false };
      } else {
        aggregated.push({ ...db.toObject(), isTemporary: false });
      }
    });

    const seen = new Set();
    const finalAggregated = aggregated.filter((rec) => {
      const key = `${rec.jobSheetNumber}_${rec.product}_${rec.size || ""}`;
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
      if (
        sortKey.includes("Date") ||
        sortKey === "schedulePickUp" ||
        sortKey === "deliveryDateTime"
      ) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      return aVal < bVal ? -sortDirection : sortDirection;
    });

    res.json(finalAggregated);
  } catch (error) {
    console.error("Error fetching open purchases:", error);
    res.status(500).json({ message: "Server error fetching open purchases" });
  }
});

router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data._id && data._id.startsWith("temp_")) {
      delete data._id;
    }
    if (data.jobSheetId) {
      const js = await JobSheet.findById(data.jobSheetId);
      if (!js) {
        return res.status(404).json({ message: "JobSheet not found" });
      }
      if (js.deliveryDate) {
        data.deliveryDateTime = new Date(js.deliveryDate);
      }
    }
    const newPurchase = new OpenPurchase(data);
    await newPurchase.save();

    if (newPurchase.status === "received") {
      const jobSheetId = newPurchase.jobSheetId;
      const jobSheet = await JobSheet.findById(jobSheetId);
      if (jobSheet) {
        const products = jobSheet.items.map((item) => ({
          product: item.product,
          size: item.size || "",
        }));
        const openPurchases = await OpenPurchase.find({
          jobSheetId,
          $or: products.map((p) => ({
            product: p.product,
            size: p.size,
          })),
        });
        if (openPurchases.every((p) => p.status === "received")) {
          for (const p of openPurchases) {
            const closedData = {
              jobSheetCreatedDate: p.jobSheetCreatedDate,
              jobSheetNumber: p.jobSheetNumber,
              clientCompanyName: p.clientCompanyName,
              eventName: p.eventName,
              product: p.product,
              size: p.size,
              sourcedBy: p.sourcedBy,
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
              deliveryDateTime: p.deliveryDateTime,
              qtyOrdered: p.qtyOrdered,
              qtyRequired: p.qtyRequired,
            };
            const existingClosed = await ClosedPurchase.findOne({
              jobSheetId: p.jobSheetId,
              product: p.product,
              size: p.size || "",
            });
            if (existingClosed) {
              await ClosedPurchase.updateOne(
                { _id: existingClosed._id },
                { $set: closedData }
              );
            } else {
              const newClosed = new ClosedPurchase(closedData);
              await newClosed.save();
            }
          }
        }
      }
    }

    res.status(201).json({ message: "Open purchase created", purchase: newPurchase });
  } catch (error) {
    console.error("Error creating open purchase:", error);
    res.status(500).json({ message: "Server error creating open purchase" });
  }
});

router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.jobSheetId) {
      const js = await JobSheet.findById(updateData.jobSheetId);
      if (!js) {
        return res.status(404).json({ message: "JobSheet not found" });
      }
      if (js.deliveryDate) {
        updateData.deliveryDateTime = new Date(js.deliveryDate);
      }
    }
    const updatedPurchase = await OpenPurchase.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }

    if (updatedPurchase.status === "received") {
      const jobSheetId = updatedPurchase.jobSheetId;
      const jobSheet = await JobSheet.findById(jobSheetId);
      if (jobSheet) {
        const products = jobSheet.items.map((item) => ({
          product: item.product,
          size: item.size || "",
        }));
        const openPurchases = await OpenPurchase.find({
          jobSheetId,
          $or: products.map((p) => ({
            product: p.product,
            size: p.size,
          })),
        });
        if (openPurchases.every((p) => p.status === "received")) {
          for (const p of openPurchases) {
            const closedData = {
              jobSheetCreatedDate: p.jobSheetCreatedDate,
              jobSheetNumber: p.jobSheetNumber,
              clientCompanyName: p.clientCompanyName,
              eventName: p.eventName,
              product: p.product,
              size: p.size,
              sourcedBy: p.sourcedBy,
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
              deliveryDateTime: p.deliveryDateTime,
              qtyOrdered: p.qtyOrdered,
              qtyRequired: p.qtyRequired,
            };
            const existingClosed = await ClosedPurchase.findOne({
              jobSheetId: p.jobSheetId,
              product: p.product,
              size: p.size || "",
            });
            if (existingClosed) {
              await ClosedPurchase.updateOne(
                { _id: existingClosed._id },
                { $set: closedData }
              );
            } else {
              const newClosed = new ClosedPurchase(closedData
            );
            await newClosed.save();
            }
          }
        };
      }
    }

    if (updatedPurchase.status === "alert") {
      const purchaseObj = updatedPurchase.toObject();
      let mailBody = "";
      const fields = [
        "jobSheetCreatedDate",
        "jobSheetNumber",
        "clientCompanyName",
        "eventName",
        "product",
        "size",
        "sourcingFrom",
        "status",
        "jobSheetId",
        "deliveryDateTime",
      ];
      fields.forEach((f) => {
        let value = purchaseObj[field];
        if (value && (field.includes("Date") || field === "deliveryDateTime")) {
          value = new Date(value).toLocaleString();
        }
        mailBody += `<b>${field}:</b> ${value}<br/>`;
      });

      const superAdmins = await User.find({ isSuperAdmin: true });
      const emails = superAdmins.map((user) => user.email);
      if (emails.length > 0) {
        await sendMail({
          to: emails.join(","),
          subject: "Alert Raised 🔥🔥!! IN PURCHASES",
          html: mailBody,
        });
      }
    }

    res.json({ message: "Open purchase updated", purchase: updatedPurchase });
  } catch (error) {
    console.error("Error updating open purchase:", error);
    res.status(500).json({ message: "Server error updating open purchase" });
  }
});

router.post("/split/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const originalPurchase = await OpenPurchase.findById(id);
    if (!originalPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }

    if (originalPurchase.qtyOrdered >= originalPurchase.qtyRequired) {
      return res.status(400).json({ message: "Cannot split; qtyOrdered is not less than qtyRequired" });
    }

    // Create ClosedPurchase for qtyOrdered
    const closedData = {
      jobSheetCreatedDate: originalPurchase.jobSheetCreatedDate,
      jobSheetNumber: originalPurchase.jobSheetNumber,
      clientCompanyName: originalPurchase.clientCompanyName,
      eventName: originalPurchase.eventName,
      product: originalPurchase.product,
      size: originalPurchase.size || "",
      sourcedBy: originalPurchase.sourcedBy,
      sourcingFrom: originalPurchase.sourcingFrom,
      vendorContactNumber: originalPurchase.vendorContactNumber,
      orderConfirmedDate: originalPurchase.orderConfirmedDate,
      expectedReceiveDate: originalPurchase.expectedReceiveDate,
      schedulePickUp: originalPurchase.schedulePickUp,
      followUp: originalPurchase.followUp,
      remarks: originalPurchase.remarks,
      status: "received",
      jobSheetId: originalPurchase.jobSheetId,
      createdAt: originalPurchase.createdAt,
      deliveryDateTime: originalPurchase.deliveryDateTime,
      qtyOrdered: originalPurchase.qtyOrdered,
      qtyRequired: originalPurchase.qtyOrdered, // Match qtyOrdered for closed record
    };
    const existingClosed = await ClosedPurchase.findOne({
      jobSheetId: originalPurchase.jobSheetId,
      product: originalPurchase.product,
      size: originalPurchase.size || "",
    });
    if (existingClosed) {
      await ClosedPurchase.updateOne(
        { _id: existingClosed._id },
        { $set: closedData }
      );
    } else {
      const newClosed = new ClosedPurchase(closedData);
      await newClosed.save();
    }

    // Update original OpenPurchase for remaining qty
    const remainingQty = originalPurchase.qtyRequired - originalPurchase.qtyOrdered;
    await OpenPurchase.findByIdAndUpdate(id, {
      qtyRequired: remainingQty,
      qtyOrdered: 0,
      status: "pending",
      remarks: `Split: ${originalPurchase.qtyOrdered} closed, ${remainingQty} pending`,
    });

    res.json({ message: "Purchase split successfully" });
  } catch (error) {
    console.error("Error splitting purchase:", error);
    res.status(500).json({ message: "Server error splitting purchase" });
  }
});

router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedPurchase = await OpenPurchase.findByIdAndDelete(req.params.id);
    if (!deletedPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }
    res.json({ message: "Open purchase deleted" });
  } catch (error) {
    console.error("Error deleting open purchase:", error);
    res.status(500).json({ message: "Server error deleting open purchase" });
  }
});

module.exports = router;