const express = require("express");
const router = express.Router();
const SampleOut = require("../models/SampleOut");
const Company = require("../models/Company");
const Sample = require("../models/Sample");
const User = require("../models/User");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// READ SINGLE
router.get("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const so = await SampleOut.findById(req.params.id).lean();
    if (!so) return res.status(404).json({ message: "Sample Out not found" });
    res.json(so);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching Sample Out" });
  }
});

// CREATE
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const b = req.body;

    // Company & client lookup
    const comp = await Company.findOne({ companyName: b.clientCompanyName });
    if (!comp) return res.status(400).json({ message: "Invalid company" });
    const client = comp.clients.find((c) => c.name === b.clientName);
    if (!client) return res.status(400).json({ message: "Invalid client name" });

    // User lookup
    const usr = await User.findOne({ name: b.sentBy });
    if (!usr) return res.status(400).json({ message: "Invalid sentBy user" });

    // Sample lookup
    const samp = await Sample.findOne({ sampleReferenceCode: b.sampleReferenceCode });
    if (!samp) return res.status(400).json({ message: "Invalid sample reference" });

    const so = new SampleOut({
      sampleOutDate:       b.sampleOutDate,
      clientCompanyId:     comp._id,
      clientCompanyName:   comp.companyName,
      clientName:          client.name,
      contactNumber:       client.contactNumber,
      sentById:            usr._id,
      sentByName:          usr.name,
      sampleRefId:         samp._id,
      sampleReferenceCode: samp.sampleReferenceCode,
      productCode:         samp.productId,
      productPicture:      samp.productPicture,
      productName:         samp.productName,
      brand:               samp.brandName,
      qty:                 b.qty,
      color:               samp.color,
      sentThrough:         b.sentThrough,
      sampleDCNumber:      b.sampleDCNumber,
      sampleOutStatus:     b.sampleOutStatus,
      qtyReceivedBack:     b.qtyReceivedBack,
      receivedBack:        b.receivedBack,
      returned:            b.returned,
      sampleBackDate:      b.sampleBackDate,

      // NEW
      opportunityNumber:   (b.opportunityNumber || "").trim(),
      notReceivedReason:   (b.notReceivedReason || "").trim(),
    });

    await so.save();
    res.status(201).json({ message: "Sample Out created", sampleOut: so });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating Sample Out" });
  }
});

// READ ALL
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { search = "" } = req.query;
    const q = search
      ? {
          $or: [
            { sampleReferenceCode: { $regex: search, $options: "i" } },
            { opportunityNumber:   { $regex: search, $options: "i" } },
            { notReceivedReason:   { $regex: search, $options: "i" } }, // NEW: allow searching reason too
          ],
        }
      : {};
    const list = await SampleOut.find(q).sort({ sampleOutDate: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching Sample Outs" });
  }
});

// UPDATE
router.put("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const b = req.body;
    const so = await SampleOut.findById(req.params.id);
    if (!so) return res.status(404).json({ message: "Sample Out not found" });

    // Company & client if changed
    if (b.clientCompanyName && b.clientName) {
      const comp = await Company.findOne({ companyName: b.clientCompanyName });
      if (!comp) return res.status(400).json({ message: "Invalid company" });
      const client = comp.clients.find((c) => c.name === b.clientName);
      if (!client) return res.status(400).json({ message: "Invalid client" });

      so.clientCompanyId = comp._id;
      so.clientCompanyName = comp.companyName;
      so.clientName = client.name;
      so.contactNumber = client.contactNumber;
    }

    // sentBy if changed
    if (b.sentBy) {
      const usr = await User.findOne({ name: b.sentBy });
      if (!usr) return res.status(400).json({ message: "Invalid sentBy user" });
      so.sentById = usr._id;
      so.sentByName = usr.name;
    }

    // sampleReferenceCode if changed
    if (b.sampleReferenceCode) {
      const samp = await Sample.findOne({
        sampleReferenceCode: b.sampleReferenceCode,
      });
      if (!samp)
        return res.status(400).json({ message: "Invalid sample reference" });
      so.sampleRefId = samp._id;
      so.sampleReferenceCode = samp.sampleReferenceCode;
      so.productCode = samp.productId;
      so.productPicture = samp.productPicture;
      so.productName = samp.productName;
      so.brand = samp.brandName;
      so.color = samp.color;
    }

    // Other updatable fields
    [
      "sampleOutDate",
      "qty",
      "sentThrough",
      "sampleDCNumber",
      "sampleOutStatus",
      "qtyReceivedBack",
      "receivedBack",
      "returned",
      "sampleBackDate",
    ].forEach((field) => {
      if (typeof b[field] !== "undefined") so[field] = b[field];
    });

    // NEW: opportunityNumber
    if (typeof b.opportunityNumber !== "undefined") {
      so.opportunityNumber = (b.opportunityNumber || "").trim();
    }

    // NEW: notReceivedReason
    if (typeof b.notReceivedReason !== "undefined") {
      so.notReceivedReason = (b.notReceivedReason || "").trim();
    }

    await so.save();
    res.json({ message: "Sample Out updated", sampleOut: so });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating Sample Out" });
  }
});

// DELETE
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deleted = await SampleOut.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Sample Out not found" });
    res.json({ message: "Sample Out deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error deleting Sample Out" });
  }
});

module.exports = router;