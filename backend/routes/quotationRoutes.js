// backend/routes/quotations.js
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
const EInvoice = require("../models/EInvoice");
const Company = require("../models/Company");
const axios = require("axios");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Load environment variables
const WHITEBOOKS_API_URL = process.env.WHITEBOOKS_API_URL;
const WHITEBOOKS_CREDENTIALS = {
  email: process.env.WHITEBOOKS_EMAIL,
  ipAddress: process.env.WHITEBOOKS_IP_ADDRESS,
  clientId: process.env.WHITEBOOKS_CLIENT_ID,
  clientSecret: process.env.WHITEBOOKS_CLIENT_SECRET,
  username: process.env.WHITEBOOKS_USERNAME,
  password: process.env.WHITEBOOKS_PASSWORD,
  gstin: process.env.WHITEBOOKS_GSTIN,
};

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
      operations,
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

      const hsnCode = it.hsnCode || "";
      if (!hsnCode && it.productId) {
        console.warn(`HSN code missing for productId ${it.productId} in quotation item ${idx + 1}`);
      }

      return {
        slNo: it.slNo || idx + 1,
        productId: it.productId || null,
        product: it.productName || it.product || "",
        hsnCode,
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

    const builtOperations = Array.isArray(operations) ? operations.map(op => {
      const ourCost = parseFloat(op.ourCost) || 0;
      const branding = parseFloat(op.branding) || 0;
      const delivery = parseFloat(op.delivery) || 0;
      const markup = parseFloat(op.markup) || 0;
      const total = (ourCost + branding + delivery + markup).toFixed(2);
      return {
        ourCost: op.ourCost || "",
        branding: op.branding || "",
        delivery: op.delivery || "",
        markup: op.markup || "",
        total,
        vendor: op.vendor || "",
        remarks: op.remarks || "",
        reference: op.reference || "",
      };
    }) : [];

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
      operations: builtOperations,
      createdBy: req.user.email,
    });

    const savedQuotation = await quotation.save();
    await createLog("create", null, savedQuotation, req.user, req.ip);

    res.status(201).json({ message: "Quotation created", quotation: savedQuotation.toObject() });
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
    res.json(list.map(q => q.toObject()));
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
    res.json(quote.toObject());
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
      operations,
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

          const hsnCode = it.hsnCode || "";
          if (!hsnCode && it.productId) {
            console.warn(`HSN code missing for productId ${it.productId} in quotation item ${idx + 1}`);
          }

          return {
            slNo: it.slNo || idx + 1,
            productId: it.productId || null,
            product: it.productName || it.product || "",
            hsnCode,
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

    const builtOperations = Array.isArray(operations) ? operations.map(op => {
      const ourCost = parseFloat(op.ourCost) || 0;
      const branding = parseFloat(op.branding) || 0;
      const delivery = parseFloat(op.delivery) || 0;
      const markup = parseFloat(op.markup) || 0;
      const total = (ourCost + branding + delivery + markup).toFixed(2);
      return {
        ourCost: op.ourCost || "",
        branding: op.branding || "",
        delivery: op.delivery || "",
        markup: op.markup || "",
        total,
        vendor: op.vendor || "",
        remarks: op.remarks || "",
        reference: op.reference || "",
      };
    }) : existing.operations;

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
      operations: builtOperations,
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
    console.error("Error exporting quotation:", err);
    res.status(400).json({ message: "Error generating quotation" });
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
    res.json({ message: "Quotation approved", quotation: updatedQuotation.toObject() });
  } catch (err) {
    console.error("Error approving quotation:", err);
    res.status(400).json({ message: "Error approving quotation" });
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
    res.json({ message: "Remarks updated", quotation: updatedQuotation.toObject() });
  } catch (error) {
    console.error("Error updating remarks for quotation:", error);
    res.status(400).json({ message: "Server error updating remarks" });
  }
});

