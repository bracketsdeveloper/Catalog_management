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
  const count = await PurchaseOrder.countDocuments({ "vendor.vendorId": vendorId });
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

function asInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function normStr(s) {
  return String(s || "").trim();
}

function buildQueryFromParams(qp = {}) {
  const q = {};

  // status filter (supports __empty__)
  if (qp.status) {
    if (qp.status === "__empty__") q.status = { $in: [null, ""] };
    else q.status = String(qp.status);
  }

  // completionState filter
  if (qp.completionState) q.completionState = String(qp.completionState);

  // PO status filter (generated / not)
  if (qp.__poStatus) {
    const v = String(qp.__poStatus);
    if (v === "generated") q.poId = { $ne: null };
    if (v === "not") q.poId = { $in: [null] };
  }

  // optional: hide fully-received jobsheets (default true for compatibility with your current frontend)
  const hideReceived = qp.hideReceived === undefined ? "1" : String(qp.hideReceived);
  // applied later (needs aggregation of jobSheetNumber statuses), so we leave a flag for caller
  const _hideReceived = hideReceived === "1" || hideReceived.toLowerCase() === "true";

  // global search across common fields
  const search = normStr(qp.search);
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [
      { jobSheetNumber: re },
      { clientCompanyName: re },
      { eventName: re },
      { product: re },
      { size: re },
      { sourcingFrom: re },
      { vendorContactNumber: re },
      { remarks: re },
      { invoiceRemarks: re },
    ];
  }

  // optional numeric range filters (if you want to push the advanced filters server-side)
  if (qp.jobSheetNumberFrom) q.jobSheetNumber = { ...(q.jobSheetNumber || {}), $gte: String(qp.jobSheetNumberFrom) };
  if (qp.jobSheetNumberTo) q.jobSheetNumber = { ...(q.jobSheetNumber || {}), $lte: String(qp.jobSheetNumberTo) };

  // optional date ranges
  const dateFields = [
    ["jobSheetCreatedDateFrom", "jobSheetCreatedDateTo", "jobSheetCreatedDate"],
    ["deliveryDateFrom", "deliveryDateTo", "deliveryDateTime"],
    ["orderConfirmedFrom", "orderConfirmedTo", "orderConfirmedDate"],
    ["expectedReceiveFrom", "expectedReceiveTo", "expectedReceiveDate"],
    ["schedulePickUpFrom", "schedulePickUpTo", "schedulePickUp"],
  ];
  for (const [fromKey, toKey, field] of dateFields) {
    const from = toDateOrNull(qp[fromKey]);
    const to = toDateOrNull(qp[toKey]);
    if (from || to) {
      q[field] = {};
      if (from) q[field].$gte = from;
      if (to) {
        // include the full day if date-only was sent
        const end = new Date(to);
        if (String(qp[toKey]).length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        q[field].$lte = end;
      }
    }
  }

  return { mongoQuery: q, hideReceived: _hideReceived };
}

/* ---------------- Materialization (BEST FIX) ---------------- */
/**
 * Upsert OpenPurchase rows for every item in a JobSheet.
 * This removes the need to build "temporary" rows at read time.
 */
async function syncOpenPurchasesFromJobSheet(jobSheet) {
  if (!jobSheet || jobSheet.isDraft) return { upserts: 0 };

  const deliveryDateTime = jobSheet.deliveryDate ? new Date(jobSheet.deliveryDate) : null;

  const items = Array.isArray(jobSheet.items) ? jobSheet.items : [];
  if (items.length === 0) return { upserts: 0 };

  const ops = items.map((item) => {
    const product = item.product;
    const size = item.size || "";

    // Keep behavior consistent with your old "temp rows"
    const baseInsert = {
      jobSheetCreatedDate: jobSheet.createdAt,
      jobSheetNumber: jobSheet.jobSheetNumber,
      clientCompanyName: jobSheet.clientCompanyName,
      eventName: jobSheet.eventName,
      product,
      size,
      sourcedBy: item.sourcedBy || "",
      sourcingFrom: item.sourcingFrom || "",
      qtyRequired: item.quantity,
      qtyOrdered: 0,
      deliveryDateTime,
      vendorContactNumber: "",
      orderConfirmedDate: null,
      expectedReceiveDate: null,
      schedulePickUp: null,
      followUp: [],
      remarks: "",
      invoiceRemarks: "",
      status: "",
      completionState: "",
      jobSheetId: jobSheet._id,
    };

    const baseUpdate = {
      qtyRequired: item.quantity,
      sourcedBy: item.sourcedBy || "",
      sourcingFrom: item.sourcingFrom || "",
      deliveryDateTime,
      clientCompanyName: jobSheet.clientCompanyName,
      eventName: jobSheet.eventName,
      jobSheetNumber: jobSheet.jobSheetNumber,
    };

    return {
      updateOne: {
        filter: { jobSheetId: jobSheet._id, product, size },
        update: {
          $setOnInsert: baseInsert,
          $set: baseUpdate,
        },
        upsert: true,
      },
    };
  });

  const result = await OpenPurchase.bulkWrite(ops, { ordered: false });
  const upserts =
    (result && (result.upsertedCount || (result.getUpsertedIds && result.getUpsertedIds().length))) || 0;

  return { upserts };
}

