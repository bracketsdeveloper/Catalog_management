const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const DeliveryChallan = require("../models/DeliveryChallan");
const Log = require("../models/Log");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

async function createLog(action, oldValue, newValue, user, ip) {
  try {
    await Log.create({
      action,
      field: "deliveryChallan",
      oldValue,
      newValue,
      performedBy: user?._id || null,
      performedAt: new Date(),
      ipAddress: ip,
    });
  } catch (err) {
    console.error("Error creating delivery challan log:", err);
  }
}

// Create Delivery Challan from Quotation
router.post(
  "/delivery-challans/:quotationId",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const quotation = await Quotation.findById(req.params.quotationId).populate(
        "items.productId",
        "images name productCost category subCategory hsnCode"
      );
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      const { items: bodyItems, poNumber, poDate, otherReferences } = req.body;

      const builtItems = (bodyItems || quotation.items).map((it, idx) => {
        const qty = parseInt(it.quantity, 10) || 1;
        const rate = parseFloat(it.rate) || 0;
        const price = parseFloat(it.productprice) || rate;
        const marginFactor = 1 + (parseFloat(quotation.margin) || 0) / 100;
        const effRate = rate * marginFactor;
        const amount = parseFloat((effRate * qty).toFixed(2));
        const gstRate =
          it.productGST != null
            ? parseFloat(it.productGST)
            : parseFloat(quotation.gst) || 18;
        const gstVal = parseFloat((amount * (gstRate / 100)).toFixed(2));
        const total = parseFloat((amount + gstVal).toFixed(2));

        return {
          slNo: it.slNo || idx + 1,
          productId: it.productId || null,
          product: it.productName || it.product || "",
          hsnCode: it.productId?.hsnCode || "", // Fetch hsnCode directly from Product model
          quantity: qty,
          rate,
          productprice: price,
          amount,
          productGST: gstRate,
          total,
          baseCost: parseFloat(it.baseCost) || 0,
          material: it.material || "",
          weight: it.weight || "",
          brandingTypes: Array.isArray(it.brandingTypes) ? it.brandingTypes : [],
          suggestedBreakdown: it.suggestedBreakdown || {},
          imageIndex: parseInt(it.imageIndex, 10) || 0,
        };
      });

      // Log warning if any item is missing hsnCode
      builtItems.forEach((item, idx) => {
        if (!item.hsnCode && item.productId) {
          console.warn(`HSN code missing for productId ${item.productId} in delivery challan item ${idx + 1}`);
        }
      });

      const totalAmount = builtItems.reduce((sum, x) => sum + x.amount, 0);
      const grandTotal = builtItems.reduce((sum, x) => sum + x.total, 0);

      const deliveryChallan = new DeliveryChallan({
        quotationId: quotation._id,
        quotationNumber: quotation.quotationNumber,
        opportunityNumber: quotation.opportunityNumber,
        catalogName: quotation.catalogName,
        fieldsToDisplay: quotation.fieldsToDisplay,
        priceRange: quotation.priceRange,
        salutation: quotation.salutation,
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        customerCompany: quotation.customerCompany,
        customerAddress: quotation.customerAddress,
        margin: quotation.margin,
        gst: quotation.gst,
        items: builtItems,
        totalAmount,
        grandTotal,
        displayTotals: quotation.displayTotals,
        displayHSNCodes: quotation.displayHSNCodes,
        terms: quotation.terms,
        poNumber: poNumber || "",
        poDate: poDate || null,
        otherReferences: otherReferences || "",
        materialTerms: [
          "Material received in good condition and correct quantity.",
          "No physical damage or shortage noticed at the time of delivery.",
          "Accepted after preliminary inspection and verification with delivery documents.",
        ],
        createdBy: req.user.email,
        dcDate: new Date(),
      });

      const savedChallan = await deliveryChallan.save();
      await createLog("create", null, savedChallan, req.user, req.ip);

      res
        .status(201)
        .json({ message: "Delivery Challan created", deliveryChallan: savedChallan });
    } catch (err) {
      console.error("Error creating delivery challan:", err);
      res
        .status(400)
        .json({ message: err.message || "Server error creating delivery challan" });
    }
  }
);

// Get All Delivery Challans
router.get("/delivery-challans", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const list = await DeliveryChallan.find()
      .populate("items.productId", "images name productCost category subCategory hsnCode")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error("Error fetching delivery challans:", err);
    res.status(500).json({ message: "Server error fetching delivery challans" });
  }
});

// Get Single Delivery Challan
router.get(
  "/delivery-challans/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const challan = await DeliveryChallan.findById(req.params.id).populate(
        "items.productId",
        "images name productCost category subCategory hsnCode"
      );
      if (!challan)
        return res.status(404).json({ message: "Delivery Challan not found" });
      res.json(challan);
    } catch (err) {
      console.error("Error fetching delivery challan:", err);
      res
        .status(400)
        .json({ message: err.message || "Server error fetching delivery challan" });
    }
  }
);