router.post("/quotations/:id/operations", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { ourCost, branding, delivery, markup, vendor, remarks, reference } = req.body;
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    const ourCostNum = parseFloat(ourCost) || 0;
    const brandingNum = parseFloat(branding) || 0;
    const deliveryNum = parseFloat(delivery) || 0;
    const markupNum = parseFloat(markup) || 0;
    const total = (ourCostNum + brandingNum + deliveryNum + markupNum).toFixed(2);

    const newOperation = {
      ourCost: ourCost || "",
      branding: branding || "",
      delivery: delivery || "",
      markup: markup || "",
      total,
      vendor: vendor || "",
      remarks: remarks || "",
      reference: reference || "",
    };

    quotation.operations.push(newOperation);
    const updatedQuotation = await quotation.save();
    await createLog("add operation", null, updatedQuotation, req.user, req.ip);

    res.json({ message: "Operation cost added", quotation: updatedQuotation.toObject() });
  } catch (err) {
    console.error("Error adding operation cost:", err);
    res.status(400).json({ message: "Server error adding operation cost" });
  }
});

router.put("/quotations/:id/operations/:opId", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { ourCost, branding, delivery, markup, vendor, remarks, reference } = req.body;
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    const operation = quotation.operations.id(req.params.opId);
    if (!operation) return res.status(404).json({ message: "Operation not found" });

    const ourCostNum = parseFloat(ourCost) || 0;
    const brandingNum = parseFloat(branding) || 0;
    const deliveryNum = parseFloat(delivery) || 0;
    const markupNum = parseFloat(markup) || 0;
    const total = (ourCostNum + brandingNum + deliveryNum + markupNum).toFixed(2);

    operation.ourCost = ourCost || operation.ourCost;
    operation.branding = branding || operation.branding;
    operation.delivery = delivery || operation.delivery;
    operation.markup = markup || operation.markup;
    operation.total = total;
    operation.vendor = vendor || operation.vendor;
    operation.remarks = remarks || operation.remarks;
    operation.reference = reference || operation.reference;

    const updatedQuotation = await quotation.save();
    await createLog("update operation", null, updatedQuotation, req.user, req.ip);

    res.json({ message: "Operation cost updated", quotation: updatedQuotation.toObject() });
  } catch (err) {
    console.error("Error updating operation cost:", err);
    res.status(400).json({ message: "Server error updating operation cost" });
  }
});

router.post("/logs/:id/latest", authenticate, async (req, res) => {
  try {
    const { quotationIds } = req.body;
    if (!Array.isArray(quotationIds) || quotationIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty quotation IDs" });
    }

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

    res.json(latestLogs);
  } catch (err) {
    console.error("Error fetching latest logs:", err);
    res.status(400).json({ message: "Server error fetching latest logs" });
  }
});

// E-Invoice Routes
router.post("/quotations/:id/einvoice/authenticate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${WHITEBOOKS_API_URL}/einvoice/authenticate`, {
      params: { email: WHITEBOOKS_CREDENTIALS.email },
      headers: {
        ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
        client_id: WHITEBOOKS_CREDENTIALS.clientId,
        client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
        username: WHITEBOOKS_CREDENTIALS.username,
        password: WHITEBOOKS_CREDENTIALS.password,
        gstin: WHITEBOOKS_CREDENTIALS.gstin,
      },
    });

    const { data, status_cd, status_desc } = response.data;
    if (status_cd !== "Sucess") {
      return res.status(400).json({ message: "Authentication failed", status_desc });
    }

    const eInvoice = await EInvoice.findOneAndUpdate(
      { quotationId: req.params.id, cancelled: false },
      {
        authToken: data.AuthToken,
        tokenExpiry: new Date(data.TokenExpiry),
        sek: data.Sek,
        clientId: data.ClientId,
        createdBy: req.user.email,
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Authenticated", eInvoice });
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(500).json({ message: "Authentication failed" });
  }
});

