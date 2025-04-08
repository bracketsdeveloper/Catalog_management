const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const request = require("sync-request"); // For fetching images synchronously
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");
const Quotation = require("../models/Quotation");
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
  }
}

// 1) CREATE QUOTATION
router.post("/quotations", authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log("Request body received for quotation creation:");
    console.log(JSON.stringify(req.body, null, 2));

    const {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      items,      // Items array from manual catalog
      terms,      // Dynamic terms field (headings & content)
      displayTotals  // NEW: whether to show totals (true/false)
    } = req.body;

    console.log("Request body keys:", Object.keys(req.body));

    if (!items || items.length === 0) {
      console.error("No items provided in the payload.");
      return res.status(400).json({ message: "No items provided" });
    }

    const defaultTerms = [
      {
        heading: "Delivery",
        content:
          "10 – 12 Working days upon order confirmation\nSingle delivery to Hyderabad office included in the cost"
      },
      { heading: "Branding", content: "As mentioned above" },
      { heading: "Payment Terms", content: "Within 30 days upon delivery" },
      { heading: "Quote Validity", content: "The quote is valid only for 6 days from the date of quotation" }
    ];

    const quotationTerms = (terms && terms.length > 0) ? terms : defaultTerms;

    const newItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`Processing item ${i + 1}:`, item);
      console.log("Item keys:", Object.keys(item));

      // Use productName (or fallback to product) for display
      const productName = item.productName || item.product;
      if (!productName) {
        console.error(`Missing product name for item ${i + 1}`);
        return res.status(400).json({ message: `Product name is required for item ${i + 1}` });
      }

      // Use productCost if present; otherwise, fallback to productprice
      const baseRate = parseFloat(item.productCost || item.productprice);
      if (isNaN(baseRate)) {
        console.error(`Invalid product cost for item ${i + 1}:`, item.productCost);
        return res.status(400).json({ message: `Invalid product cost for item ${i + 1}` });
      }
      const updatedPrice = parseFloat(item.productprice);
      if (isNaN(updatedPrice)) {
        console.error(`Invalid updated product price for item ${i + 1}:`, item.productprice);
        return res.status(400).json({ message: `Invalid updated product price for item ${i + 1}` });
      }
      const productGST = parseFloat(item.productGST);
      if (isNaN(productGST)) {
        console.error(`Invalid product GST for item ${i + 1}:`, item.productGST);
        return res.status(400).json({ message: `Invalid product GST for item ${i + 1}` });
      }
      let quantity = parseInt(item.quantity);
      if (isNaN(quantity)) {
        quantity = 1;
      }

      const amount = updatedPrice * quantity;
      const gstValue = parseFloat((amount * (productGST / 100)).toFixed(2));
      const total = parseFloat((amount + gstValue).toFixed(2));

      // If productId is an object, extract its _id
      const productId =
        typeof item.productId === "object" && item.productId._id
          ? item.productId._id
          : item.productId;

      const newItem = {
        slNo: i + 1,
        productId,
        product: productName,
        quantity,
        rate: baseRate,
        productprice: updatedPrice,
        amount,
        productGST,
        total,
      };
      console.log(`Pushing item ${i + 1}:`, newItem);
      newItems.push(newItem);
    }

    // Compute overall totals
    const totalAmount = newItems.reduce((acc, curr) => acc + curr.amount, 0);
    const grandTotal = newItems.reduce((acc, curr) => acc + curr.total, 0);

    const newQuotation = new Quotation({
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      items: newItems,
      terms: quotationTerms,
      totalAmount,
      grandTotal,
      displayTotals: displayTotals || false, // Store the displayTotals state
      createdBy: req.user.email,
    });

    await newQuotation.save();
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
      .populate("items.productId", "images name productCost category subCategory hsnCode")
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
      .populate("items.productId", "images name productCost category subCategory hsnCode")
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
    const { catalogName, customerName, customerEmail, customerCompany, customerAddress, margin, items, terms, displayTotals } = req.body;

    let newItems = [];
    if (items) {
      for (const item of items) {
        const productName = item.productName || item.product;
        if (!productName) {
          return res.status(400).json({ message: "Product name is required for each item" });
        }
        const baseRate = parseFloat(item.productCost);
        if (isNaN(baseRate)) {
          return res.status(400).json({ message: "Invalid product cost for an item" });
        }
        const updatedPrice = parseFloat(item.productprice);
        if (isNaN(updatedPrice)) {
          return res.status(400).json({ message: "Invalid updated product price for an item" });
        }
        const productGST = parseFloat(item.productGST);
        if (isNaN(productGST)) {
          return res.status(400).json({ message: "Invalid product GST for an item" });
        }
        let quantity = parseInt(item.quantity);
        if (isNaN(quantity)) {
          quantity = 1;
        }
        
        const amount = updatedPrice * quantity;
        const gstValue = parseFloat((amount * (productGST / 100)).toFixed(2));
        const total = parseFloat((amount + gstValue).toFixed(2));

        newItems.push({
          slNo: item.slNo,
          productId: item.productId,
          product: productName,
          quantity,
          rate: baseRate,
          productprice: updatedPrice,
          amount,
          productGST,
          total,
        });
      }
    }

    const totalAmount = newItems.length ? newItems.reduce((acc, curr) => acc + curr.amount, 0) : undefined;
    const grandTotal = newItems.length ? newItems.reduce((acc, curr) => acc + curr.total, 0) : undefined;

    const updatedData = {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin,
      terms,
      displayTotals, // Update displayTotals as well
    };

    if (newItems.length) {
      updatedData.items = newItems;
      updatedData.totalAmount = totalAmount;
      updatedData.grandTotal = grandTotal;
    }

    const existingQuotation = await Quotation.findById(req.params.id);
    if (!existingQuotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    const updatedQuotation = await Quotation.findByIdAndUpdate(req.params.id, updatedData, { new: true });
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
      .populate("items.productId", "images name productCost category subCategory hsnCode")
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
        return [150, 150];
      }
    });

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule]
    });

    const itemsData = quotation.items.map((item, index) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = rate * quantity;
      const total = amount + (amount * item.productGST / 100);
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

    const totalAmount = itemsData.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const grandTotal = itemsData.reduce((sum, i) => sum + parseFloat(i.total), 0);

    const docData = {
      date: new Date(quotation.createdAt).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      }),
      quotationNumber: quotation.quotationNumber || "NoNumber",
      customerName: quotation.customerName || "",
      companyName: quotation.customerCompany || "",
      state: quotation.customerAddress || "",
      catalogName: quotation.catalogName || "",
      items: itemsData,
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
