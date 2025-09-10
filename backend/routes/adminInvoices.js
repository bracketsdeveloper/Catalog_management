const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const Quotation = require("../models/Quotation");
const JobSheet = require("../models/JobSheet");
const CounterForInvoice = require("../models/CounterForInvoice");
const DeliveryChallan = require("../models/DeliveryChallan");
const Opportunity = require("../models/Opportunity"); // NEW
const Log = require("../models/Log");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Helpers
function toNum(n) {
  const x = parseFloat(n);
  return isNaN(x) ? 0 : x;
}

// India FY in IST (Asia/Kolkata): Apr 1 - Mar 31
function getIndianFYRangeStr(date = new Date()) {
  const now = new Date(date);
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const fyStart = month < 3 ? year - 1 : year;
  const fyEnd = fyStart + 1;

  const shortStart = fyStart.toString().slice(-2);
  const shortEnd = fyEnd.toString().slice(-2);

  return `${shortStart}-${shortEnd}`;
}


function pad(num, len) {
  return String(num).padStart(len, "0");
}

// Generate next sequence and build invoice number with format string.
async function generateInvoiceNumber(formatStr) {
  const fy = getIndianFYRangeStr();
  const counterId = `invoice-${fy}`;
  const counter = await CounterForInvoice.findOneAndUpdate(
    { id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = counter.seq;

  const seqTokenMatch = formatStr.match(/\{SEQ(\d+)\}/i);
  let seqLen = 4;
  if (seqTokenMatch) seqLen = parseInt(seqTokenMatch[1], 10);

  let number = formatStr.replace(/\{FY\}/g, fy);
  number = number.replace(/\{SEQ\d+\}/i, pad(seq, seqLen));
  return number;
}

/**
 * POST /api/admin/invoices/from-quotation/:quotationId
 * Body (optional):
 * {
 *   "format": "APP/{FY}/{SEQ4}"
 * }
 */
router.post("/invoices/from-quotation/:quotationId", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { quotationId } = req.params;
    const { format } = req.body;

    const quotation = await Quotation.findById(quotationId)
      .populate("items.productId", "hsnCode name")
      .lean();
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    // Resolve JobSheet ref by quotation number
    let refJobSheet = null;
    if (quotation.quotationNumber) {
      refJobSheet = await JobSheet.findOne({ referenceQuotation: quotation.quotationNumber })
        .sort({ createdAt: -1 })
        .select("jobSheetNumber")
        .lean();
    }

    // Build items from quotation
    const items = (quotation.items || []).map((it, idx) => {
      const slNo = it.slNo || idx + 1;
      const description = it.product || "";
      const hsnCode =
        (it.hsnCode && String(it.hsnCode).trim()) ||
        (it.productId?.hsnCode && String(it.productId.hsnCode).trim()) ||
        "";
      if (!hsnCode) throw new Error(`HSN code missing for item #${slNo}`);

      const quantity = toNum(it.quantity) || 0;
      const unit = "NOS";
      const rate = toNum(it.rate);
      const taxableAmount = toNum(it.amount);
      const gstPercent = toNum(it.productGST ?? quotation.gst ?? 0);
      const halfPct = gstPercent / 2;
      const gstAmountTotal = taxableAmount * (gstPercent / 100);
      const cgstAmount = gstAmountTotal / 2;
      const sgstAmount = gstAmountTotal / 2;
      const totalAmount = toNum(it.total);

      return {
        slNo,
        description,
        hsnCode,
        quantity,
        unit,
        rate,
        taxableAmount,
        cgstAmount: Math.round(cgstAmount * 100) / 100,
        cgstPercent: Math.round(halfPct * 1000) / 1000,
        sgstAmount: Math.round(sgstAmount * 100) / 100,
        sgstPercent: Math.round(halfPct * 1000) / 1000,
        totalAmount,
      };
    });

    const subtotalTaxable = items.reduce((s, x) => s + x.taxableAmount, 0);
    const totalCgst = items.reduce((s, x) => s + x.cgstAmount, 0);
    const totalSgst = items.reduce((s, x) => s + x.sgstAmount, 0);
    const grandTotal = items.reduce((s, x) => s + x.totalAmount, 0);

    const invoiceNumberFormat =
      format && typeof format === "string" && format.trim() ? format.trim() : "APP/{FY}/{SEQ4}";
    const invoiceNumber = await generateInvoiceNumber(invoiceNumberFormat);

    const invoice = await Invoice.create({
      quotationId: quotation._id,
      billTo: quotation.customerAddress || "",
      shipTo: "",
      clientCompanyName: quotation.customerCompany || "",
      clientName: quotation.customerName || "",

      items,

      invoiceDetails: {
        refJobSheetNumber: refJobSheet?.jobSheetNumber || "",
        quotationRefNumber: quotation.quotationNumber || "",
        quotationDate: quotation.createdAt || new Date(),
        clientOrderIdentification: "",
        discount: 0,
        otherReference: "",
        invoiceNumber,
        invoiceNumberFormat,
        date: new Date(),
        placeOfSupply: "",
        dueDate: undefined,
        poDate: undefined,
        poNumber: "",
        eWayBillNumber: "",
      },

      subtotalTaxable: Math.round(subtotalTaxable * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,

      createdBy: req.user?.email || "",
    });

    return res.status(201).json({ message: "Invoice created", invoice });
  } catch (err) {
    console.error("Error creating invoice from quotation:", err);
    return res.status(400).json({ message: err.message || "Failed to create invoice" });
  }
});

// Basic read endpoint
router.get("/invoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id).lean();
    if (!inv) return res.status(404).json({ message: "Invoice not found" });
    res.json(inv);
  } catch (err) {
    console.error("Error fetching invoice:", err);
    res.status(500).json({ message: "Server error fetching invoice" });
  }
});