// backend/routes/quotations.js (relevant route only)

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get(
  '/quotations/:id/einvoice/customer',
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      console.log(
        `Fetching quotation with ID: ${req.params.id} at ${new Date().toISOString()}`
      );
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) {
        console.error('Quotation not found');
        return res.status(404).json({ message: 'Quotation not found' });
      }

      // Trim and escape regex chars before searching
      const rawName = quotation.customerCompany.trim();
      const safePattern = escapeRegex(rawName);
      console.log(`Searching for company with name (escaped): ${safePattern}`);

      const companies = await Company.find({
        companyName: { $regex: safePattern, $options: 'i' }
      }).sort({ companyName: 1 });

      if (companies.length === 0) {
        console.error(`No company found for name: ${rawName}`);
        return res
          .status(404)
          .json({ message: 'No company found matching the provided name' });
      }
      const company = companies[0];
      console.log(
        `Company found: ${company.companyName}, GSTIN: ${company.GSTIN}`
      );

      if (!company.GSTIN) {
        console.error('GSTIN missing in company document');
        return res
          .status(400)
          .json({ message: 'Company GSTIN not provided' });
      }

      console.log(
        `Fetching e-invoice for quotation ID: ${req.params.id}`
      );
      const eInvoice = await EInvoice.findOne({
        quotationId: req.params.id,
        cancelled: false
      });
      if (!eInvoice) {
        console.error('E-Invoice not initiated');
        return res
          .status(400)
          .json({ message: 'E-Invoice not initiated' });
      }

      console.log(
        `Making Whitebooks API request with GSTIN: ${company.GSTIN}`
      );
      const response = await axios.get(
        `${WHITEBOOKS_API_URL}/einvoice/type/GSTNDETAILS/version/V1_03`,
        {
          params: {
            param1: company.GSTIN,
            email: WHITEBOOKS_CREDENTIALS.email
          },
          headers: {
            ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
            client_id: WHITEBOOKS_CREDENTIALS.clientId,
            client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
            username: WHITEBOOKS_CREDENTIALS.username,
            'auth-token': eInvoice.authToken,
            gstin: WHITEBOOKS_CREDENTIALS.gstin
          }
        }
      );

      console.log(
        `Whitebooks API response: status_cd = ${response.data.status_cd}`
      );
      const { data, status_cd, status_desc } = response.data;
      if (status_cd !== '1') {
        console.error(`Whitebooks API error: ${status_desc}`);
        return res.status(400).json({
          message: 'Failed to fetch customer details',
          status_desc
        });
      }

      const customerDetails = {
        gstin: data.Gstin,
        legalName: data.LegalName,
        tradeName: data.TradeName,
        address1: `${data.AddrBno || ''} ${data.AddrBnm || ''} ${
          data.AddrFlno || ''
        }`.trim(),
        address2: data.AddrSt || '',
        location: data.AddrLoc,
        pincode: data.AddrPncd.toString(),
        stateCode: data.StateCode.toString(),
        phone: company.clients[0]?.contactNumber || '',
        email: company.clients[0]?.email || ''
      };

      console.log('Updating EInvoice with customer details');
      const updatedEInvoice = await EInvoice.findOneAndUpdate(
        { quotationId: req.params.id, cancelled: false },
        { customerDetails, createdBy: req.user.email },
        { upsert: true, new: true }
      );

      res.json({
        message: 'Customer details fetched',
        customerDetails,
        eInvoice: updatedEInvoice
      });
    } catch (err) {
      console.error('Customer details error:', err.message, err.stack);
      res
        .status(500)
        .json({ message: 'Failed to fetch customer details', error: err.message });
    }
  }
);

