// routes/invoices.einvoice.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const EInvoice = require("../models/EInvoice");
const Company = require("../models/Company");
const Invoice = require("../models/Invoice");

// ENV
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

/* ----------------------------- helpers ----------------------------- */
const round = (n) => Math.round(Number(n || 0) * 100) / 100;
const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fmtDDMMYYYY = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const onlyDigitsSafe = (s, min = 6, max = 12, fallback = "9999999999") => {
  const digits = String(s || "").replace(/\D/g, "");
  if (digits.length < min || digits.length > max) return fallback;
  return digits;
};
const emailOk = (e, fallback = "accounts@example.com") => {
  if (typeof e !== "string") return fallback;
  const t = e.trim();
  if (t.length < 6 || t.length > 100) return fallback;
  return t;
};
const inferStateCodeFromGSTIN = (gstin) => {
  const m = String(gstin || "").match(/^(\d{2})/);
  return m ? m[1] : "";
};
const extractPincode = (...sources) => {
  const joined = sources.filter(Boolean).join(" ");
  const m = joined.match(/(\d{6})(?!.*\d)/);
  return m ? m[1] : "";
};
const firstNonEmpty = (...vals) => vals.find((v) => (v || "").trim().length) || "";

function parseCompanyAddress(companyAddress, explicitPincode) {
  const raw = String(companyAddress || "");
  const lines = raw.split(/\r?\n|,|;/).map((s) => s.trim()).filter(Boolean);
  const pincode = firstNonEmpty(explicitPincode, extractPincode(raw));
  const address1 = lines[0] || "";
  let location = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const token = lines[i];
    if (!/^\d{6}$/.test(token)) {
      location = token;
      break;
    }
  }
  let address2 = "";
  if (lines.length > 2) {
    const middle = lines.slice(1, -1).join(", ").trim();
    address2 = middle;
  }
  return { address1, address2, location, pincode };
}

/** Fallback buyer basics from saved customer/company/invoice text */
function buildBuyerBasics({ customerDetails, company, invoice }) {
  const gstin = firstNonEmpty(customerDetails?.gstin, company?.GSTIN);
  const inferredState = inferStateCodeFromGSTIN(gstin);

  const companyAddrParsed = parseCompanyAddress(company?.companyAddress, company?.pincode);
  const billAddrParsed = parseCompanyAddress(String(invoice?.billTo || ""), null);

  const address1 = firstNonEmpty(customerDetails?.address1, companyAddrParsed.address1, billAddrParsed.address1);
  const address2 = firstNonEmpty(customerDetails?.address2, companyAddrParsed.address2, billAddrParsed.address2);
  const location = firstNonEmpty(customerDetails?.location, companyAddrParsed.location, billAddrParsed.location);
  const pincode = firstNonEmpty(
    customerDetails?.pincode,
    company?.pincode,
    companyAddrParsed.pincode,
    billAddrParsed.pincode
  );
  const stateCode = firstNonEmpty(customerDetails?.stateCode, inferredState);

  const legalName = firstNonEmpty(customerDetails?.legalName, company?.companyName, invoice?.clientCompanyName);
  const tradeName = firstNonEmpty(customerDetails?.tradeName, company?.brandName, legalName);
  const phone = onlyDigitsSafe(firstNonEmpty(customerDetails?.phone, company?.clients?.[0]?.contactNumber), 6, 12, "9999999999");
  const email = emailOk(firstNonEmpty(customerDetails?.email, company?.clients?.[0]?.email), "accounts@example.com");

  return { gstin, legalName, tradeName, address1, address2, location, pincode, stateCode, phone, email };
}

/** Detect SEZ from buyer strings (no state/pincode comparison) */
function looksSEZFromBuyerStrings(buyerObjOrStrings) {
  const hay = (typeof buyerObjOrStrings === "string"
    ? buyerObjOrStrings
    : [
        buyerObjOrStrings?.LglNm,
        buyerObjOrStrings?.TrdNm,
        buyerObjOrStrings?.Addr1,
        buyerObjOrStrings?.Addr2,
        buyerObjOrStrings?.Loc,
      ].join(" ")
  ) || "";
  return /(^|[^A-Z])SEZ([^A-Z]|$)|SPECIAL\s+ECONOMIC\s+ZONE/i.test(hay);
}

