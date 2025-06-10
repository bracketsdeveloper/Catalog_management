const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
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
          deliveryDateTime: deliveryDate,
          jobSheetNumber: js.jobSheetNumber,
          clientCompanyName: js.clientCompanyName,
          eventName: js.eventName,
          product: item.product,
          size: item.size || "",
          sourcedBy: item.sourcedBy || "",
          sourcingFrom: item.sourcingFrom || "",
          qtyRequired: item.quantity,
          qtyOrdered: 0,
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

async function transferToClosedPurchase(openPurchase, session) {
  const closedData = {
    jobSheetCreatedDate: openPurchase.jobSheetCreatedDate,
    deliveryDateTime: openPurchase.deliveryDateTime, // Include deliveryDateTime
    jobSheetNumber: openPurchase.jobSheetNumber,
    clientCompanyName: openPurchase.clientCompanyName,
    eventName: openPurchase.eventName,
    product: openPurchase.product,
    size: openPurchase.size || "",
    sourcedBy: openPurchase.sourcedBy,
    sourcingFrom: openPurchase.sourcingFrom,
    vendorContactNumber: openPurchase.vendorContactNumber,
    orderConfirmedDate: openPurchase.orderConfirmedDate,
    expectedReceiveDate: openPurchase.expectedReceiveDate,
    schedulePickUp: openPurchase.schedulePickUp,
    followUp: openPurchase.followUp,
    remarks: openPurchase.remarks,
    status: openPurchase.status,
    jobSheetId: openPurchase.jobSheetId,
    createdAt: openPurchase.createdAt,
    closedAt: new Date(),
    qtyOrdered: openPurchase.qtyOrdered,
    qtyRequired: openPurchase.qtyRequired,
    // Only assign splitId if qtyOrdered < qtyRequired
    splitId: openPurchase.qtyOrdered < openPurchase.qtyRequired ? new mongoose.Types.ObjectId() : undefined,
  };

  const existingClosed = await ClosedPurchase.findOne({
    jobSheetId: openPurchase.jobSheetId,
    product: openPurchase.product,
    size: openPurchase.size || "",
    splitId: { $exists: false }, // Match non-split records
  }).session(session);

  if (existingClosed) {
    await ClosedPurchase.updateOne(
      { _id: existingClosed._id },
      { $set: closedData },
      { session }
    );
  } else {
    const newClosed = new ClosedPurchase(closedData);
    await newClosed.save({ session });
  }
}

router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const data = { ...req.body };
    if (data._id && data._id.startsWith("temp_")) {
      delete data._id;
    }
    if (data.jobSheetId) {
      const js = await JobSheet.findById(data.jobSheetId).session(session);
      if (!js) {
        await session.abortTransaction();
        return res.status(404).json({ message: "JobSheet not found" });
      }
      if (js.deliveryDate) {
        data.deliveryDateTime = new Date(js.deliveryDate);
      }
    }
    const newPurchase = new OpenPurchase(data);
    await newPurchase.save({ session });

    if (newPurchase.status === "received") {
      const jobSheetId = newPurchase.jobSheetId;
      const jobSheet = await JobSheet.findById(jobSheetId).session(session);
      if (jobSheet) {
        const products = jobSheet.items.map((item) => ({
          product: item.product,
          size: item.size || "",
        }));
        const openPurchases = await OpenPurchase.find(
          {
            jobSheetId,
            $or: products.map((p) => ({
              product: p.product,
              size: p.size,
            })),
          },
          null,
          { session }
        );
        if (openPurchases.every((p) => p.status === "received")) {
          for (const p of openPurchases) {
            await transferToClosedPurchase(p, session);
          }
        }
      }
    }

    await session.commitTransaction();
    res.status(201).json({ message: "Open purchase created", purchase: newPurchase });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating open purchase:", error);
    res.status(500).json({ message: "Server error creating open purchase" });
  } finally {
    session.endSession();
  }
});

