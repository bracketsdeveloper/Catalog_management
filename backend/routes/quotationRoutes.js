const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const request = require("sync-request");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const Quotation = require("../models/Quotation");
const Log = require("../models/Log");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const mongoose = require("mongoose");

async function createLog(action, oldValue, newValue, user, ip) {
  try {
    await Log.create({
      action,
      field: "quotation",
      oldValue,
      newValue,
      performedBy: user?._id || null,
      performedAt: new Date(),
      ipAddress: ip,
    });
  } catch (err) {
    console.error("Error creating quotation log:", err);
  }
}

router.post("/quotations", authenticate, authorizeAdmin, async (req, res) => {
  try {
    // console.log("Creating quotation with payload:", req.body);
    const {
      opportunityNumber,
      catalogName,
      fieldsToDisplay,
      priceRange,
      salutation,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      gst,
      items,
      terms,
      displayTotals,
      displayHSNCodes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    const defaultTerms = [
      {
        heading: "Delivery",
        content:
          "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost",
      },
      { heading: "Branding", content: "As mentioned above" },
      { heading: "Payment Terms", content: "Within 30 days upon delivery" },
      {
        heading: "Quote Validity",
        content: "The quote is valid only for 6 days from the date of quotation",
      },
    ];
    const quotationTerms = Array.isArray(terms) && terms.length > 0 ? terms : defaultTerms;

    const builtItems = items.map((it, idx) => {
      const qty = parseInt(it.quantity, 10) || 1;
      const rate = parseFloat(it.rate) || 0;
      const price = parseFloat(it.productprice) || rate;
      const marginFactor = 1 + (parseFloat(margin) || 0) / 100;
      const effRate = rate * marginFactor;
      const amount = parseFloat((effRate * qty).toFixed(2));
      const gstRate = it.productGST != null ? parseFloat(it.productGST) : parseFloat(gst) || 18;
      const gstVal = parseFloat((amount * (gstRate / 100)).toFixed(2));
      const total = parseFloat((amount + gstVal).toFixed(2));

      return {
        slNo: it.slNo || idx + 1,
        productId: it.productId || null,
        product: it.productName || it.product || "",
        hsnCode: it.hsnCode || "",
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

    // console.log("Built items:", builtItems);

    const totalAmount = builtItems.reduce((sum, x) => sum + x.amount, 0);
    const grandTotal = builtItems.reduce((sum, x) => sum + x.total, 0);

    const quotation = new Quotation({
      opportunityNumber,
      catalogName,
      fieldsToDisplay,
      priceRange,
      salutation,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      gst,
      items: builtItems,
      totalAmount,
      grandTotal,
      displayTotals: !!displayTotals,
      displayHSNCodes: !!displayHSNCodes,
      terms: quotationTerms,
      createdBy: req.user.email,
    });

    const savedQuotation = await quotation.save();
    await createLog("create", null, savedQuotation, req.user, req.ip);

    res.status(201).json({ message: "Quotation created", quotation: savedQuotation });
  } catch (err) {
    console.error("Error creating quotation:", err);
    res.status(400).json({ message: err.message || "Server error creating quotation" });
  }
});

router.get("/quotations", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const list = await Quotation.find()
      .populate("items.productId", "images name productCost category subCategory hsnCode")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error("Error fetching quotations:", err);
    res.status(500).json({ message: "Server error fetching quotations" });
  }
});

router.get("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id)
      .populate("items.productId", "images name productCost category subCategory hsnCode");
    if (!quote) return res.status(404).json({ message: "Quotation not found" });
    res.json(quote);
  } catch (err) {
    console.error("Error fetching quotation:", err);
    res.status(400).json({ message: err.message || "Server error fetching quotation" });
  }
});