/* ------------------------------ routes ------------------------------ */

// 1) Authenticate
router.post("/invoices/:id/einvoice/authenticate", authenticate, authorizeAdmin, async (req, res) => {
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
    if (status_cd !== "Sucess") return res.status(400).json({ message: "Authentication failed", status_desc });

    const eInvoice = await EInvoice.findOneAndUpdate(
      { invoiceId: req.params.id, cancelled: false },
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
    console.error("Authenticate error:", err?.response?.data || err.message);
    res.status(500).json({ message: "Authentication failed" });
  }
});

// 2) Fetch buyer (GSTN first, else local). Save isSEZ only if GSTN says so.
router.get("/invoices/:id/einvoice/customer", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const safe = escapeRegex(invoice.clientCompanyName || "");
    const companies = await Company.find({ companyName: { $regex: safe, $options: "i" } }).sort({ companyName: 1 });
    if (!companies.length) return res.status(404).json({ message: "Company not found" });

    const company = companies[0];
    if (!company.GSTIN) return res.status(400).json({ message: "Company GSTIN not provided" });

    const eInvoiceAuth = await EInvoice.findOne({ invoiceId: req.params.id, cancelled: false });
    if (!eInvoiceAuth) return res.status(400).json({ message: "E-Invoice not initiated (authenticate first)" });

    let customerDetails = null;
    let source = "wb";

    try {
      const response = await axios.get(`${WHITEBOOKS_API_URL}/einvoice/type/GSTNDETAILS/version/V1_03`, {
        params: { param1: company.GSTIN, email: WHITEBOOKS_CREDENTIALS.email },
        headers: {
          ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
          client_id: WHITEBOOKS_CREDENTIALS.clientId,
          client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
          username: WHITEBOOKS_CREDENTIALS.username,
          "auth-token": eInvoiceAuth.authToken,
          gstin: WHITEBOOKS_CREDENTIALS.gstin,
        },
      });
      const { data, status_cd } = response.data;
      if (status_cd === "1") {
        customerDetails = {
          gstin: data.Gstin,
          legalName: data.LegalName || company.companyName || invoice.clientCompanyName || "",
          tradeName: data.TradeName || data.LegalName || company.companyName || "",
          address1: `${data.AddrBno || ""} ${data.AddrBnm || ""} ${data.AddrFlno || ""}`.trim(),
          address2: data.AddrSt || "",
          location: data.AddrLoc || "",
          pincode: String(data.AddrPncd || ""),
          stateCode: String(data.StateCode || ""),
          phone: (company.clients && company.clients[0]?.contactNumber) || "9999999999",
          email: (company.clients && company.clients[0]?.email) || "accounts@example.com",
          // Only set from GSTN flags; do not infer
          isSEZ:
            String(data.IsSezUnit || data.IsSEZ || data.Sez || data.SEZ || "")
              .toUpperCase() === "Y" ||
            String(data.TaxpayerType || data.Nature || data.RegType || "")
              .toUpperCase()
              .includes("SEZ"),
        };
      }
    } catch {
      source = "local";
    }

    if (!customerDetails) {
      const basics = buildBuyerBasics({ customerDetails: {}, company, invoice });
      customerDetails = { ...basics, isSEZ: false };
      source = "local";
    }

    const saved = await EInvoice.findOneAndUpdate(
      { invoiceId: req.params.id, cancelled: false },
      { customerDetails, createdBy: req.user.email },
      { new: true, upsert: true }
    );

    res.json({
      message: source === "wb" ? "Customer details fetched from GSTN" : "Customer details loaded from local DB",
      source,
      customerDetails,
      eInvoice: saved,
    });
  } catch (err) {
    console.error("Customer error:", err?.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch customer details" });
  }
});