// LIST with filters & pagination
router.get("/invoices", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      search,
      invoiceNumber,
      quotationRefNumber,
      refJobSheetNumber,
      clientCompanyName,
      clientName,
      placeOfSupply,
      poNumber,
      eWayBillNumber,
      createdBy,
      subtotalMin,
      subtotalMax,
      grandMin,
      grandMax,
      dateFrom,
      dateTo,
      quotationDateFrom,
      quotationDateTo,
      dueDateFrom,
      dueDateTo,
      poDateFrom,
      poDateTo,
      page = 1,
      limit = 100,
    } = req.query;

    const and = [];
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const r = new RegExp(safe, "i");
      and.push({
        $or: [
          { "invoiceDetails.invoiceNumber": r },
          { "invoiceDetails.quotationRefNumber": r },
          { "invoiceDetails.refJobSheetNumber": r },
          { clientCompanyName: r },
          { clientName: r },
          { billTo: r },
          { shipTo: r },
          { "invoiceDetails.placeOfSupply": r },
          { "invoiceDetails.poNumber": r },
          { "invoiceDetails.eWayBillNumber": r },
          { createdBy: r },
        ],
      });
    }

    const mkRegex = (v) => new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (invoiceNumber) and.push({ "invoiceDetails.invoiceNumber": mkRegex(invoiceNumber) });
    if (quotationRefNumber) and.push({ "invoiceDetails.quotationRefNumber": mkRegex(quotationRefNumber) });
    if (refJobSheetNumber) and.push({ "invoiceDetails.refJobSheetNumber": mkRegex(refJobSheetNumber) });
    if (clientCompanyName) and.push({ clientCompanyName: mkRegex(clientCompanyName) });
    if (clientName) and.push({ clientName: mkRegex(clientName) });
    if (placeOfSupply) and.push({ "invoiceDetails.placeOfSupply": mkRegex(placeOfSupply) });
    if (poNumber) and.push({ "invoiceDetails.poNumber": mkRegex(poNumber) });
    if (eWayBillNumber) and.push({ "invoiceDetails.eWayBillNumber": mkRegex(eWayBillNumber) });
    if (createdBy) and.push({ createdBy: mkRegex(createdBy) });

    const num = (x) => (x === undefined ? undefined : Number(x));
    const subMin = num(subtotalMin);
    const subMax = num(subtotalMax);
    if (!isNaN(subMin) || !isNaN(subMax)) {
      and.push({
        subtotalTaxable: {
          ...(isNaN(subMin) ? {} : { $gte: subMin }),
          ...(isNaN(subMax) ? {} : { $lte: subMax }),
        },
      });
    }
    const gMin = num(grandMin);
    const gMax = num(grandMax);
    if (!isNaN(gMin) || !isNaN(gMax)) {
      and.push({
        grandTotal: {
          ...(isNaN(gMin) ? {} : { $gte: gMin }),
          ...(isNaN(gMax) ? {} : { $lte: gMax }),
        },
      });
    }

    const addDateRange = (field, from, to) => {
      if (!from && !to) return;
      const cond = {};
      if (from) {
        const f = new Date(from);
        if (isNaN(f.getTime())) throw new Error(`Invalid date: ${from}`);
        cond.$gte = f;
      }
      if (to) {
        const t = new Date(to);
        if (isNaN(t.getTime())) throw new Error(`Invalid date: ${to}`);
        cond.$lte = t;
      }
      and.push({ [field]: cond });
    };

    addDateRange("invoiceDetails.date", dateFrom, dateTo);
    addDateRange("invoiceDetails.quotationDate", quotationDateFrom, quotationDateTo);
    addDateRange("invoiceDetails.dueDate", dueDateFrom, dueDateTo);
    addDateRange("invoiceDetails.poDate", poDateFrom, poDateTo);

    const query = and.length ? { $and: and } : {};
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(1000, Math.max(1, Number(limit) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [rows, total] = await Promise.all([
      Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Invoice.countDocuments(query),
    ]);

    res.json({
      invoices: rows,
      totalInvoices: total,
      currentPage: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    console.error("Error listing invoices:", err);
    res.status(500).json({ message: "Server error listing invoices" });
  }
});

// Update invoice
router.put("/invoices/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};

    if ("billTo" in body) update.billTo = body.billTo;
    if ("shipTo" in body) update.shipTo = body.shipTo;
    if ("clientCompanyName" in body) update.clientCompanyName = body.clientCompanyName;

    if (body.invoiceDetails) {
      const ed = body.invoiceDetails;

      if ("refJobSheetNumber" in ed) {
        update["invoiceDetails.refJobSheetNumber"] =
          ed.refJobSheetNumber && String(ed.refJobSheetNumber).trim() !== "" ? ed.refJobSheetNumber : null;
      }
      if ("clientOrderIdentification" in ed) {
        update["invoiceDetails.clientOrderIdentification"] = ed.clientOrderIdentification;
      }
      if ("discount" in ed) {
        update["invoiceDetails.discount"] = ed.discount === "" || ed.discount === null ? null : Number(ed.discount);
      }
      if ("otherRef" in ed) update["invoiceDetails.otherRef"] = ed.otherRef;
      if ("placeOfSupply" in ed) update["invoiceDetails.placeOfSupply"] = ed.placeOfSupply;
      if ("dueDate" in ed) update["invoiceDetails.dueDate"] = ed.dueDate ? new Date(ed.dueDate) : null;
      if ("poDate" in ed) update["invoiceDetails.poDate"] = ed.poDate ? new Date(ed.poDate) : null;
      if ("poNumber" in ed) update["invoiceDetails.poNumber"] = ed.poNumber;
      if ("eWayBillNumber" in ed) update["invoiceDetails.eWayBillNumber"] = ed.eWayBillNumber;
      if ("invoiceNumber" in ed) update["invoiceDetails.invoiceNumber"] = ed.invoiceNumber;
    }

    const inv = await Invoice.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    res.json({ message: "Invoice updated", invoice: inv });
  } catch (e) {
    console.error("PUT invoice error:", e);
    res.status(500).json({ message: "Server error updating invoice" });
  }
});

