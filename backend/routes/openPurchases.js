const express = require("express");
const router = express.Router();

const dayjs = require("dayjs");
const OpenPurchase = require("../models/OpenPurchase");
const ClosedPurchase = require("../models/ClosedPurchase");
const JobSheet = require("../models/JobSheet");
const PurchaseOrder = require("../models/PurchaseOrder");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const Counter = require("../models/PoCounter");

const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const sendMail = require("../utils/sendMail");
const User = require("../models/User");

/* ---------------- Helpers ---------------- */

async function isNewVendor(vendorId) {
  // If vendor not chosen yet, DON'T treat as "new" -> skip PO rule
  if (!vendorId) return false;
  const count = await PurchaseOrder.countDocuments({ "vendor.vendorId": vendorId });
  return count === 0;
}

function computeTotals(items) {
  let subTotal = 0, gstTotal = 0;
  for (const it of items) {
    const line = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    const gst = line * ((Number(it.gstPercent) || 0) / 100);
    subTotal += line;
    gstTotal += gst;
  }
  return {
    subTotal: Math.round(subTotal),
    gstTotal: Math.round(gstTotal),
    grandTotal: Math.round(subTotal + gstTotal),
  };
}

async function nextPO(sequenceKey = "PO-GC") {
  const year = dayjs().format("YYYY");
  const key = `${sequenceKey}:${year}`;
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqStr = String(doc.seq).padStart(3, "0");
  return `PO-GC-${year}-${seqStr}`;
}