router.put("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const existing = await Quotation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Quotation not found" });

    const {
      opportunityNumber,
      catalogName,
      fieldsToDisplay,
      priceRange,
      salutation,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      gst,
      items,
      terms,
      displayTotals,
      displayHSNCodes,
    } = req.body;

    const builtItems = Array.isArray(items) && items.length
      ? items.map((it, idx) => {
          const qty = parseInt(it.quantity, 10) || 1;
          const rate = parseFloat(it.rate) || 0;
          const price = parseFloat(it.productprice) || rate;
          const marginFactor = 1 + (parseFloat(margin) || 0) / 100;
          const effRate = rate * marginFactor;
          const amount = parseFloat((effRate * qty).toFixed(2));
          const gstRate = it.productGST != null ? parseFloat(it.productGST) : parseFloat(gst) || 18;
          const gstVal = parseFloat((amount * (gstRate / 100)).toFixed(2));
          const total = parseFloat((amount + gstVal).toFixed(2));

          return {
            slNo: it.slNo || idx + 1,
            productId: it.productId || null,
            product: it.productName || it.product || "",
            hsnCode: it.hsnCode || "",
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
        })
      : existing.items;

    // console.log("Built items:", builtItems);

    const totalAmount = builtItems.reduce((sum, x) => sum + (x.amount || 0), 0);
    const grandTotal = builtItems.reduce((sum, x) => sum + (x.total || 0), 0);

    const updateData = {
      opportunityNumber: opportunityNumber ?? existing.opportunityNumber,
      catalogName: catalogName ?? existing.catalogName,
      fieldsToDisplay: fieldsToDisplay ?? existing.fieldsToDisplay,
      priceRange: priceRange ?? existing.priceRange,
      salutation: salutation ?? existing.salutation,
      customerName: customerName ?? existing.customerName,
      customerEmail: customerEmail ?? existing.customerEmail,
      customerCompany: customerCompany ?? existing.customerCompany,
      customerAddress: customerAddress ?? existing.customerAddress,
      margin: margin ?? existing.margin,
      gst: gst ?? existing.gst,
      items: builtItems,
      totalAmount,
      grandTotal,
      displayTotals: displayTotals ?? existing.displayTotals,
      displayHSNCodes: displayHSNCodes ?? existing.displayHSNCodes,
      terms: Array.isArray(terms) && terms.length > 0 ? terms : existing.terms,
    };

    const updated = await Quotation.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("items.productId", "images name productCost category subCategory hsnCode");

    await createLog("update", existing, updated, req.user, req.ip);
    res.json({ message: "Quotation updated", quotation: updated.toObject() });
  } catch (err) {
    console.error("Error updating quotation:", err);
    res.status(400).json({ message: err.message || "Server error updating quotation" });
  }
});

router.delete("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const toDelete = await Quotation.findById(req.params.id);
    if (!toDelete) return res.status(404).json({ message: "Quotation not found" });
    await Quotation.findByIdAndDelete(req.params.id);
    await createLog("delete", toDelete, null, req.user, req.ip);
    res.json({ message: "Quotation deleted" });
  } catch (err) {
    console.error("Error deleting quotation:", err);
    res.status(500).json({ message: "Server error deleting quotation" });
  }
});