/**
 * Backfill all job sheets -> open purchases in batches.
 */
async function syncAllOpenPurchases({ batchSize = 200 } = {}) {
  let processed = 0;
  let upserts = 0;

  const cursor = JobSheet.find({ isDraft: false })
    .select("_id jobSheetNumber clientCompanyName eventName deliveryDate createdAt items")
    .lean()
    .cursor();

  let batch = [];
  for await (const js of cursor) {
    batch.push(js);
    if (batch.length >= batchSize) {
      for (const one of batch) {
        const r = await syncOpenPurchasesFromJobSheet(one);
        upserts += r.upserts || 0;
        processed += 1;
      }
      batch = [];
    }
  }
  for (const one of batch) {
    const r = await syncOpenPurchasesFromJobSheet(one);
    upserts += r.upserts || 0;
    processed += 1;
  }

  return { processed, upserts };
}

/* ---------------- SYNC ENDPOINTS ---------------- */

// Backfill / repair (run once, or whenever you suspect missing rows)
router.post("/sync-all", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const batchSize = asInt(req.body?.batchSize, 200);
    const result = await syncAllOpenPurchases({ batchSize });
    res.json({ message: "Sync complete", ...result });
  } catch (error) {
    console.error("Error syncing open purchases:", error);
    res.status(500).json({ message: "Server error syncing open purchases" });
  }
});

// Sync a single jobSheet -> open purchases (useful after edits)
router.post("/sync-job/:jobSheetId", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetId } = req.params;
    const js = await JobSheet.findById(jobSheetId)
      .select("_id jobSheetNumber clientCompanyName eventName deliveryDate createdAt items isDraft")
      .lean();

    if (!js) return res.status(404).json({ message: "JobSheet not found" });
    const result = await syncOpenPurchasesFromJobSheet(js);
    res.json({ message: "JobSheet sync complete", ...result });
  } catch (error) {
    console.error("Error syncing job sheet open purchases:", error);
    res.status(500).json({ message: "Server error syncing job sheet open purchases" });
  }
});

