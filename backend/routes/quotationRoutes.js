const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const Quotation = require("../models/Quotation");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// 1) CREATE QUOTATION
router.post("/quotations", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { catalogName, customerName, customerEmail, customerCompany, customerAddress, margin, items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }
    const newQuotation = new Quotation({
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      items,
      createdBy: req.user.email
    });
    await newQuotation.save();
    res.status(201).json({ message: "Quotation created", quotation: newQuotation });
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({ message: "Server error creating quotation" });
  }
});

// 2) GET ALL QUOTATIONS
router.get("/quotations", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Server error fetching quotations" });
  }
});

// 3) GET A SINGLE QUOTATION
router.get("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json(quotation);
  } catch (error) {
    console.error("Error fetching quotation:", error);
    res.status(500).json({ message: "Server error fetching quotation" });
  }
});

// 4) UPDATE A QUOTATION
router.put("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { catalogName, customerName, customerEmail, customerCompany, customerAddress, margin, items } = req.body;
    const updatedData = { catalogName, customerName, customerEmail, customerCompany, customerAddress, margin, items };
    const updatedQuotation = await Quotation.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!updatedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json({ message: "Quotation updated", quotation: updatedQuotation });
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({ message: "Server error updating quotation" });
  }
});

// 5) DELETE A QUOTATION
router.delete("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedQuotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!deletedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json({ message: "Quotation deleted" });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    res.status(500).json({ message: "Server error deleting quotation" });
  }
});

// 6) EXPORT QUOTATION TO WORD (with embedded images)
router.get("/quotations/:id/export-word", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quotationId = req.params.id;
    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const templatePath = path.join(__dirname, "..", "templates", "template.docx");
    const content = fs.readFileSync(templatePath, "binary");

    const imageModule = new ImageModule({
      getImage: function(value) {
        return new Promise((resolve, reject) => {
          const https = require("https");
          const imageUrl = value || "https://via.placeholder.com/150";
          https.get(imageUrl, (resp) => {
            let data = [];
            resp.on("data", (chunk) => data.push(chunk));
            resp.on("end", () => resolve(Buffer.concat(data)));
          }).on("error", (err) => reject(err));
        });
      },
      getSize: function() {
        return { width: 3, height: 3 };
      }
    });

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule]
    });

    const formattedDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const marginVal = parseFloat(quotation.margin) || 0;
    let sumAmount = 0;
    let sumTotal = 0;
    const itemsData = (quotation.items || []).map((it, idx) => {
      const quantity = parseFloat(it.quantity) || 0;
      const baseRate = parseFloat(it.rate) || 0;
      const effectiveRate = baseRate * (1 + marginVal / 100);
      const itemAmount = effectiveRate * quantity;
      const itemTotal = itemAmount * 1.18;
      sumAmount += itemAmount;
      sumTotal += itemTotal;
      return {
        slNo: it.slNo ? it.slNo.toString() : (idx + 1).toString(),
        image: (it.images && it.images.length > 0 ? it.images[0] : it.image) || "https://via.placeholder.com/150",
        product: it.product || "",
        quantity: quantity.toString(),
        rate: effectiveRate.toFixed(2),
        amount: itemAmount.toFixed(2),
        total: itemTotal.toFixed(2)
      };
    });

    const docData = {
      date: formattedDate,
      quotationNumber: quotation.quotationNumber || "NoNumber",
      customerName: quotation.customerName || "",
      companyName: quotation.customerCompany || "",
      state: quotation.customerAddress || "",
      catalogName: quotation.catalogName || "",
      items: itemsData,
      grandTotalAmount: sumAmount.toFixed(2),
      grandTotal: sumTotal.toFixed(2)
    };

    doc.setData(docData);
    doc.render();
    const buf = doc.getZip().generate({ type: "nodebuffer" });
    const filename = `Quotation-${quotation.quotationNumber || "NoNumber"}.docx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=${filename}`
    });
    res.send(buf);
  } catch (error) {
    console.error("Error exporting Word doc:", error);
    res.status(500).json({ message: "Server error exporting doc" });
  }
});

// 7) Approve a quotation
router.put("/quotations/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedQuotation = await Quotation.findByIdAndUpdate(req.params.id, { approveStatus: true }, { new: true });
    if (!updatedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json({ message: "Quotation approved", quotation: updatedQuotation });
  } catch (error) {
    console.error("Error approving quotation:", error);
    res.status(500).json({ message: "Server error approving quotation" });
  }
});

// 8) Update remarks for a quotation
router.put("/quotations/:id/remarks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { remarks } = req.body;
    const updatedQuotation = await Quotation.findByIdAndUpdate(req.params.id, { remarks }, { new: true });
    if (!updatedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json({ message: "Remarks updated", quotation: updatedQuotation });
  } catch (error) {
    console.error("Error updating remarks for quotation:", error);
    res.status(500).json({ message: "Server error updating remarks for quotation" });
  }
});

module.exports = router;
