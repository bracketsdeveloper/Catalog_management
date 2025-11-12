// routes/purchaseOrders.js
const express = require("express");
const router = express.Router();
const dayjs = require("dayjs");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");

const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Counter = require("../models/PoCounter");
const PurchaseOrder = require("../models/PurchaseOrder");
const OpenPurchase = require("../models/OpenPurchase");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const sendMail = require("../utils/sendMail");

/** ---- Helpers ---- */
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

async function isNewVendor(vendorId) {
  const count = await PurchaseOrder.countDocuments({ "vendor.vendorId": vendorId });
  return count === 0;
}

function computeTotals(items) {
  let subTotal = 0, gstTotal = 0;
  for (const it of items || []) {
    const line = (it.quantity || 0) * (it.unitPrice || 0);
    const gstAmt = line * ((it.gstPercent || 0) / 100);
    subTotal += line;
    gstTotal += gstAmt;
  }
  const grand = subTotal + gstTotal;
  return {
    subTotal: Math.round(subTotal * 100) / 100,
    gstTotal: Math.round(gstTotal * 100) / 100,
    grandTotal: Math.round(grand)
  };
}

const DEFAULT_TERMS = `
The Vendor warrants that all goods supplied shall strictly conform to specifications, quality, and delivery timelines agreed with Ace Gifting Solutions. Any deviations or delays may result in rejection or penalties as per company policy. Payment shall be made as per agreed terms post receipt and inspection. Transit damages or shortages will be at vendor's risk. Jurisdiction: Bengaluru, India.
`;

/** Small guard */
function ensureValidMongoId(id) {
  if (!id || String(id).startsWith("temp_")) return false;
  return mongoose.Types.ObjectId.isValid(id);
}

/** Shared handler: create PO from an OpenPurchase row */
async function handleCreateFromOpenPurchase(req, res) {
  try {
    const { openId } = req.params;

    // Validate OpenPurchase id
    if (!ensureValidMongoId(openId)) {
      return res.status(400).json({ message: "Invalid OpenPurchase id (temp or malformed)" });
    }

    const {
      vendorId,
      issueDate,
      requiredDeliveryDate,
      deliveryAddress,
      remarks = "",
      terms = "",
      productCode,
    } = req.body || {};

    if (!ensureValidMongoId(vendorId)) {
      return res.status(400).json({ message: "Invalid vendor id" });
    }

    const open = await OpenPurchase.findById(openId);
    if (!open) return res.status(404).json({ message: "OpenPurchase not found" });

    // Resolve product
    let product = null;
    if (productCode) {
      // Try Product.productId first; if not found, fall back to hsnCode
      product =
        (await Product.findOne({ productId: productCode }).lean()) ||
        (await Product.findOne({ hsnCode: productCode }).lean());
      if (!product) {
        return res.status(400).json({ message: "Product code not found in productId/hsnCode" });
      }
    } else {
      // Best-effort by name
      product = await Product.findOne({ name: open.product }).lean();
    }

    const unitPrice = product?.productCost || product?.MRP || 0;
    const gstPercent = product?.productGST || 0;

    // Vendor
    const vendor = await Vendor.findOne({ _id: vendorId, deleted: false }).lean();
    if (!vendor) return res.status(400).json({ message: "Invalid vendor" });

    // Item from OpenPurchase row
    const qty = open.qtyOrdered || open.qtyRequired || 0;
    const item = {
      itemNo: 1,
      productName: open.product,
      productDescription: open.size || open.invoiceRemarks || "",
      quantity: qty,
      unitPrice,
      total: qty * unitPrice,
      hsnCode: product?.hsnCode || "",
      gstPercent,
    };

    const { subTotal, gstTotal, grandTotal } = computeTotals([item]);
    const mustHavePO = grandTotal > 100000 || (await isNewVendor(vendor._id));

    const poNumber = await nextPO();
    const po = await PurchaseOrder.create({
      poNumber,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      requiredDeliveryDate: requiredDeliveryDate
        ? new Date(requiredDeliveryDate)
        : open.deliveryDateTime || null,
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
      openPurchaseId: open._id,
      jobSheetId: open.jobSheetId || null,
      jobSheetNumber: open.jobSheetNumber || "",
      clientCompanyName: open.clientCompanyName || "",
      eventName: open.eventName || "",
      subTotal,
      gstTotal,
      grandTotal,
      remarks,
      terms: terms?.trim() || DEFAULT_TERMS,
      status: "draft",
    });

    // Link back to OpenPurchase
    await OpenPurchase.updateOne({ _id: open._id }, { $set: { poId: po._id, poNumber: po.poNumber } });

    // Important: return { po } so your frontend's res.data.po works
    return res.status(201).json({ ok: true, po, mustHavePO });
  } catch (err) {
    console.error("Create PO error:", err);
    return res.status(500).json({ message: "Server error generating PO" });
  }
}