router.post("/quotations/:id/einvoice/reference", authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log(`Generating reference JSON for quotation ID: ${req.params.id} at ${new Date().toISOString()}`);
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      console.error("Quotation not found");
      return res.status(404).json({ message: "Quotation not found" });
    }

    console.log(`Fetching e-invoice for quotation ID: ${req.params.id}`);
    const eInvoice = await EInvoice.findOne({ quotationId: req.params.id, cancelled: false });
    if (!eInvoice) {
      console.error("E-Invoice not initiated");
      return res.status(400).json({ message: "E-Invoice not initiated" });
    }

    if (!eInvoice.customerDetails) {
      console.error("Customer details not fetched");
      return res.status(400).json({ message: "Customer details not fetched yet" });
    }

    const { customerDetails } = eInvoice;
    const referenceJson = {
      Version: "1.1",
      TranDtls: {
        TaxSch: "GST",
        SupTyp: "B2B",
        RegRev: "N",
        IgstOnIntra: "N",
      },
      DocDtls: {
        Typ: "INV",
        No: quotation.opportunityNumber || `INV-${req.params.id}`,
        Dt: new Date().toISOString().split("T")[0],
      },
      SellerDtls: {
        Gstin: "29ABCFA9924A1ZL",
        LglNm: "ACE PRINT PACK",
        TrdNm: "ACE PRINT PACK",
        Addr1: "NO. 2, 2ND FLOOR, R.R.CHAMBERS",
        Addr2: "11TH MAIN, VASANTHNAGAR, BENGALURU",
        Loc: "VASANTHNAGAR, BENGALURU",
        Pin: 560052,
        Stcd: "29",
        Ph: WHITEBOOKS_CREDENTIALS.phone || "1234567890",
        Em: WHITEBOOKS_CREDENTIALS.email || "email@example.com",
      },
      BuyerDtls: {
        Gstin: customerDetails.gstin,
        LglNm: customerDetails.legalName,
        TrdNm: customerDetails.tradeName,
        Addr1: customerDetails.address1,
        Addr2: customerDetails.address2,
        Loc: customerDetails.location,
        Pin: customerDetails.pincode,
        Stcd: customerDetails.stateCode,
        Ph: customerDetails.phone,
        Em: customerDetails.email,
      },
      ItemList: quotation.items.map((item, index) => ({
        SlNo: item.slNo || index + 1,
        PrdDesc: item.product,
        IsServc: "N",
        HsnCd: item.hsnCode || "999999", // Default HSN if not provided
        Qty: item.quantity || 1,
        Unit: "NOS", // Adjust unit as per your data
        UnitPrice: item.rate || 0,
        TotAmt: (item.rate || 0) * (item.quantity || 1),
        Discount: 0,
        AssAmt: (item.rate || 0) * (item.quantity || 1),
        GstRt: item.productGST || quotation.gst || 18,
        IgstAmt: 0,
        CgstAmt: 0,
        SgstAmt: 0,
        CesRt: 0,
        CesAmt: 0,
        CesNonAdvlAmt: 0,
        StateCesRt: 0,
        StateCesAmt: 0,
        StateCesNonAdvlAmt: 0,
        OthChrg: 0,
      })),
      ValDtls: {
        AssVal: quotation.items.reduce((sum, item) => sum + (item.rate || 0) * (item.quantity || 1), 0),
        CgstVal: 0,
        SgstVal: 0,
        IgstVal: 0,
        CesVal: 0,
        StCesVal: 0,
        Discount: 0,
        OthChrg: 0,
        TotInvVal: quotation.items.reduce((sum, item) => {
          const amount = (item.rate || 0) * (item.quantity || 1);
          const gst = (amount * (item.productGST || quotation.gst || 18)) / 100;
          return sum + amount + gst;
        }, 0),
        TotInvValFc: 0,
        TennDisc: 0,
      },
    };

    console.log("Generated reference JSON:", JSON.stringify(referenceJson, null, 2));
    const updatedEInvoice = await EInvoice.findOneAndUpdate(
      { quotationId: req.params.id, cancelled: false },
      { referenceJson, createdBy: req.user.email },
      { upsert: true, new: true }
    );

    res.json({
      message: "Reference JSON generated",
      referenceJson,
      eInvoice: updatedEInvoice,
    });
  } catch (err) {
    console.error("Reference JSON generation error:", err.message, err.stack);
    res.status(500).json({ message: "Failed to generate reference JSON", error: err.message });
  }
});

router.put("/quotations/:id/einvoice/reference", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { referenceJson } = req.body;
    const eInvoice = await EInvoice.findOneAndUpdate(
      { quotationId: req.params.id, cancelled: false },
      { referenceJson, createdBy: req.user.email },
      { new: true }
    );
    if (!eInvoice) return res.status(404).json({ message: "E-Invoice not found" });
    res.json({ message: "Reference JSON updated", eInvoice });
  } catch (err) {
    console.error("Update reference JSON error:", err);
    res.status(500).json({ message: "Failed to update reference JSON" });
  }
});