// 3) Build reference JSON; force SEZ SupTyp if buyer looks SEZ
router.post("/invoices/:id/einvoice/reference", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const eInv = await EInvoice.findOne({ invoiceId: req.params.id, cancelled: false });
    if (!eInv) return res.status(400).json({ message: "E-Invoice not initiated (authenticate first)" });

    const safe = escapeRegex(invoice.clientCompanyName || "");
    const companies = await Company.find({ companyName: { $regex: safe, $options: "i" } }).sort({ companyName: 1 });
    const company = companies[0] || null;

    // Seller
    const seller = {
      Gstin: WHITEBOOKS_CREDENTIALS.gstin,
      LglNm: "ACE PRINT PACK",
      TrdNm: "ACE PRINT PACK",
      Addr1: "R.R.CHAMBERS, NO. 2, 2ND FLOOR",
      Addr2: "11TH MAIN",
      Loc: "VASANTHNAGAR, BENGALURU",
      Pin: 560052,
      Stcd: "29",
      Ph: onlyDigitsSafe("9886672192"),
      Em: emailOk("neeraj@aceprintpack.com"),
    };

    const persisted = eInv.customerDetails || {};
    const basics = buildBuyerBasics({ customerDetails: persisted, company, invoice });

    const missing = {
      gstin: !basics.gstin,
      address1: !basics.address1,
      location: !basics.location,
      pincode: !basics.pincode,
      stateCode: !basics.stateCode,
    };
    if (Object.values(missing).some(Boolean)) {
      return res.status(400).json({
        message: "Customer details incomplete. Please provide GSTIN, StateCode, Address1, Location and Pincode.",
        missing,
      });
    }

    const buyer = {
      Gstin: basics.gstin,
      LglNm: basics.legalName,
      TrdNm: basics.tradeName,
      Pos: String(basics.stateCode),
      Addr1: basics.address1,
      Addr2: basics.address2,
      Loc: basics.location,
      Pin: Number(basics.pincode),
      Stcd: String(basics.stateCode),
      Ph: onlyDigitsSafe(basics.phone),
      Em: emailOk(basics.email),
    };

    // Decide SupTyp: GSTN says SEZ OR the buyer strings mention SEZ => SEZWP (unless explicitly provided as SEZWOP)
    const reqSup = String(req.body?.supTyp || "").toUpperCase();
    const sezByGSTN = persisted?.isSEZ === true;
    const sezByStrings = looksSEZFromBuyerStrings(buyer);
    let supTyp = "B2B";
    if (sezByGSTN || sezByStrings) {
      supTyp = (reqSup === "SEZWOP" || reqSup === "SEZWP") ? reqSup : "SEZWP";
    }

    const isSez = supTyp.startsWith("SEZ");

    const items = (invoice.items || []).map((it, idx) => {
      const qty = Number(it.quantity) || 0;
      const unitPrice = Number(it.rate) || 0;
      const totAmt = round(qty * unitPrice);
      const discount = 0;
      const assAmt = Number(it.taxableAmount) || round(totAmt - discount);

      const cgstPct = Number(it.cgstPercent) || 0;
      const sgstPct = Number(it.sgstPercent) || 0;
      const igstPct = Number(it.igstPercent) || 0;
      const lineGSTpct = cgstPct + sgstPct + igstPct;

      let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
      if (isSez) {
        igstAmt = round((assAmt * lineGSTpct) / 100);
      } else {
        const hasStoredSplit =
          (Number(it.cgstAmount) || 0) > 0 ||
          (Number(it.sgstAmount) || 0) > 0 ||
          (Number(it.igstAmount) || 0) > 0;

        if (hasStoredSplit) {
          cgstAmt = round(Number(it.cgstAmount) || 0);
          sgstAmt = round(Number(it.sgstAmount) || 0);
          igstAmt = round(Number(it.igstAmount) || 0);
        } else {
          const treatAsInter = seller.Stcd && buyer.Stcd && seller.Stcd !== buyer.Stcd;
          if (treatAsInter) {
            igstAmt = round((assAmt * lineGSTpct) / 100);
          } else {
            const half = round((assAmt * lineGSTpct) / 200);
            cgstAmt = half;
            sgstAmt = half;
          }
        }
      }

      const total = Number(it.totalAmount) || round(assAmt + cgstAmt + sgstAmt + igstAmt);

      return {
        SlNo: String(it.slNo || idx + 1),
        IsServc: "N",
        PrdDesc: it.description || it.product || "Item",
        HsnCd: it.hsnCode || it.hsn || "",
        BchDtls: { Nm: String(idx + 1).padStart(3, "0") },
        Qty: qty,
        Unit: (it.unit || "NOS").toUpperCase(),
        UnitPrice: unitPrice,
        TotAmt: totAmt,
        Discount: discount,
        AssAmt: assAmt,
        GstRt: round(lineGSTpct),
        SgstAmt: sgstAmt,
        IgstAmt: igstAmt,
        CgstAmt: cgstAmt,
        TotItemVal: total,
      };
    });

    const AssVal = round(items.reduce((s, i) => s + i.AssAmt, 0));
    const CgstVal = round(items.reduce((s, i) => s + i.CgstAmt, 0));
    const SgstVal = round(items.reduce((s, i) => s + i.SgstAmt, 0));
    const IgstVal = round(items.reduce((s, i) => s + i.IgstAmt, 0));
    const TotInvVal = round(items.reduce((s, i) => s + i.TotItemVal, 0));

    // Remarks: 3..100 chars (avoid Whitebooks 5002)
    const rawRemark =
      (req.body && typeof req.body.invRemark === "string" && req.body.invRemark.trim()) ||
      (invoice?.invoiceDetails?.otherRef || invoice?.invoiceDetails?.otherReference || "").toString().trim();
    let invRemark = rawRemark || "N/A";
    invRemark = invRemark.slice(0, 100);
    if (invRemark.length < 3) invRemark = "N/A";

    const referenceJson = {
      Version: "1.1",
      TranDtls: {
        TaxSch: "GST",
        SupTyp: supTyp,
        RegRev: "N",
        EcmGstin: null,
        IgstOnIntra: "N",
      },
      DocDtls: {
        Typ: "INV",
        No: invoice?.invoiceDetails?.invoiceNumber || "NA",
        Dt: fmtDDMMYYYY(invoice?.invoiceDetails?.date || invoice.createdAt),
      },
      SellerDtls: seller,
      BuyerDtls: buyer,
      DispDtls: {
        Nm: seller.LglNm,
        Addr1: seller.Addr1,
        Addr2: seller.Addr2,
        Loc: seller.Loc,
        Pin: seller.Pin,
        Stcd: seller.Stcd,
      },
      ShipDtls: {
        Gstin: buyer.Gstin,
        LglNm: buyer.LglNm,
        TrdNm: buyer.TrdNm,
        Addr1: buyer.Addr1,
        Addr2: buyer.Addr2,
        Loc: buyer.Loc,
        Pin: buyer.Pin,
        Stcd: buyer.Stcd,
      },
      ItemList: items,
      ValDtls: { AssVal, CgstVal, SgstVal, IgstVal, TotInvVal },
      RefDtls: {
        InvRm: invRemark,
        DocPerdDtls: {
          InvStDt: fmtDDMMYYYY(invoice.createdAt),
          InvEndDt: fmtDDMMYYYY(invoice.createdAt),
        },
        PrecDocDtls: [],
        ContrDtls: [],
      },
    };

    const updated = await EInvoice.findOneAndUpdate(
      { invoiceId: req.params.id, cancelled: false },
      {
        referenceJson,
        createdBy: req.user.email,
        // keep GSTN-provided isSEZ as-is; do not infer here
        customerDetails: { ...persisted, ...basics, isSEZ: !!persisted.isSEZ },
      },
      { new: true, upsert: true }
    );

    res.json({ message: "Reference JSON generated", referenceJson, eInvoice: updated });
  } catch (err) {
    console.error("Reference error:", err?.response?.data || err.message);
    res.status(400).json({ message: "Failed to build reference", error: err.message });
  }
});