/** ---- LIST: GET /api/admin/purchase-orders ---- */
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { q = "", sortKey = "createdAt", sortDirection = "desc" } = req.query;
    const text = String(q).trim();

    const filter = text
      ? {
          $or: [
            { poNumber: new RegExp(text, "i") },
            { clientCompanyName: new RegExp(text, "i") },
            { eventName: new RegExp(text, "i") },
            { jobSheetNumber: new RegExp(text, "i") },
            { "vendor.vendorCompany": new RegExp(text, "i") },
            { "items.productName": new RegExp(text, "i") },
          ],
        }
      : {};

    const sort = {};
    if (sortKey) sort[sortKey] = String(sortDirection).toLowerCase() === "asc" ? 1 : -1;

    const rows = await PurchaseOrder.find(filter).sort(sort).lean();
    res.json(rows);
  } catch (err) {
    console.error("List POs error:", err);
    res.status(500).json({ message: "Server error listing POs" });
  }
});

/** ---- CREATE FROM OPEN PURCHASE (canonical): POST /from-open/:openId ---- */
router.post("/from-open/:openId", authenticate, authorizeAdmin, handleCreateFromOpenPurchase);

/** ---- ROUTE ALIAS to match your existing frontend call:
 * POST /api/admin/openPurchases/:openId/generate-po
 * Keep this so older clients keep working.
 */
router.post("/openPurchases/:openId/generate-po", authenticate, authorizeAdmin, handleCreateFromOpenPurchase);

/** ---- EXPORT XLSX ---- */
router.get("/:id/export.xlsx", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).lean();
    if (!po) return res.status(404).json({ message: "PO not found" });

    const header = [[
      "PO Number","Issue Date","Required Delivery Date","Delivery Address",
      "Vendor","Vendor Email","Vendor Phone","Client","Event","Job Sheet #",
      "Subtotal","GST Total","Grand Total"
    ]];
    const headerRow = [[
      po.poNumber,
      dayjs(po.issueDate).format("MMM D, YYYY"),
      po.requiredDeliveryDate ? dayjs(po.requiredDeliveryDate).format("MMM D, YYYY") : "",
      po.deliveryAddress || "",
      `${po.vendor.vendorCompany} (${po.vendor.vendorName})`,
      po.vendor.email || "", po.vendor.phone || "",
      po.clientCompanyName || "", po.eventName || "", po.jobSheetNumber || "",
      po.subTotal || 0, po.gstTotal || 0, po.grandTotal || 0
    ]];

    const itemsHeader = [["Item No","Product Name","Description","Qty","Unit Price","GST %","Line Total"]];
    const itemsRows = (po.items || []).map(it => [
      it.itemNo, it.productName, it.productDescription || "",
      it.quantity, it.unitPrice, it.gstPercent || 0, it.total
    ]);

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([
      ...header, ...headerRow, [],
      ...itemsHeader, ...itemsRows, [],
      ["Remarks"], [po.remarks || ""], [],
      ["Terms"], [po.terms || ""]
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "PO");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${po.poNumber}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error("Export XLSX error:", err);
    res.status(500).json({ message: "Server error exporting XLSX" });
  }
});