router.post(
  "/quotations/:id/einvoice/generate",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      console.log(
        `[Step 1] Starting IRN generation for quotation ID: ${req.params.id} at ${new Date().toISOString()}`
      );

      // Step 1: load quotation
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) {
        console.error("[Step 1] Quotation not found");
        return res.status(404).json({ message: "Quotation not found" });
      }

      // Step 2: load e‑invoice record
      console.log(`[Step 2] Fetching e‑invoice for quotation ID: ${req.params.id}`);
      const eInvoice = await EInvoice.findOne({
        quotationId: req.params.id,
        cancelled: false,
      });
      if (!eInvoice) {
        console.error("[Step 2] E‑Invoice not initiated");
        return res.status(400).json({ message: "E‑Invoice not initiated" });
      }

      // Step 3: verify we have both referenceJson and customerDetails
      if (!eInvoice.referenceJson) {
        console.error("[Step 3] Reference JSON not generated");
        return res
          .status(400)
          .json({ message: "Reference JSON not generated yet" });
      }
      if (!eInvoice.customerDetails) {
        console.error("[Step 3] Customer details not fetched");
        return res
          .status(400)
          .json({ message: "Customer details not fetched yet" });
      }

      console.log("[Step 3] Reference JSON and customer details validated");

      // Step 4: prepare headers and payload
      const payload = eInvoice.referenceJson; // raw JSON object

      const headers = {
        ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
        client_id: WHITEBOOKS_CREDENTIALS.clientId,
        client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
        username: WHITEBOOKS_CREDENTIALS.username,
        "auth-token": eInvoice.authToken,
        gstin: WHITEBOOKS_CREDENTIALS.gstin,
        "Content-Type": "application/json",
      };

      console.log("[Step 4] Sending IRN generation request to Whitebooks…");
      const response = await axios.post(
        `${WHITEBOOKS_API_URL}/einvoice/type/GENERATE/version/V1_03`,
        payload,
        { headers }
      );

      console.log(
        `[Step 5] Whitebooks API response data:`,
        JSON.stringify(response.data, null, 2)
      );

      // Step 6: check status_cd in the JSON body
      const { data, status_cd, status_desc } = response.data || {};
      if (status_cd !== "1") {
        console.error(`[Step 6] IRN generation failed: ${status_cd} / ${status_desc}`);
        return res
          .status(400)
          .json({ message: "IRN generation failed", status_cd, status_desc });
      }

      // Step 7: persist IRN, AckNo, etc.
      console.log("[Step 7] IRN generation successful, updating EInvoice…");
      const updatedEInvoice = await EInvoice.findOneAndUpdate(
        { quotationId: req.params.id, cancelled: false },
        {
          irn: data.Irn,
          ackNo: data.AckNo,
          ackDt: data.AckDt,
          signedInvoice: data.SignedInvoice || "",
          signedQRCode: data.SignedQRCode || "",
          status: "GENERATED",
          createdBy: req.user.email,
        },
        { upsert: true, new: true }
      );

      console.log(`[Step 7] EInvoice updated with IRN: ${data.Irn}`);
      return res.json({
        message: "IRN generated successfully",
        irn: data.Irn,
        eInvoice: updatedEInvoice,
      });
    } catch (err) {
      console.error("[Step 8] Unexpected error during IRN generation:", err);
      return res
        .status(500)
        .json({ message: "Failed to generate IRN", error: err.message });
    }
  }
);

router.put("/quotations/:id/einvoice/cancel", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const eInvoice = await EInvoice.findOneAndUpdate(
      { quotationId: req.params.id, cancelled: false },
      { cancelled: true, createdBy: req.user.email },
      { new: true }
    );
    if (!eInvoice) return res.status(404).json({ message: "E-Invoice not found" });
    res.json({ message: "E-Invoice cancelled", eInvoice });
  } catch (err) {
    console.error("Cancel e-invoice error:", err);
    res.status(500).json({ message: "Failed to cancel e-invoice" });
  }
});

module.exports = router;