router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const updateData = { ...req.body };
    if (updateData.jobSheetId) {
      const js = await JobSheet.findById(updateData.jobSheetId).session(session);
      if (!js) {
        await session.abortTransaction();
        return res.status(404).json({ message: "JobSheet not found" });
      }
      if (js.deliveryDate) {
        updateData.deliveryDateTime = new Date(js.deliveryDate);
      }
    }
    const updatedPurchase = await OpenPurchase.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, session }
    );
    if (!updatedPurchase) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Open purchase not found" });
    }

    if (updatedPurchase.status === "received") {
      const jobSheetId = updatedPurchase.jobSheetId;
      const jobSheet = await JobSheet.findById(jobSheetId).session(session);
      if (jobSheet) {
        const products = jobSheet.items.map((item) => ({
          product: item.product,
          size: item.size || "",
        }));
        const openPurchases = await OpenPurchase.find(
          {
            jobSheetId,
            $or: products.map((p) => ({
              product: p.product,
              size: p.size,
            })),
          },
          null,
          { session }
        );
        if (openPurchases.every((p) => p.status === "received")) {
          for (const p of openPurchases) {
            await transferToClosedPurchase(p, session);
          }
        }
      }
    }

    if (updatedPurchase.status === "alert") {
      const purchaseObj = updatedPurchase.toObject();
      let mailBody = "";
      const fields = [
        "jobSheetCreatedDate",
        "deliveryDateTime",
        "jobSheetNumber",
        "clientCompanyName",
        "eventName",
        "product",
        "size",
        "sourcingFrom",
        "status",
        "jobSheetId",
      ];
      fields.forEach((field) => {
        let value = purchaseObj[field];
        if (value && (field.includes("Date") || field === "deliveryDateTime")) {
          value = new Date(value).toLocaleString();
        }
        mailBody += `<b>${field}:</b> ${value}<br/>`;
      });

      const superAdmins = await User.find({ isSuperAdmin: true }).session(session);
      const emails = superAdmins.map((user) => user.email);
      if (emails.length > 0) {
        await sendMail({
          to: emails.join(","),
          subject: "Alert Raised 🔥🔥!! IN PURCHASES",
          html: mailBody,
        });
      }
    }

    await session.commitTransaction();
    res.json({ message: "Open purchase updated", purchase: updatedPurchase });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error updating open purchase:", error);
    res.status(500).json({ message: "Server error updating open purchase" });
  } finally {
    session.endSession();
  }
});

router.post("/split/:id", authenticate, authorizeAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { qtyOrdered, status, ...data } = req.body;

    let openPurchase;
    if (id.startsWith("temp_")) {
      openPurchase = new OpenPurchase({
        ...data,
        jobSheetId: data.jobSheetId ? new mongoose.Types.ObjectId(data.jobSheetId) : new mongoose.Types.ObjectId(),
        qtyRequired: data.qtyRequired,
        qtyOrdered: data.qtyOrdered || 0,
        status: data.status || "pending",
        size: data.size || "",
        deliveryDateTime: data.deliveryDateTime,
      });
    } else {
      openPurchase = await OpenPurchase.findById(id).session(session);
      if (!openPurchase) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Open purchase not found" });
      }
    }

    if (qtyOrdered >= openPurchase.qtyRequired) {
      await session.abortTransaction();
      return res.status(400).json({ error: "qtyOrdered must be less than qtyRequired" });
    }

    const closedPurchase = new ClosedPurchase({
      ...openPurchase.toObject(),
      jobSheetId: openPurchase.jobSheetId,
      qtyRequired: qtyOrdered,
      qtyOrdered,
      status: status || "received",
      size: openPurchase.size || "",
      splitId: new mongoose.Types.ObjectId(), // Assign splitId for split
      closedAt: new Date(),
      deliveryDateTime: openPurchase.deliveryDateTime, // Include deliveryDateTime
    });

    await closedPurchase.save({ session });

    openPurchase.qtyRequired -= qtyOrdered;
    openPurchase.qtyOrdered = 0;
    openPurchase.status = "pending";
    await openPurchase.save({ session });

    await session.commitTransaction();
    res.json({ purchase: openPurchase });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error splitting purchase:", error);
    res.status(500).json({ error: "Server error splitting purchase: " + error.message });
  } finally {
    session.endSession();
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