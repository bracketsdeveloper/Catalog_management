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
    let eInvoice = await EInvoice.findOne({ quotationId: req.params.id, cancelled: false });
    if (!eInvoice) {
      console.error("E-Invoice not initiated");
      return res.status(400).json({ message: "E-Invoice not initiated" });
    }

    if (eInvoice.tokenExpiry && new Date() > eInvoice.tokenExpiry) {
      console.log("Token expired, regenerating authentication token");
      const authResponse = await axios.post(
        `${WHITEBOOKS_API_URL}/einvoice/type/AUTH/version/V1_03`,
        {
          username: WHITEBOOKS_CREDENTIALS.username,
          password: WHITEBOOKS_CREDENTIALS.password,
          client_id: WHITEBOOKS_CREDENTIALS.clientId,
          client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
        },
        {
          headers: {
            ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
            "Content-Type": "application/json",
          },
        }
      );
      const { data, status_cd, status_desc } = authResponse.data;
      if (status_cd !== "1") {
        console.error(`Token regeneration failed: ${status_desc}`);
        return res.status(400).json({ message: "Token regeneration failed", status_desc });
      }
      eInvoice = await EInvoice.findOneAndUpdate(
        { quotationId: req.params.id, cancelled: false },
        {
          authToken: data.auth_token,
          tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
          sek: data.sek,
          clientId: data.client_id,
        },
        { new: true }
      );
      console.log("Token regenerated successfully");
    }

    if (!eInvoice.customerDetails) {
      console.error("Customer details not fetched");
      return res.status(400).json({ message: "Customer details not fetched yet" });
    }

    const { customerDetails } = eInvoice;
    const today = new Date().toLocaleDateString("en-GB"); // e.g., "21/07/2025"
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB"); // e.g., "28/07/2025"

    const referenceJson = {
      Version: "1.1",
      TranDtls: {
        TaxSch: "GST",
        SupTyp: "B2B",
        RegRev: "N",
        EcmGstin: null,
        IgstOnIntra: "N",
      },
      DocDtls: {
        Typ: "INV",
        No: quotation.opportunityNumber || "1416",
        Dt: today,
      },
      SellerDtls: {
        Gstin: WHITEBOOKS_CREDENTIALS.gstin || "29AAGCB1286Q000",
        LglNm: "ABC company pvt ltd",
        TrdNm: "NIC Industries",
        Addr1: "5th block, kuvempu layout",
        Addr2: "kuvempu layout",
        Loc: "GANDHINAGAR",
        Pin: 560001,
        Stcd: "29",
        Ph: "9000000000".replace(/\D/g, ""),
        Em: WHITEBOOKS_CREDENTIALS.email || "bharathac7@gmail.com",
      },
      BuyerDtls: {
        Gstin: customerDetails.gstin || "29AAVCA5425B1ZK",
        LglNm: customerDetails.legalName || "APTOS INDIA PRIVATE LIMITED",
        TrdNm: customerDetails.tradeName || "APTOS INDIA PRIVATE LIMITED",
        Pos: customerDetails.stateCode || "29",
        Addr1: customerDetails.address1 || "Level 8 Cessna Business Park Umiya Business Bay Tower1",
        Addr2: customerDetails.address2 || "Kadubeesanahalli, Sarjapur ORR, Marathahalli",
        Loc: customerDetails.location || "Bangalore",
        Pin: customerDetails.pincode || "560037",
        Stcd: customerDetails.stateCode || "29",
        Ph: (customerDetails.phone || "9636972050").replace(/\D/g, ""),
        Em: customerDetails.email || "anushka.anchan@neoniche.com",
      },
      DispDtls: {
        Nm: "ABC company pvt ltd",
        Addr1: "7th block, kuvempu layout",
        Addr2: "kuvempu layout",
        Loc: "Banagalore",
        Pin: 518360,
        Stcd: "37",
      },
      ShipDtls: {
        Gstin: customerDetails.gstin || "29AAVCA5425B1ZK",
        LglNm: customerDetails.legalName || "APTOS INDIA PRIVATE LIMITED",
        TrdNm: customerDetails.tradeName || "APTOS INDIA PRIVATE LIMITED",
        Addr1: customerDetails.address1 || "Level 8 Cessna Business Park Umiya Business Bay Tower1",
        Addr2: customerDetails.address2 || "Kadubeesanahalli, Sarjapur ORR, Marathahalli",
        Loc: customerDetails.location || "Bangalore",
        Pin: customerDetails.pincode || "560037",
        Stcd: customerDetails.stateCode || "29",
      },
      ItemList: quotation.items.map((item, index) => {
        const qty = item.quantity;
        const unitPrice = item.rate;
        const totAmt = unitPrice * qty;
        const discount = 0;
        const assAmt = totAmt - discount;
        const gstRt = item.productGST;
        const cgstSgst = (assAmt * gstRt) / 200;
        const cesAmt = (assAmt * 5) / 100;
        const stateCesAmt = (assAmt * 12) / 100;
        const totItemVal = assAmt + (cgstSgst * 2) + cesAmt + stateCesAmt; // Exact sum

        return {
          SlNo: (item.slNo || (index + 1)).toString(),
          IsServc: "N",
          PrdDesc: item.product || (index === 0 ? "Steam Gun (Handheld Garment Steamer)(White) with single colror logo" : "Solaris - Moon with single color logo"),
          HsnCd: item.hsnCode || "1001",
          Barcde: "123456",
          BchDtls: { Nm: "123456", Expdt: "01/08/2025", wrDt: "01/09/2025" },
          Qty: qty,
          FreeQty: 10,
          Unit: "NOS",
          UnitPrice: unitPrice,
          TotAmt: totAmt,
          Discount: discount,
          PreTaxVal: 1,
          AssAmt: assAmt,
          GstRt: gstRt,
          SgstAmt: Math.round((assAmt * gstRt) / 200 * 100) / 100, // Round after full calculation
          CgstAmt: Math.round((assAmt * gstRt) / 200 * 100) / 100,
          IgstAmt: 0,
          CesRt: 5,
          CesAmt: Math.round((assAmt * 5) / 100 * 100) / 100,
          CesNonAdvlAmt: 10,
          StateCesRt: 12,
          StateCesAmt: Math.round((assAmt * 12) / 100 * 100) / 100,
          StateCesNonAdvlAmt: 5,
          OthChrg: 10,
          TotItemVal: Math.round(totItemVal * 100) / 100, // Round only once
          OrdLineRef: "3256",
          OrgCntry: "AG",
          PrdSlNo: "12345",
          AttribDtls: [{ Nm: item.product || (index === 0 ? "Steam Gun (Handheld Garment Steamer)(White) with single colror logo" : "Solaris - Moon with single color logo"), Val: "10000" }],
        };
      }),
      ValDtls: {
        AssVal: Math.round(quotation.items.reduce((sum, item) => sum + ((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10), 0) * 100) / 100,
        CgstVal: Math.round(quotation.items.reduce((sum, item) => sum + (((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) * (item.productGST || quotation.gst || 18) / 200), 0) * 100) / 100,
        SgstVal: Math.round(quotation.items.reduce((sum, item) => sum + (((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) * (item.productGST || quotation.gst || 18) / 200), 0) * 100) / 100,
        IgstVal: 0,
        CesVal: Math.round(quotation.items.reduce((sum, item) => sum + (((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) * 5 / 100), 0) * 100) / 100,
        StCesVal: Math.round(quotation.items.reduce((sum, item) => sum + (((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) * 12 / 100), 0) * 100) / 100,
        Discount: 10,
        OthChrg: 20,
        RndOffAmt: 0.3,
        TotInvVal: Math.round(quotation.items.reduce((sum, item) => sum + ((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) + (((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) * (item.productGST || quotation.gst || 18) / 100), 0) * 100) / 100,
        TotInvValFc: Math.round(quotation.items.reduce((sum, item) => sum + ((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) + (((item.rate || (item.slNo === 1 ? 2281 : 2188)) * (item.quantity || 1) - 10) * (item.productGST || quotation.gst || 18) / 100) - 0.3, 0) * 100) / 100,
      },
      PayDtls: {
        Nm: "ABCDE",
        Accdet: "5697389713210",
        Mode: "Cash",
        Fininsbr: "SBIN11000",
        Payterm: "100",
        Payinstr: "Gift",
        Crtrn: "test",
        Dirdr: "test",
        Crday: 100,
        Paidamt: 10000,
        Paymtdue: Math.round(quotation.grandTotal || 5249.82 * 100) / 100,
      },
      RefDtls: {
        InvRm: "TEST",
        DocPerdDtls: {
          InvStDt: today,
          InvEndDt: endDate,
        },
        PrecDocDtls: [{ InvNo: "DOC/002", InvDt: "01/08/2020", OthRefNo: "123456" }],
        ContrDtls: [{ RecAdvRefr: "DOC/002", RecAdvDt: "01/08/2020", Tendrefr: "Abc001", Contrrefr: "Co123", Extrefr: "Yo456", Projrefr: "Doc-456", Porefr: "Doc-789", PoRefDt: "01/08/2020" }],
      },
      AddlDocDtls: [{ Url: "https://einv-apisandbox.nic.in", Docs: "Test Doc", Info: "Document Test" }],
      ExpDtls: {
        ShipBNo: "A-248",
        ShipBDt: "01/08/2020",
        Port: "INABG1",
        RefClm: "N",
        ForCur: "AED",
        CntCode: "AE",
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

router.post("/quotations/:id/einvoice/generate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log(`[Step 1] Starting IRN generation for quotation ID: ${req.params.id} at ${new Date().toISOString()}`);

    // Step 1: Load quotation
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      console.error("[Step 1] Quotation not found");
      return res.status(404).json({ message: "Quotation not found" });
    }

    // Step 2: Load e-invoice record
    console.log(`[Step 2] Fetching e-invoice for quotation ID: ${req.params.id}`);
    let eInvoice = await EInvoice.findOne({ quotationId: req.params.id, cancelled: false });
    if (!eInvoice) {
      console.error("[Step 2] E-Invoice not initiated");
      return res.status(400).json({ message: "E-Invoice not initiated" });
    }

    // Auto-generate new token if expired or missing
    if (!eInvoice.authToken || (eInvoice.tokenExpiry && new Date() > eInvoice.tokenExpiry)) {
      console.log("Token invalid or expired, regenerating authentication token");
      const authResponse = await axios.post(
        `${WHITEBOOKS_API_URL}/einvoice/type/AUTH/version/V1_03`,
        {
          username: WHITEBOOKS_CREDENTIALS.username,
          password: WHITEBOOKS_CREDENTIALS.password,
          client_id: WHITEBOOKS_CREDENTIALS.clientId,
          client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
        },
        {
          headers: {
            ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
            "Content-Type": "application/json",
          },
        }
      );
      const { data, status_cd, status_desc } = authResponse.data;
      if (status_cd !== "1") {
        console.error(`Token regeneration failed: ${status_desc}`);
        return res.status(400).json({ message: "Token regeneration failed", status_desc });
      }
      eInvoice = await EInvoice.findOneAndUpdate(
        { quotationId: req.params.id, cancelled: false },
        {
          authToken: data.auth_token,
          tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
          sek: data.sek,
          clientId: data.client_id,
        },
        { new: true }
      );
      console.log("Token regenerated successfully");
    }

    // Step 3: Verify we have both referenceJson and customerDetails
    if (!eInvoice.referenceJson) {
      console.error("[Step 3] Reference JSON not generated");
      return res.status(400).json({ message: "Reference JSON not generated yet" });
    }
    if (!eInvoice.customerDetails) {
      console.error("[Step 3] Customer details not fetched");
      return res.status(400).json({ message: "Customer details not fetched yet" });
    }
    console.log("[Step 3] Reference JSON and customer details validated");

    // Step 4: Prepare headers and payload
    let payload = eInvoice.referenceJson;
    // Ensure date format is DD/MM/YYYY
    payload.DocDtls.Dt = new Date().toLocaleDateString("en-GB").split("/").reverse().join("/");
    const headers = {
      ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
      client_id: WHITEBOOKS_CREDENTIALS.clientId,
      client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
      username: WHITEBOOKS_CREDENTIALS.username,
      "auth-token": eInvoice.authToken,
      gstin: WHITEBOOKS_CREDENTIALS.gstin,
      "Content-Type": "application/json",
    };

    console.log("[Step 4] Sending IRN generation request to Whitebooks…", { payload: JSON.stringify(payload).slice(0, 200) + "..." });
    const response = await axios.post(
      `${WHITEBOOKS_API_URL}/einvoice/type/GENERATE/version/V1_03`,
      payload,
      { headers }
    );

    console.log(`[Step 5] Whitebooks API response:`, {
      status: response.status,
      data: JSON.stringify(response.data, null, 2),
      headers: response.headers,
    });

    // Step 6: Check status_cd in the JSON body
    const { data, status_cd, status_desc } = response.data || {};
    if (!status_cd || status_cd !== "1") {
      console.error(`[Step 6] IRN generation failed: status_cd = ${status_cd}, status_desc = ${status_desc}`);
      return res.status(400).json({ message: "IRN generation failed", status_cd, status_desc });
    }

    // Step 7: Persist IRN, AckNo, etc.
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
    console.error("[Step 8] Unexpected error during IRN generation:", {
      message: err.message,
      stack: err.stack,
      response: err.response ? {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers,
      } : null,
    });
    return res.status(500).json({ message: "Failed to generate IRN", error: err.message });
  }
});

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