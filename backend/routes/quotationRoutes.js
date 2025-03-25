const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const request = require("sync-request"); // Add this at the top with other requires
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const Quotation = require("../models/Quotation");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// 1) CREATE QUOTATION
router.post("/quotations", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      items
    } = req.body;

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
    const quotations = await Quotation.find()
      .populate("items.productId", "images name productCost category subCategory")
      .sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Server error fetching quotations" });
  }
});

// 3) GET A SINGLE QUOTATION
router.get("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("items.productId", "images name productCost category subCategory")
      .exec();
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
    const {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      items
    } = req.body;

    const updatedData = {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      items
    };

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
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

// 6) EXPORT QUOTATION TO WORD
router.get("/quotations/:id/export-word", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("items.productId", "images name productCost category subCategory")
      .exec();

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const templatePath = path.join(__dirname, "..", "templates", "template.docx");
    const content = fs.readFileSync(templatePath, "binary");

    const imageModule = new ImageModule({
      centered: false,
      getImage(value) {
        try {
          const imageUrl = value || "https://via.placeholder.com/150";
          const res = request("GET", imageUrl);
          if (res.statusCode !== 200) throw new Error("Image not accessible");
          return res.getBody();
        } catch (e) {
          console.warn("Image fetch failed:", e.message);
          return fs.readFileSync(path.join(__dirname, "..", "templates", "placeholder.png"));
        }
      },
      getSize() {
        return [150, 150]; // width, height in px
      }
    });

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule]
    });

    const items = quotation.items.map((item, index) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = rate * quantity;
      const total = amount * 1.18;

      const image = item.image || 
        (item.productId?.images?.length > 0 ? item.productId.images[0] : "https://via.placeholder.com/150");

      return {
        slNo: item.slNo?.toString() || (index + 1).toString(),
        image,
        product: item.product || "",
        quantity: quantity.toString(),
        rate: rate.toFixed(2),
        amount: amount.toFixed(2),
        total: total.toFixed(2)
      };
    });

    const totalAmount = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const grandTotal = items.reduce((sum, i) => sum + parseFloat(i.total), 0);

    const docData = {
      date: new Date(quotation.createdAt).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      }),
      quotationNumber: quotation.quotationNumber || "NoNumber",
      customerName: quotation.customerName || "",
      companyName: quotation.customerCompany || "",
      state: quotation.customerAddress || "",
      catalogName: quotation.catalogName || "",
      items,
      grandTotalAmount: totalAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2)
    };

    doc.render(docData);

    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    const filename = `Quotation-${quotation.quotationNumber || "NoNumber"}.docx`;

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=${filename}`
    });
    res.send(buffer);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Error generating Word document" });
  }
});


// 7) Approve a Quotation
router.put("/quotations/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { approveStatus: true },
      { new: true }
    );
    if (!updatedQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json({ message: "Quotation approved", quotation: updatedQuotation });
  } catch (error) {
    console.error("Error approving quotation:", error);
    res.status(500).json({ message: "Server error approving quotation" });
  }
});

// 8) Update Remarks for a Quotation
router.put("/quotations/:id/remarks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { remarks } = req.body;
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { remarks },
      { new: true }
    );
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