/**
 * Generate Delivery Challan from an Invoice.
 * - opportunityNumber pulled from linked Quotation
 * - opportunityOwner resolved via Opportunity by opportunityCode
 * - otherReferences <- invoice.invoiceDetails.refJobSheetNumber
 * - DC number saved back onto Invoice
 */
router.post(
  "/invoices/:id/generate-delivery-challan",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const inv = await Invoice.findById(id).lean();
      if (!inv) return res.status(404).json({ message: "Invoice not found" });

      // Build DC items from invoice items
      const builtItems = (inv.items || []).map((it, idx) => {
        const slNo = it.slNo || idx + 1;
        const description = it.description || "";
        const quantity = toNum(it.quantity) || 0;
        const rate = toNum(it.rate) || 0;
        const taxableAmount = toNum(it.taxableAmount) || 0;
        const totalAmount = toNum(it.totalAmount) || 0;

        const cgstPct = toNum(it.cgstPercent) || 0;
        const sgstPct = toNum(it.sgstPercent) || 0;
        let gstPct = cgstPct + sgstPct;
        if (!gstPct && taxableAmount > 0) {
          const gstAmt = toNum(it.cgstAmount) + toNum(it.sgstAmount);
          gstPct = (gstAmt / taxableAmount) * 100;
        }

        return {
          slNo,
          productId: null,
          product: description,
          hsnCode: it.hsnCode || "",
          quantity,
          rate,
          productprice: rate,
          amount: Number(taxableAmount.toFixed(2)),
          productGST: Number(gstPct.toFixed(2)),
          total: Number(totalAmount.toFixed(2)),
          baseCost: 0,
          material: "",
          weight: "",
          brandingTypes: [],
          suggestedBreakdown: {
            baseCost: 0,
            marginPct: 0,
            marginAmount: 0,
            logisticsCost: 0,
            brandingCost: 0,
            finalPrice: 0,
          },
          imageIndex: 0,
        };
      });

      const totalAmount = builtItems.reduce((s, x) => s + (x.amount || 0), 0);
      const grandTotal = builtItems.reduce((s, x) => s + (x.total || 0), 0);

      // Resolve opportunityNumber from quotation, and owner via Opportunity
      let opportunityNumber = "";
      let opportunityOwner = "";
      try {
        if (inv.quotationId) {
          const q = await Quotation.findById(inv.quotationId).lean();
          if (q) {
            opportunityNumber = q.opportunityNumber || "";
            if (opportunityNumber) {
              const oppDoc = await Opportunity.findOne({ opportunityCode: opportunityNumber }).lean();
              opportunityOwner = oppDoc?.opportunityOwner || "";
            }
          }
        }
      } catch (e) {
        // still proceed; leave fields blank if not resolvable
      }

      // Create DC
      const deliveryChallan = new DeliveryChallan({
        quotationId: inv.quotationId || null,
        quotationNumber: inv.invoiceDetails?.quotationRefNumber || "",

        opportunityNumber,          // NEW
        opportunityOwner,           // NEW

        catalogName: "",
        fieldsToDisplay: [],
        priceRange: { from: 0, to: 0 },
        salutation: "Mr.",
        customerName: inv.clientName || "",
        customerEmail: "",
        customerCompany: inv.clientCompanyName || "",
        customerAddress: inv.billTo || "",
        margin: 0,
        gst: 0,
        items: builtItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        displayTotals: true,
        displayHSNCodes: true,
        terms: [],
        otherReferences: inv.invoiceDetails?.refJobSheetNumber || "", // per requirement
        poNumber: inv.invoiceDetails?.poNumber || "",
        poDate: inv.invoiceDetails?.poDate || null,
        materialTerms: [
          "Material received in good condition and correct quantity.",
          "No physical damage or shortage noticed at the time of delivery.",
          "Accepted after preliminary inspection and verification with delivery documents.",
        ],
        createdBy: req.user?.email || "",
        dcDate: new Date(),
      });

      const savedChallan = await deliveryChallan.save();

      // Log
      try {
        await Log.create({
          action: "create",
          field: "deliveryChallan",
          oldValue: null,
          newValue: savedChallan,
          performedBy: req.user?._id || null,
          performedAt: new Date(),
          ipAddress: req.ip,
        });
      } catch (e) {}

      // Update invoice with DC linkage
      const updatedInvoice = await Invoice.findByIdAndUpdate(
        id,
        {
          $set: {
            deliveryChallanId: savedChallan._id,
            deliveryChallanNumber: savedChallan.dcNumber || "",
          },
        },
        { new: true }
      ).lean();

      return res.status(201).json({
        message: "Delivery Challan created from invoice",
        deliveryChallan: savedChallan,
        invoice: updatedInvoice,
      });
    } catch (err) {
      console.error("Error creating DC from invoice:", err);
      res.status(400).json({ message: err.message || "Server error creating delivery challan from invoice" });
    }
  }
);

module.exports = router;
