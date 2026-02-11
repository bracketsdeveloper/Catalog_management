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
  if (!vendorId) return false;
  const count = await PurchaseOrder.countDocuments({
    "vendor.vendorId": vendorId,
  });
  return count === 0;
}

function computeTotals(items) {
  let subTotal = 0,
    gstTotal = 0;
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

/**
 * nextPO
 * Format: PO-APP-YYYY-SEQ
 */
async function nextPO(sequenceKey = "PO-APP") {
  const now = dayjs();
  const calendarYear = now.year();
  const monthIndex = now.month();
  const fyYear = monthIndex >= 3 ? calendarYear : calendarYear - 1;

  const key = `${sequenceKey}:${fyYear}`;
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqStr = String(doc.seq).padStart(3, "0");
  return `PO-APP-${fyYear}-${seqStr}`;
}

/** Pick vendor GST from new gstNumbers array or legacy gst field */
function pickVendorGst(vendorDoc) {
  if (!vendorDoc) return "";
  const v = vendorDoc;
  if (Array.isArray(v.gstNumbers) && v.gstNumbers.length) {
    const primary = v.gstNumbers.find((g) => g.isPrimary) || v.gstNumbers[0];
    return (primary.gst || "").trim();
  }
  return (v.gst || "").trim();
}

function norm(s) {
  return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function pickPrice(p) {
  const candidates = [p.productCost, p.purchasePrice, p.unitPrice, p.price, p.MRP];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

// IMPORTANT: use jobSheetId (not jobSheetNumber) to avoid collisions + missing rows
function makeKey(jobSheetId, product, size) {
  return `${String(jobSheetId || "")}__${norm(product)}__${norm(size || "")}`;
}

/* ---------------- LIST ---------------- */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const sortKey = req.query.sortKey || "deliveryDateTime";
    const sortDirection = req.query.sortDirection === "desc" ? -1 : 1;

    // Fetch only what is needed + lean for speed
    const [jobSheets, dbRecords] = await Promise.all([
      JobSheet.find({ isDraft: false })
        .select("createdAt jobSheetNumber clientCompanyName eventName deliveryDate items _id")
        .lean(),
      OpenPurchase.find({})
        .lean(),
    ]);

    // Map existing OpenPurchase by (jobSheetId + product + size)
    const dbMap = new Map();
    for (const db of dbRecords) {
      const key = makeKey(db.jobSheetId, db.product, db.size || "");
      // keep latest doc if duplicates exist
      const existing = dbMap.get(key);
      if (!existing) dbMap.set(key, db);
      else {
        const a = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const b = new Date(db.updatedAt || db.createdAt || 0).getTime();
        if (b >= a) dbMap.set(key, db);
      }
    }

    // Build aggregated rows with O(1) merges (no findIndex loops)
    const aggregated = [];
    const finalSeen = new Set();

    // Collect product names for pricing lookup
    const productNamesRaw = new Set();

    for (const js of jobSheets) {
      const deliveryDate = js.deliveryDate ? new Date(js.deliveryDate) : null;

      const items = Array.isArray(js.items) ? js.items : [];
      for (let index = 0; index < items.length; index++) {
        const item = items[index] || {};
        const product = item.product || "";
        const size = item.size || "";

        const key = makeKey(js._id, product, size);

        // de-dupe at source (prevents accidental duplicates)
        if (finalSeen.has(key)) continue;
        finalSeen.add(key);

        productNamesRaw.add(String(product || "").trim());

        const fromDb = dbMap.get(key);
        if (fromDb) {
          aggregated.push({ ...fromDb, isTemporary: false });
        } else {
          aggregated.push({
            _id: `temp_${js._id}_${index}`,
            jobSheetCreatedDate: js.createdAt,
            jobSheetNumber: js.jobSheetNumber,
            clientCompanyName: js.clientCompanyName,
            eventName: js.eventName,
            product,
            size,
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
            invoiceRemarks: "",
            status: "",
            completionState: "",
            jobSheetId: js._id,
            isTemporary: true,
          });
        }
      }
    }

    // Add any dbRecords that don't have a corresponding jobsheet item row
    // (edge cases: imports/manual entries)
    for (const db of dbRecords) {
      const key = makeKey(db.jobSheetId, db.product, db.size || "");
      if (finalSeen.has(key)) continue;
      finalSeen.add(key);
      productNamesRaw.add(String(db.product || "").trim());
      aggregated.push({ ...db, isTemporary: false });
    }

    // Pricing lookup (fast + case-insensitive via collation)
    const productNames = [...productNamesRaw].filter(Boolean);
    let priceByName = new Map();
    if (productNames.length) {
      const prodDocs = await Product.find({ name: { $in: productNames } })
        .select("name productCost purchasePrice unitPrice price MRP")
        .collation({ locale: "en", strength: 2 })
        .lean();

      priceByName = new Map(prodDocs.map((p) => [norm(p.name), pickPrice(p)]));
    }

    const finalAggregated = aggregated.map((rec) => {
      const rowNum = Number(rec.productPrice);
      const hasUsableRowPrice = Number.isFinite(rowNum) && rowNum > 0;
      const fallback = priceByName.get(norm(rec.product)) ?? null;
      return {
        ...rec,
        productPrice: hasUsableRowPrice ? rowNum : fallback,
      };
    });

    // Sort
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
    if (!row)
      return res.status(404).json({ message: "Open purchase not found" });
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
    if (typeof data.invoiceRemarks === "string" || data.invoiceRemarks === undefined) {
      data.invoiceRemarks = data.invoiceRemarks || "";
    }

    // normalize completionState on create
    if (data.completionState === undefined || data.completionState === null) {
      data.completionState = "";
    } else {
      const v = String(data.completionState).trim();
      data.completionState = v === "Partially" || v === "Fully" ? v : "";
    }

    if (data.jobSheetId) {
      const js = await JobSheet.findById(data.jobSheetId).select("deliveryDate").lean();
      if (!js) return res.status(404).json({ message: "JobSheet not found" });
      if (js.deliveryDate) data.deliveryDateTime = new Date(js.deliveryDate);
    }

    const newPurchase = new OpenPurchase(data);
    await newPurchase.save();

    // If newly created row is already received, propagate to Closed
    if (newPurchase.status === "received") {
      const jobSheetId = newPurchase.jobSheetId;
      const jobSheet = await JobSheet.findById(jobSheetId).select("items").lean();
      if (jobSheet) {
        const products = (jobSheet.items || []).map((item) => ({
          product: item.product,
          size: item.size || "",
        }));

        const openPurchases = await OpenPurchase.find({
          jobSheetId,
          $or: products.map((p) => ({ product: p.product, size: p.size })),
        }).lean();

        if (openPurchases.length && openPurchases.every((p) => p.status === "received")) {
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
              invoiceRemarks: p.invoiceRemarks || "",
              status: p.status,
              jobSheetId: p.jobSheetId,
              createdAt: p.createdAt,
              deliveryDateTime: p.deliveryDateTime,
            };

            const existingClosed = await ClosedPurchase.findOne({
              jobSheetId: p.jobSheetId,
              product: p.product,
              size: p.size || "",
            }).lean();

            if (existingClosed) {
              await ClosedPurchase.updateOne({ _id: existingClosed._id }, { $set: closedData });
            } else {
              await ClosedPurchase.create(closedData);
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

/* ---------------- UPDATE ---------------- */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const before = await OpenPurchase.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: "Open purchase not found" });

    const updateData = { ...req.body };

    if (updateData.productPrice !== undefined && updateData.productPrice !== null && updateData.productPrice !== "") {
      updateData.productPrice = Number(updateData.productPrice) || 0;
    }
    if (updateData.invoiceRemarks === undefined) {
      // do nothing
    } else if (typeof updateData.invoiceRemarks !== "string") {
      updateData.invoiceRemarks = String(updateData.invoiceRemarks || "");
    }

    // normalize completionState on update
    if (updateData.completionState !== undefined) {
      const v = String(updateData.completionState || "").trim();
      updateData.completionState = v === "Partially" || v === "Fully" ? v : "";
    }

    if (updateData.jobSheetId) {
      const js = await JobSheet.findById(updateData.jobSheetId).select("deliveryDate").lean();
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
          return res.status(400).json({
            message: "PO is mandatory for a new vendor. Generate a PO first.",
          });
        }
      }
    }

    const updatedPurchase = await OpenPurchase.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).lean();

    if (!updatedPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }

    // If received, sync to ClosedPurchase (includes invoiceRemarks)
    if (updatedPurchase.status === "received") {
      const jobSheetId = updatedPurchase.jobSheetId;
      const jobSheet = await JobSheet.findById(jobSheetId).select("items").lean();
      if (jobSheet) {
        const products = (jobSheet.items || []).map((item) => ({
          product: item.product,
          size: item.size || "",
        }));

        const openPurchases = await OpenPurchase.find({
          jobSheetId,
          $or: products.map((p) => ({ product: p.product, size: p.size })),
        }).lean();

        if (openPurchases.length && openPurchases.every((p) => p.status === "received")) {
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
              invoiceRemarks: p.invoiceRemarks || "",
              status: p.status,
              jobSheetId: p.jobSheetId,
              createdAt: p.createdAt,
              deliveryDateTime: p.deliveryDateTime,
            };

            const existingClosed = await ClosedPurchase.findOne({
              jobSheetId: p.jobSheetId,
              product: p.product,
              size: p.size || "",
            }).lean();

            if (existingClosed) {
              await ClosedPurchase.updateOne({ _id: existingClosed._id }, { $set: closedData });
            } else {
              await ClosedPurchase.create(closedData);
            }
          }
        }
      }
    }

    // Alert email (unchanged)
    if (updatedPurchase.status === "alert") {
      const purchaseObj = updatedPurchase;
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

      const superAdmins = await User.find({ isSuperAdmin: true }).select("email").lean();
      const emails = superAdmins.map((user) => user.email).filter(Boolean);
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

    const row = await OpenPurchase.findById(id).lean();
    if (!row) return res.status(404).json({ message: "Open purchase not found" });

    const vendor = await Vendor.findOne({ _id: vendorId, deleted: false }).lean();
    if (!vendor) return res.status(400).json({ message: "Invalid vendor" });

    const vendorGst = pickVendorGst(vendor);

    // Product lookup by code first, else by name
    let product = null;
    if (productCode) {
      product = await Product.findOne({ productId: productCode }).lean();
      if (!product) {
        return res.status(400).json({ message: "Product code not found in Manage Products" });
      }
    } else {
      product = await Product.findOne({ name: row.product })
        .collation({ locale: "en", strength: 2 })
        .lean();
    }

    const qty = row.qtyOrdered || row.qtyRequired || 0;
    const unitPrice =
      row.productPrice || row.productPrice === 0
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
      itemRemarks: row.invoiceRemarks || "",
    };

    const { subTotal, gstTotal, grandTotal } = computeTotals([item]);
    const poNumber = await nextPO();

    const po = await PurchaseOrder.create({
      poNumber,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      requiredDeliveryDate: requiredDeliveryDate ? new Date(requiredDeliveryDate) : row.deliveryDateTime,
      deliveryAddress: deliveryAddress || "Ace Gifting Solutions",
      vendor: {
        vendorId: vendor._id,
        vendorCompany: vendor.vendorCompany || "",
        vendorName: vendor.vendorName || "",
        address: vendor.address || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        gstNumber: vendorGst || "",
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