/** ---- EXPORT PDF ---- */
router.get("/:id/export.pdf", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).lean();
    if (!po) return res.status(404).json({ message: "PO not found" });

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${po.poNumber}.pdf"`);

    doc.fontSize(18).text("PURCHASE ORDER", { align: "center" }).moveDown(0.5);
    doc.fontSize(12).text(`PO Number: ${po.poNumber}`);
    doc.text(`Issue Date: ${dayjs(po.issueDate).format("MMM D, YYYY")}`);
    doc.text(`Required Delivery Date: ${po.requiredDeliveryDate ? dayjs(po.requiredDeliveryDate).format("MMM D, YYYY") : "-"}`);
    doc.text(`Delivery Address: ${po.deliveryAddress || "-"}`).moveDown(0.5);

    doc.text(`Vendor: ${po.vendor.vendorCompany} (${po.vendor.vendorName})`);
    if (po.vendor.address) doc.text(`Address: ${po.vendor.address}`);
    if (po.vendor.email) doc.text(`Email: ${po.vendor.email}`);
    if (po.vendor.phone) doc.text(`Phone: ${po.vendor.phone}`);
    doc.moveDown(0.5);

    doc.text("Items:", { underline: true }).moveDown(0.3);
    (po.items || []).forEach(it => {
      doc.text(`${it.itemNo}. ${it.productName}`);
      doc.text(`   Desc: ${it.productDescription || "-"}`);
      doc.text(`   Qty: ${it.quantity}  Unit: ₹${Number(it.unitPrice || 0).toFixed(2)}  GST: ${it.gstPercent || 0}%  Line: ₹${Number(it.total || 0).toFixed(2)}`);
      doc.moveDown(0.2);
    });

    doc.moveDown(0.5);
    doc.text(`Subtotal: ₹${Number(po.subTotal || 0).toFixed(2)}`);
    doc.text(`GST: ₹${Number(po.gstTotal || 0).toFixed(2)}`);
    doc.text(`Grand Total: ₹${Number(po.grandTotal || 0).toFixed(2)}`, { underline: true });

    if (po.remarks) { doc.moveDown(0.8).text("Remarks:", { underline: true }); doc.text(po.remarks); }
    if (po.terms) { doc.moveDown(0.8).text("Terms & Conditions:", { underline: true }); doc.text(po.terms); }

    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error("Export PDF error:", err);
    res.status(500).json({ message: "Server error exporting PDF" });
  }
});

/** ---- EMAIL ---- */
router.post("/:id/email", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).lean();
    if (!po) return res.status(404).json({ message: "PO not found" });

    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(chunks);
      const to = req.body.to || po.vendor.email;
      if (!to) return res.status(400).json({ message: "No recipient email" });
      await sendMail({
        to,
        cc: req.body.cc || "",
        bcc: req.body.bcc || "",
        subject: `Purchase Order ${po.poNumber}`,
        html: `<p>Dear ${po.vendor.vendorName || po.vendor.vendorCompany},</p>
               <p>Please find attached Purchase Order <b>${po.poNumber}</b>.</p>
               <p>Regards,<br/>Ace Gifting Solutions</p>`,
        attachments: [{ filename: `${po.poNumber}.pdf`, content: pdfBuffer }],
      });
      res.json({ message: "PO emailed" });
    });

    // Minimal PDF content
    doc.fontSize(18).text("PURCHASE ORDER", { align: "center" }).moveDown(0.5);
    doc.fontSize(12).text(`PO Number: ${po.poNumber}`);
    doc.text(`Issue Date: ${dayjs(po.issueDate).format("MMM D, YYYY")}`);
    doc.text(`Required Delivery Date: ${po.requiredDeliveryDate ? dayjs(po.requiredDeliveryDate).format("MMM D, YYYY") : "-"}`);
    doc.text(`Vendor: ${po.vendor.vendorCompany} (${po.vendor.vendorName})`);
    doc.text(`Grand Total: ₹${Number(po.grandTotal || 0).toFixed(2)}`, { underline: true });
    doc.end();
  } catch (err) {
    console.error("Email PO error:", err);
    res.status(500).json({ message: "Server error emailing PO" });
  }
});

/** ---- GET ONE ---- */
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).lean();
    if (!po) return res.status(404).json({ message: "PO not found" });
    res.json(po);
  } catch (err) {
    console.error("Get PO error:", err);
    res.status(500).json({ message: "Server error fetching PO" });
  }
});

/** ---- UPDATE ---- */
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updates = req.body || {};
    if (Array.isArray(updates.items)) {
      const totals = computeTotals(updates.items);
      Object.assign(updates, totals);
    }
    const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!po) return res.status(404).json({ message: "PO not found" });
    res.json({ message: "PO updated", purchaseOrder: po });
  } catch (err) {
    console.error("Update PO error:", err);
    res.status(500).json({ message: "Server error updating PO" });
  }
});

/** ---- DELETE ---- */
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const del = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: "PO not found" });
    await OpenPurchase.updateMany({ poId: del._id }, { $unset: { poId: 1, poNumber: 1 } });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete PO error:", err);
    res.status(500).json({ message: "Server error deleting PO" });
  }
});

module.exports = router;
