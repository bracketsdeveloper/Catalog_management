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

// Update Delivery Challan
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

      const updatedData = {
        quotationNumber: req.body.quotationNumber || oldChallan.quotationNumber,
        opportunityNumber: req.body.opportunityNumber || oldChallan.opportunityNumber,
        catalogName: req.body.catalogName || oldChallan.catalogName,
        fieldsToDisplay: req.body.fieldsToDisplay || oldChallan.fieldsToDisplay,
        priceRange: req.body.priceRange || oldChallan.priceRange,
        salutation: req.body.salutation || oldChallan.salutation,
        customerName: req.body.customerName || oldChallan.customerName,
        customerEmail: req.body.customerEmail || oldChallan.customerEmail,
        customerCompany: req.body.customerCompany || oldChallan.customerCompany,
        customerAddress: req.body.customerAddress || oldChallan.customerAddress,
        margin: req.body.margin || oldChallan.margin,
        gst: req.body.gst || oldChallan.gst,
        displayTotals: req.body.displayTotals ?? oldChallan.displayTotals,
        displayHSNCodes: req.body.displayHSNCodes ?? oldChallan.displayHSNCodes,
        terms: req.body.terms || oldChallan.terms,
        poNumber: req.body.poNumber || oldChallan.poNumber,
        poDate: req.body.poDate || oldChallan.poDate,
        otherReferences: req.body.otherReferences || oldChallan.otherReferences,
        materialTerms: req.body.materialTerms || oldChallan.materialTerms,
        dcDate: req.body.dcDate || oldChallan.dcDate,
      };

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