// 4) Generate IRN — correct SupTyp to SEZWP if buyer strings show SEZ; robust retry
router.post("/invoices/:id/einvoice/generate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const eInvoice = await EInvoice.findOne({ invoiceId: req.params.id, cancelled: false });
    if (!eInvoice) return res.status(400).json({ message: "E-Invoice not initiated" });
    if (!eInvoice.referenceJson) return res.status(400).json({ message: "Reference JSON not generated" });

    const ref = eInvoice.referenceJson || {};
    const buyer = ref.BuyerDtls || {};
    const supTypNow = ref?.TranDtls?.SupTyp;

    // If buyer looks SEZ (by strings) but SupTyp not SEZ*, force SEZWP before posting
    if (looksSEZFromBuyerStrings(buyer) && supTypNow !== "SEZWP" && supTypNow !== "SEZWOP") {
      ref.TranDtls.SupTyp = "SEZWP";
      await EInvoice.updateOne(
        { invoiceId: req.params.id, cancelled: false },
        { $set: { referenceJson: ref } }
      );
    }

    const doPost = async () =>
      axios.post(
        `${WHITEBOOKS_API_URL}/einvoice/type/GENERATE/version/V1_03`,
        ref,
        {
          params: { email: WHITEBOOKS_CREDENTIALS.email },
          headers: {
            ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
            client_id: WHITEBOOKS_CREDENTIALS.clientId,
            client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
            username: WHITEBOOKS_CREDENTIALS.username,
            "auth-token": eInvoice.authToken,
            gstin: WHITEBOOKS_CREDENTIALS.gstin,
            "Content-Type": "application/json",
          },
        }
      );

    let response = await doPost();
    let { data, status_cd, status_desc } = response.data;

    // Robust match (whitespace variants) for SEZ/B2B mismatch
    const descStr = typeof status_desc === "string" ? status_desc : JSON.stringify(status_desc || "");
    const sezB2BError = /Recepient\s+cannot\s+be\s+SEZ\s+for\s*-\s*B2B\s+transaction/i.test(descStr);

    if (status_cd !== "1" && sezB2BError) {
      ref.TranDtls.SupTyp = "SEZWP";
      await EInvoice.updateOne(
        { invoiceId: req.params.id, cancelled: false },
        { $set: { referenceJson: ref } }
      );
      response = await doPost();
      data = response.data.data;
      status_cd = response.data.status_cd;
      status_desc = response.data.status_desc;
    }

    if (status_cd !== "1") {
      return res.status(400).json({ message: "IRN generation failed", status_desc });
    }

    const updated = await EInvoice.findOneAndUpdate(
      { invoiceId: req.params.id, cancelled: false },
      {
        irp: data?.irp || "",
        irn: data?.Irn,
        ackNo: data?.AckNo,
        ackDt: data?.AckDt,
        signedInvoice: data?.SignedInvoice || "",
        signedQRCode: data?.SignedQRCode || "",
        status: data?.Status || "GENERATED",
        ewbNo: data?.EwbNo || null,
        ewbDt: data?.EwbDt || null,
        ewbValidTill: data?.EwbValidTill || null,
        remarks: data?.Remarks || null,
      },
      { new: true }
    );

    res.json({ message: "IRN generated", eInvoice: updated });
  } catch (err) {
    let status_desc = err?.response?.data?.status_desc || err.message;
    try {
      if (typeof status_desc === "string" && status_desc.trim().startsWith("[")) {
        status_desc = JSON.parse(status_desc).map((e) => e.ErrorMessage).join("\n");
      }
    } catch {}
    console.error("Generate IRN error:", err?.response?.data || err.message);
    res.status(500).json({ message: "Failed to generate IRN", status_desc });
  }
});