/* ---------------- LIST (FAST) ----------------
 * This endpoint is now fast because it reads ONLY from OpenPurchase.
 * IMPORTANT: To ensure all rows exist, run POST /sync-all once after deploy,
 * and call /sync-job/:jobSheetId from your JobSheet update flow if needed.
 */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const sortKey = req.query.sortKey || "deliveryDateTime";
    const sortDirection = req.query.sortDirection === "desc" ? -1 : 1;

    // pagination (optional). if not provided, keeps old behavior (returns array).
    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;

    const page = pageRaw ? Math.max(1, asInt(pageRaw, 1)) : null;
    const limit = limitRaw ? Math.max(1, Math.min(1000, asInt(limitRaw, 200))) : null;

    const { mongoQuery, hideReceived } = buildQueryFromParams(req.query);

    // only pull what you need
    const projection = req.query.fields
      ? String(req.query.fields)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ")
      : "";

    // Query base
    let baseQuery = OpenPurchase.find(mongoQuery);
    if (projection) baseQuery = baseQuery.select(projection);

    // sort (mongo)
    baseQuery = baseQuery.sort({ [sortKey]: sortDirection });

    // paginate if requested
    if (page && limit) {
      baseQuery = baseQuery.skip((page - 1) * limit).limit(limit);
    }

    let rows = await baseQuery.lean();

    // Optional: hide jobsheets where all items are received (your old UI behavior)
    // This check is now done on the current result set (fast for paginated),
    // or on full set if you didn't paginate (still much cheaper than old jobsheet+merge).
    if (hideReceived && rows.length) {
      const byJS = new Map();
      for (const r of rows) {
        const key = r.jobSheetNumber || "";
        if (!byJS.has(key)) byJS.set(key, { allReceived: true, items: 0 });
        const s = byJS.get(key);
        s.items += 1;
        if (r.status !== "received") s.allReceived = false;
      }
      rows = rows.filter((r) => !(byJS.get(r.jobSheetNumber || "")?.allReceived));
    }

    // Optional lightweight productPrice fallback (ONLY for returned rows)
    // (avoids the previous expensive regex $in across ALL records)
    const withProductFallback = req.query.withProductFallback === undefined ? "1" : String(req.query.withProductFallback);
    if ((withProductFallback === "1" || withProductFallback.toLowerCase() === "true") && rows.length) {
      const need = rows.filter((r) => !(Number.isFinite(Number(r.productPrice)) && Number(r.productPrice) > 0));
      if (need.length) {
        const names = [...new Set(need.map((r) => normStr(r.product)).filter(Boolean))];
        if (names.length) {
          const prodDocs = await Product.find({ name: { $in: names } })
            .select("name productCost purchasePrice unitPrice price MRP")
            .lean()
            .collation({ locale: "en", strength: 2 });

          const pickPrice = (p) => {
            const candidates = [p.productCost, p.purchasePrice, p.unitPrice, p.price, p.MRP];
            for (const c of candidates) {
              const n = Number(c);
              if (Number.isFinite(n) && n > 0) return n;
            }
            return null;
          };

          const priceByName = new Map(prodDocs.map((p) => [String(p.name).toLowerCase(), pickPrice(p)]));
          rows = rows.map((r) => {
            const rowNum = Number(r.productPrice);
            const hasUsableRowPrice = Number.isFinite(rowNum) && rowNum > 0;
            if (hasUsableRowPrice) return r;
            const fallback = priceByName.get(String(r.product || "").toLowerCase()) ?? null;
            return { ...r, productPrice: fallback };
          });
        }
      }
    }

    // Response shape:
    // - If client requested pagination -> return { items, total, page, limit }
    // - Else -> return array (backward compatible with your current frontend)
    if (page && limit) {
      const total = await OpenPurchase.countDocuments(mongoQuery);
      return res.json({ items: rows, total, page, limit });
    }

    return res.json(rows);
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
    if (data._id && String(data._id).startsWith("temp_")) delete data._id;

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
      const js = await JobSheet.findById(data.jobSheetId);
      if (!js) return res.status(404).json({ message: "JobSheet not found" });
      if (js.deliveryDate) data.deliveryDateTime = new Date(js.deliveryDate);
    }

    const newPurchase = new OpenPurchase(data);
    await newPurchase.save();

    // If newly created row is already received, propagate to Closed
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
            });
            if (existingClosed) {
              await ClosedPurchase.updateOne({ _id: existingClosed._id }, { $set: closedData });
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

/* ---------------- UPDATE ---------------- */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const before = await OpenPurchase.findById(req.params.id);
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
          return res.status(400).json({
            message: "PO is mandatory for a new vendor. Generate a PO first.",
          });
        }
      }
    }

    const updatedPurchase = await OpenPurchase.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }

    // If received, sync to ClosedPurchase (includes invoiceRemarks)
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
            });
            if (existingClosed) {
              await ClosedPurchase.updateOne({ _id: existingClosed._id }, { $set: closedData });
            } else {
              const newClosed = new ClosedPurchase(closedData);
              await newClosed.save();
            }
          }
        }
      }
    }

    // Alert email (unchanged)
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

    res.json({
      message: "Open purchase updated",
      purchase: updatedPurchase,
    });
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

    const vendorGst = pickVendorGst(vendor);

    // Product lookup by code first, else by name
    let product = null;
    if (productCode) {
      product = await Product.findOne({ productId: productCode }).lean();
      if (!product) {
        return res.status(400).json({ message: "Product code not found in Manage Products" });
      }
    } else {
      product = await Product.findOne({ name: row.product }).lean().collation({ locale: "en", strength: 2 });
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