// Update Delivery Challan (now supports editing items + totals)
router.put(
  "/delivery-challans/:id",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const oldChallan = await DeliveryChallan.findById(req.params.id);
      if (!oldChallan) {
        return res.status(404).json({ message: "Delivery Challan not found" });
      }

      const b = req.body || {};
      const updatedData = {
        quotationNumber: b.quotationNumber ?? oldChallan.quotationNumber,
        opportunityNumber: b.opportunityNumber ?? oldChallan.opportunityNumber,
        opportunityOwner: b.opportunityOwner ?? oldChallan.opportunityOwner, // allow editing owner
        catalogName: b.catalogName ?? oldChallan.catalogName,
        fieldsToDisplay: Array.isArray(b.fieldsToDisplay)
          ? b.fieldsToDisplay
          : oldChallan.fieldsToDisplay,
        priceRange: b.priceRange ?? oldChallan.priceRange,
        salutation: b.salutation ?? oldChallan.salutation,
        customerName: b.customerName ?? oldChallan.customerName,
        customerEmail: b.customerEmail ?? oldChallan.customerEmail,
        customerCompany: b.customerCompany ?? oldChallan.customerCompany,
        customerAddress: b.customerAddress ?? oldChallan.customerAddress,
        margin: typeof b.margin === "number" ? b.margin : oldChallan.margin,
        gst: typeof b.gst === "number" ? b.gst : oldChallan.gst,
        displayTotals: b.displayTotals ?? oldChallan.displayTotals,
        displayHSNCodes: b.displayHSNCodes ?? oldChallan.displayHSNCodes,
        terms: Array.isArray(b.terms) ? b.terms : oldChallan.terms,
        poNumber: b.poNumber ?? oldChallan.poNumber,
        poDate: b.poDate ? new Date(b.poDate) : oldChallan.poDate,
        otherReferences: b.otherReferences ?? oldChallan.otherReferences,
        materialTerms: Array.isArray(b.materialTerms)
          ? b.materialTerms
          : oldChallan.materialTerms,
        dcDate: b.dcDate ? new Date(b.dcDate) : oldChallan.dcDate,
      };

      // If items were provided, normalize + (re)compute derived numbers
      let items = oldChallan.items;
      if (Array.isArray(b.items)) {
        items = b.items.map((it, idx) => {
          const qty = Number(it.quantity) || 0;
          const rate = Number(it.rate) || 0;
          const price = it.productprice != null ? Number(it.productprice) : rate;
          const gstRate = Number(it.productGST) || 0;

          // Prefer client-provided amount/total if present, else compute
          const amount =
            it.amount != null
              ? Number(it.amount)
              : Math.round((rate * qty + Number.EPSILON) * 100) / 100;

          const total =
            it.total != null
              ? Number(it.total)
              : Math.round((amount * (1 + gstRate / 100) + Number.EPSILON) * 100) / 100;

          return {
            slNo: Number(it.slNo) || idx + 1,
            productId: it.productId || null,
            product: it.product || "",
            hsnCode: it.hsnCode || "",
            quantity: qty,
            rate,
            productprice: price,
            amount,
            productGST: gstRate,
            total,
            baseCost: Number(it.baseCost) || 0,
            material: it.material || "",
            weight: it.weight || "",
            brandingTypes: Array.isArray(it.brandingTypes) ? it.brandingTypes : [],
            suggestedBreakdown: it.suggestedBreakdown || {
              baseCost: 0,
              marginPct: 0,
              marginAmount: 0,
              logisticsCost: 0,
              brandingCost: 0,
              finalPrice: 0,
            },
            imageIndex: Number(it.imageIndex) || 0,
          };
        });

        // Optional: warn for empty HSN codes
        items.forEach((it) => {
          if (!it.hsnCode) {
            console.warn(`HSN code missing for item slNo=${it.slNo}`);
          }
        });

        updatedData.items = items;
        updatedData.totalAmount = items.reduce((s, x) => s + (Number(x.amount) || 0), 0);
        updatedData.grandTotal = items.reduce((s, x) => s + (Number(x.total) || 0), 0);
        updatedData.totalAmount = Math.round((updatedData.totalAmount + Number.EPSILON) * 100) / 100;
        updatedData.grandTotal = Math.round((updatedData.grandTotal + Number.EPSILON) * 100) / 100;
      }

      const updatedChallan = await DeliveryChallan.findByIdAndUpdate(
        req.params.id,
        updatedData,
        { new: true }
      ).populate("items.productId", "images name productCost category subCategory hsnCode");

      await createLog("update", oldChallan, updatedChallan, req.user, req.ip);

      res.json({ message: "Delivery Challan updated", deliveryChallan: updatedChallan });
    } catch (err) {
      console.error("Error updating delivery challan:", err);
      res
        .status(400)
        .json({ message: err.message || "Server error updating delivery challan" });
    }
  }
);


module.exports = router;