router.get("/quotations/:id/export-word", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("items.productId", "images name productCost category subCategory hsnCode")
      .exec();
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    const templatePath = path.join(__dirname, "..", "templates", "template.docx");
    const content = fs.readFileSync(templatePath, "binary");

    const imageModule = new ImageModule({
      centered: false,
      getImage(value) {
        try {
          const imageUrl = value || "https://via.placeholder.com/150";
          const response = request("GET", imageUrl);
          if (response.statusCode !== 200) throw new Error("Image not accessible");
          return response.getBody();
        } catch (e) {
          console.warn("Image fetch failed:", e.message);
          return fs.readFileSync(
            path.join(__dirname, "..", "templates", "placeholder.png")
          );
        }
      },
      getSize() {
        return [150, 150];
      },
    });

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule],
    });

    const itemsData = quotation.items.map((item, index) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const marginFactor = 1 + (parseFloat(quotation.margin) || 0) / 100;
      const effRate = rate * marginFactor;
      const amount = effRate * quantity;
      const total = amount + amount * ((item.productGST || quotation.gst) / 100);
      const image = item.productId?.images?.[item.imageIndex || 0] || "https://via.placeholder.com/150";

      return {
        slNo: item.slNo?.toString() || (index + 1).toString(),
        image,
        product: item.product || "",
        hsnCode: item.hsnCode || item.productId?.hsnCode || "N/A",
        quantity: quantity.toString(),
        rate: effRate.toFixed(2),
        amount: amount.toFixed(2),
        total: total.toFixed(2),
        material: item.material || "",
        weight: item.weight || "",
        brandingTypes: item.brandingTypes || [],
      };
    });

    const totalAmount = itemsData.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const grandTotal = itemsData.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);

    const docData = {
      date: new Date(quotation.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      quotationNumber: quotation.quotationNumber || "NoNumber",
      opportunityNumber: quotation.opportunityNumber || "",
      salutation: quotation.salutation || "",
      customerName: quotation.customerName,
      companyName: quotation.customerCompany,
      state: quotation.customerAddress,
      catalogName: quotation.catalogName,
      items: itemsData,
      terms: quotation.terms,
      grandTotalAmount: totalAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      displayHSNCodes: quotation.displayHSNCodes,
      fieldsToDisplay: quotation.fieldsToDisplay,
    };

    doc.render(docData);

    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    const filename = `Quotation-${quotation.quotationNumber || "NoNumber"}.docx`;

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=${filename}`,
    });
    res.send(buffer);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Error generating Word document" });
  }
});

router.put("/quotations/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { approveStatus: true },
      { new: true }
    );
    if (!updatedQuotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ message: "Quotation approved", quotation: updatedQuotation });
  } catch (error) {
    console.error("Error approving quotation:", error);
    res.status(500).json({ message: "Server error approving quotation" });
  }
});

router.put("/quotations/:id/remarks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { remarks } = req.body;
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { remarks },
      { new: true }
    );
    if (!updatedQuotation) return res.status(404).json({ message: "Quotation not found" });
    res.json({ message: "Remarks updated", quotation: updatedQuotation });
  } catch (error) {
    console.error("Error updating remarks for quotation:", error);
    res.status(500).json({ message: "Server error updating remarks for quotation" });
  }
});

router.post("/logs/latest", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { quotationIds } = req.body;
    if (!Array.isArray(quotationIds) || quotationIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty quotation IDs" });
    }

    // Convert string IDs to ObjectId
    const objectIds = quotationIds.map(id => new mongoose.Types.ObjectId(id));

    const logs = await Log.aggregate([
      { $match: { field: "quotation" } },
      {
        $match: {
          $or: [
            { "newValue._id": { $in: objectIds } },
            { "oldValue._id": { $in: objectIds } }
          ]
        }
      },
      { $sort: { performedAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $ifNull: ["$newValue._id", null] },
              "$newValue._id",
              "$oldValue._id"
            ]
          },
          latestLog: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "latestLog.performedBy",
          foreignField: "_id",
          as: "performedBy"
        }
      },
      { $unwind: { path: "$performedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          quotationId: "$_id",
          action: "$latestLog.action",
          performedBy: { $ifNull: ["$performedBy", { email: "Unknown" }] },
          performedAt: "$latestLog.performedAt"
        }
      }
    ]);

    const latestLogs = {};
    quotationIds.forEach(id => {
      const log = logs.find(l => l.quotationId.toString() === id);
      latestLogs[id] = log ? {
        action: log.action,
        performedBy: log.performedBy,
        performedAt: log.performedAt
      } : {};
    });

    // console.log("Latest logs response:", JSON.stringify(latestLogs, null, 2));

    res.json(latestLogs);
  } catch (err) {
    console.error("Error fetching latest logs:", err);
    res.status(500).json({ message: "Server error fetching latest logs" });
  }
});

module.exports = router;