/* ---------------- LIST ----------------
   Initial productPrice comes from Product model when the row's price is
   empty/undefined/NaN/<=0. We attempt multiple Product fields in priority:
   productCost -> purchasePrice -> unitPrice -> price -> MRP (first > 0 wins).
--------------------------------------- */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const sortKey = req.query.sortKey || "deliveryDateTime";
    const sortDirection = req.query.sortDirection === "desc" ? -1 : 1;

    // 1) Load JobSheets (non-draft) + saved OpenPurchases
    const jobSheets = await JobSheet.find({ isDraft: false });
    const dbRecords = await OpenPurchase.find({});

    // 2) Build aggregated view (JobSheet items as temp rows + DB rows)
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

    // Prefer DB rows over temp (same jobSheetId+product+size)
    dbRecords.forEach((db) => {
      const idx = aggregated.findIndex(
        (rec) =>
          rec.jobSheetId?.toString() === db.jobSheetId?.toString() &&
          rec.product === db.product &&
          (rec.size || "") === (db.size || "")
      );
      if (idx !== -1) {
        aggregated[idx] = { ...db.toObject(), isTemporary: false };
      } else {
        aggregated.push({ ...db.toObject(), isTemporary: false });
      }
    });

    // Helper normalizers
    const norm = (s) =>
      String(s || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const escapeRegex = (str = "") =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 3) Build a case-insensitive exact-match set of product names
    const productNames = [
      ...new Set(aggregated.map((r) => norm(r.product)).filter(Boolean)),
    ];

    const nameRegexes = productNames.map(
      (n) => new RegExp(`^${escapeRegex(n)}$`, "i")
    );

    // 4) Query Product model for any matching names; grab multiple price fields
    const prodDocs = await Product.find({ name: { $in: nameRegexes } })
      .select("name productCost purchasePrice unitPrice price MRP")
      .lean();

    const pickPrice = (p) => {
      const candidates = [
        p.productCost,
        p.purchasePrice,
        p.unitPrice,
        p.price,
        p.MRP,
      ];
      for (const c of candidates) {
        const n = Number(c);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return null;
    };

    const priceByName = new Map(
      prodDocs.map((p) => [norm(p.name), pickPrice(p)])
    );

    // 5) Deduplicate by (jobSheetNumber, product, size) and attach productPrice
    const seen = new Set();
    const finalAggregated = aggregated
      .filter((rec) => {
        const key = `${rec.jobSheetNumber}_${rec.product}_${rec.size || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((rec) => {
        const rowNum = Number(rec.productPrice);
        const hasUsableRowPrice = Number.isFinite(rowNum) && rowNum > 0;
        const fallback = priceByName.get(norm(rec.product)) ?? null;
        return {
          ...rec,
          productPrice: hasUsableRowPrice ? rowNum : fallback,
        };
      });

    // 6) Sorting
    finalAggregated.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 1 ? 1 : -1;
      if (bVal == null) return sortDirection === 1 ? -1 : 1;

      if (
        sortKey.includes("Date") ||
        sortKey === "schedulePickUp" ||
        sortKey === "deliveryDateTime"
      ) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
        return aVal < bVal ? -sortDirection : aVal > bVal ? sortDirection : 0;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal < bVal ? -sortDirection : aVal > bVal ? sortDirection : 0;
      }

      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return -sortDirection;
      if (aVal > bVal) return sortDirection;
      return 0;
    });

    res.json(finalAggregated);
  } catch (error) {
    console.error("Error fetching open purchases:", error);
    res.status(500).json({ message: "Server error fetching open purchases" });
  }
});

/* ---------------- GET ONE ---------------- */
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const row = await OpenPurchase.findById(req.params.id)
      .populate("vendorId", "vendorCompany vendorName email phone address")
      .populate("poId")
      .lean();
    if (!row) return res.status(404).json({ message: "Open purchase not found" });
    res.json(row);
  } catch (error) {
    console.error("Error fetching open purchase:", error);
    res.status(500).json({ message: "Server error fetching open purchase" });
  }
});

/* ---------------- CREATE ---------------- */
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    if (data._id && data._id.startsWith("temp_")) delete data._id;

    if (data.productPrice !== undefined && data.productPrice !== null && data.productPrice !== "") {
      data.productPrice = Number(data.productPrice) || 0;
    }

    if (data.jobSheetId) {
      const js = await JobSheet.findById(data.jobSheetId);
      if (!js) return res.status(404).json({ message: "JobSheet not found" });
      if (js.deliveryDate) data.deliveryDateTime = new Date(js.deliveryDate);
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
          $or: products.map((p) => ({ product: p.product, size: p.size })),
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

/* ---------------- UPDATE ----------------
   - Accepts productPrice edits
   - Enforces PO rule for new vendors ONLY if a vendorId is known
----------------------------------------- */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const before = await OpenPurchase.findById(req.params.id);
    if (!before) return res.status(404).json({ message: "Open purchase not found" });

    const updateData = { ...req.body };

    if (updateData.productPrice !== undefined && updateData.productPrice !== null && updateData.productPrice !== "") {
      updateData.productPrice = Number(updateData.productPrice) || 0;
    }

    if (updateData.jobSheetId) {
      const js = await JobSheet.findById(updateData.jobSheetId);
      if (!js) return res.status(404).json({ message: "JobSheet not found" });
      if (js.deliveryDate) updateData.deliveryDateTime = new Date(js.deliveryDate);
    }

    // Only enforce when moving to 'received' AND we have a vendorId
    const nextStatus = updateData.status ?? before.status;
    if (nextStatus === "received") {
      const effectiveVendorId = updateData.vendorId || before.vendorId;
      if (effectiveVendorId) {
        const newVendor = await isNewVendor(effectiveVendorId);
        if (newVendor && !before.poId) {
          return res
            .status(400)
            .json({ message: "PO is mandatory for a new vendor. Generate a PO first." });
        }
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
          $or: products.map((p) => ({ product: p.product, size: p.size })),
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

    // Alert email (preserved)
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
      fields.forEach((field) => {
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

/* ---------------- DELETE ---------------- */
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

/* ---------------- GENERATE PO ---------------- */
router.post("/:id/generate-po", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendorId,
      productCode,
      issueDate,
      requiredDeliveryDate,
      deliveryAddress,
      remarks = "",
      terms,
    } = req.body;

    const row = await OpenPurchase.findById(id);
    if (!row) return res.status(404).json({ message: "Open purchase not found" });

    const vendor = await Vendor.findOne({ _id: vendorId, deleted: false }).lean();
    if (!vendor) return res.status(400).json({ message: "Invalid vendor" });

    // Product lookup by code first, else by name
    let product = null;
    if (productCode) {
      product = await Product.findOne({ productId: productCode }).lean();
      if (!product) {
        return res.status(400).json({ message: "Product code not found in Manage Products" });
      }
    } else {
      product = await Product.findOne({ name: row.product }).lean();
    }

    const qty = row.qtyOrdered || row.qtyRequired || 0;
    const unitPrice = (row.productPrice || row.productPrice === 0)
      ? Number(row.productPrice) || 0
      : Number(product?.productCost ?? product?.MRP ?? 0) || 0;
    const gstPercent = product?.productGST ?? 0;
    const hsnCode = product?.hsnCode ?? row.hsnCode ?? "";

    const item = {
      itemNo: 1,
      productName: row.product,
      productDescription: row.size || "",
      quantity: qty,
      unitPrice,
      total: qty * unitPrice,
      hsnCode,
      gstPercent,
    };

    const { subTotal, gstTotal, grandTotal } = computeTotals([item]);
    const poNumber = await nextPO();

    const po = await PurchaseOrder.create({
      poNumber,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      requiredDeliveryDate: requiredDeliveryDate
        ? new Date(requiredDeliveryDate)
        : row.deliveryDateTime,
      deliveryAddress: deliveryAddress || "Ace Gifting Solutions",
      vendor: {
        vendorId: vendor._id,
        vendorCompany: vendor.vendorCompany || "",
        vendorName: vendor.vendorName || "",
        address: vendor.address || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
      },
      items: [item],
      openPurchaseId: row._id,
      jobSheetId: row.jobSheetId,
      jobSheetNumber: row.jobSheetNumber,
      clientCompanyName: row.clientCompanyName,
      eventName: row.eventName,
      subTotal,
      gstTotal,
      grandTotal,
      remarks,
      terms: (terms && terms.trim()) || undefined,
    });

    await OpenPurchase.updateOne(
      { _id: row._id },
      { $set: { poId: po._id, vendorId: vendor._id } }
    );

    res.status(201).json({ message: "PO created", po });
  } catch (error) {
    console.error("Error generating PO:", error);
    res.status(500).json({ message: "Server error generating PO" });
  }
});

module.exports = router;
