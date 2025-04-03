const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const request = require("sync-request"); // For fetching images synchronously
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const Quotation = require("../models/Quotation");
const Product = require("../models/Product");
const Log = require("../models/Log"); // Ensure you have a Log model
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Helper to create logs
async function createLog(action, oldValue, newValue, user, ip) {
  try {
    await Log.create({
      action,
      field: "quotation", // using a general field for quotation
      oldValue,
      newValue,
      performedBy: user ? user._id : null,
      performedAt: new Date(),
      ipAddress: ip
    });
  } catch (error) {
    console.error("Error creating quotation log:", error);
    // Do not block main flow if logging fails
  }
}

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
      items,      // Items array from request body
      terms       // Dynamic terms field (headings & content)
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    // Define default terms
    const defaultTerms = [
      {
        heading: "Delivery",
        content:
          "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost"
      },
      {
        heading: "Branding",
        content: "As mentioned above"
      },
      {
        heading: "Payment Terms",
        content: "Within 30 days upon delivery"
      },
      {
        heading: "Quote Validity",
        content: "The quote is valid only for 6 days from the date of quotation"
      }
    ];

    // Use provided terms if available; otherwise, use default terms.
    const quotationTerms = (terms && terms.length > 0) ? terms : defaultTerms;

    // Build new items array with each product's productGST fetched from the Product model
    const newItems = [];
    for (const item of items) {
      const productDoc = await Product.findById(item.productId).lean();
      if (!productDoc) {
        console.warn(`Product not found: ${item.productId}`);
        continue;
      }
      const productGST = productDoc.productGST || 0;
      newItems.push({
        slNo: item.slNo,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        productGST, // Store each product's GST
        total: item.total,
      });
    }

    const newQuotation = new Quotation({
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      items: newItems,
      terms: quotationTerms,
      createdBy: req.user.email,
    });

    await newQuotation.save();

    // Create log for quotation creation
    await createLog("create", null, newQuotation, req.user, req.ip);

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
      items,
      terms
    } = req.body;

    // Build updated items array with each product's productGST
    let newItems = [];
    if (items) {
      for (const item of items) {
        const productDoc = await Product.findById(item.productId).lean();
        if (!productDoc) {
          console.warn(`Product not found: ${item.productId}`);
          continue;
        }
        const productGST = productDoc.productGST || 0;
        newItems.push({
          slNo: item.slNo,
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          productGST,
          total: item.total,
        });
      }
    }

    const updatedData = {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      terms,
    };

    if (newItems.length) {
      updatedData.items = newItems;
    }

    const existingQuotation = await Quotation.findById(req.params.id);
    if (!existingQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    await createLog("update", existingQuotation, updatedQuotation, req.user, req.ip);

    res.json({ message: "Quotation updated", quotation: updatedQuotation });
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({ message: "Server error updating quotation" });
  }
});

// 5) DELETE A QUOTATION
router.delete("/quotations/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const quotationToDelete = await Quotation.findById(req.params.id);
    if (!quotationToDelete) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    await Quotation.findByIdAndDelete(req.params.id);
    await createLog("delete", quotationToDelete, null, req.user, req.ip);

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
          const response = request("GET", imageUrl);
          if (response.statusCode !== 200) throw new Error("Image not accessible");
          return response.getBody();
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
      // For this export, using a fixed multiplier for example purposes
      const total = amount * 1.18;

      // Use the first image from the product (if available) or fallback to placeholder
      const image = item.productId?.images?.[0] || "https://via.placeholder.com/150";

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
      terms: quotation.terms || [],
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

// 7) APPROVE A QUOTATION
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

// 8) UPDATE REMARKS FOR A QUOTATION
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