// 5) Cancel e-invoice
router.put("/invoices/:id/einvoice/cancel", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updated = await EInvoice.findOneAndUpdate(
      { invoiceId: req.params.id, cancelled: false },
      { cancelled: true, status: "CANCELLED" },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "E-Invoice not found" });
    res.json({ message: "E-Invoice cancelled", eInvoice: updated });
  } catch (err) {
    console.error("Cancel e-invoice error:", err);
    res.status(500).json({ message: "Failed to cancel e-invoice" });
  }
});

// 4b) Generate E-Way Bill for an invoice that already has an IRN
router.post(
  "/invoices/:id/einvoice/ewaybill/generate",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const eInvoice = await EInvoice.findOne({ invoiceId: req.params.id, cancelled: false });
      if (!eInvoice) return res.status(400).json({ message: "E-Invoice not initiated" });
      if (!eInvoice.irn) return res.status(400).json({ message: "IRN not generated for this invoice" });

      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      // Build payload: use request body values; fall back to referenceJson for addresses
      const ref = eInvoice.referenceJson || {};
      const fmtDDMMYYYY = (d) => {
        const dt = d instanceof Date ? d : new Date(d);
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const yy = dt.getFullYear();
        return `${dd}/${mm}/${yy}`;
      };

      const payload = {
        Irn: eInvoice.irn,
        Distance: Number(req.body?.Distance) || 1,
        TransMode: String(req.body?.TransMode || "1"),
        TransId: req.body?.TransId || "",
        TransName: req.body?.TransName || "",
        TransDocDt: req.body?.TransDocDt || fmtDDMMYYYY(new Date()),
        TransDocNo: req.body?.TransDocNo || "",
        VehNo: req.body?.VehNo || "",
        VehType: req.body?.VehType || "R",
        ExpShipDtls: {
          Addr1: req.body?.ExpShipDtls?.Addr1 || ref?.ShipDtls?.Addr1 || "",
          Addr2: req.body?.ExpShipDtls?.Addr2 || ref?.ShipDtls?.Addr2 || "",
          Loc:   req.body?.ExpShipDtls?.Loc   || ref?.ShipDtls?.Loc   || "",
          Pin:   Number(req.body?.ExpShipDtls?.Pin || ref?.ShipDtls?.Pin || 0),
          Stcd:  req.body?.ExpShipDtls?.Stcd  || ref?.ShipDtls?.Stcd  || "",
        },
        DispDtls: {
          Nm:    req.body?.DispDtls?.Nm    || ref?.DispDtls?.Nm    || "",
          Addr1: req.body?.DispDtls?.Addr1 || ref?.DispDtls?.Addr1 || "",
          Addr2: req.body?.DispDtls?.Addr2 || ref?.DispDtls?.Addr2 || "",
          Loc:   req.body?.DispDtls?.Loc   || ref?.DispDtls?.Loc   || "",
          Pin:   Number(req.body?.DispDtls?.Pin || ref?.DispDtls?.Pin || 0),
          Stcd:  req.body?.DispDtls?.Stcd  || ref?.DispDtls?.Stcd  || "",
        },
      };

      // Minimal validations
      if (!payload.TransDocNo) return res.status(400).json({ message: "TransDocNo is required" });
      if (!payload.VehNo)     return res.status(400).json({ message: "VehNo is required" });

      const response = await axios.post(
        `${WHITEBOOKS_API_URL}/einvoice/type/GENERATE_EWAYBILL/version/V1_03`,
        payload,
        {
          params: { email: WHITEBOOKS_CREDENTIALS.email },
          headers: {
            ip_address: WHITEBOOKS_CREDENTIALS.ipAddress,
            client_id: WHITEBOOKS_CREDENTIALS.clientId,
            client_secret: WHITEBOOKS_CREDENTIALS.clientSecret,
            username: WHITEBOOKS_CREDENTIALS.username,
            "auth-token": eInvoice.authToken,
            gstin: WHITEBOOKS_CREDENTIALS.gstin,
            "Content-Type": "application/json",
          },
        }
      );

      let { data, status_cd, status_desc } = response.data;
      if (status_cd !== "1") {
        return res.status(400).json({ message: "E-Way Bill generation failed", status_desc });
      }

      const updatedEInv = await EInvoice.findOneAndUpdate(
        { invoiceId: req.params.id, cancelled: false },
        {
          ewbNo:        data?.EwbNo || data?.ewayBillNo || data?.EWayBillNo || null,
          ewbDt:        data?.EwbDt || data?.ewayBillDate || null,
          ewbValidTill: data?.EwbValidTill || data?.ewayBillValidTill || null,
          ewbPayload:   payload,
        },
        { new: true }
      );

      // Mirror back into Invoice for convenience
      if (updatedEInv?.ewbNo) {
        await Invoice.findByIdAndUpdate(
          req.params.id,
          { $set: { "invoiceDetails.eWayBillNumber": updatedEInv.ewbNo } },
          { new: true }
        );
      }

      const refreshedInvoice = await Invoice.findById(req.params.id);

      res.json({
        message: "E-Way Bill generated",
        eInvoice: updatedEInv,
        invoice: refreshedInvoice,
        payload,
      });
    } catch (err) {
      let status_desc = err?.response?.data?.status_desc || err.message;
      try {
        if (typeof status_desc === "string" && status_desc.trim().startsWith("[")) {
          status_desc = JSON.parse(status_desc).map((e) => e.ErrorMessage).join("\n");
        }
      } catch {}
      console.error("Generate E-Way Bill error:", err?.response?.data || err.message);
      res.status(500).json({ message: "Failed to generate E-Way Bill", status_desc });
    }
  }
);


module.exports = router;
