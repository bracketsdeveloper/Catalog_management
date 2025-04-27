const express = require("express");
const router = express.Router();
const SampleOut = require("../models/SampleOut");
const Company   = require("../models/Company");
const Sample    = require("../models/Sample");
const User      = require("../models/User");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// CREATE
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const b = req.body;

    // 1) Company & client lookup
    const comp = await Company.findOne({ companyName: b.clientCompanyName });
    if (!comp) return res.status(400).json({ message: "Invalid company" });
    const client = comp.clients.find(c => c.name === b.clientName);
    if (!client) return res.status(400).json({ message: "Invalid client name" });

    // 2) User lookup for sentBy
    const usr = await User.findOne({ name: b.sentBy });
    if (!usr) return res.status(400).json({ message: "Invalid sentBy user" });

    // 3) Sample lookup
    const samp = await Sample.findOne({ sampleReferenceCode: b.sampleReferenceCode });
    if (!samp) return res.status(400).json({ message: "Invalid sample reference" });

    // 4) Build record
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
      sampleBackDate:      b.sampleBackDate,
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
      ? { sampleReferenceCode: { $regex: search, $options: "i" } }
      : {};
    const list = await SampleOut.find(q)
      .sort({ sampleOutDate: -1 })
      .lean();
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
    if (!so) return res.status(404).json({ message: "Not found" });

    // repeat lookups if key fields changed
    if (b.clientCompanyName && b.clientName) {
      const comp = await Company.findOne({ companyName: b.clientCompanyName });
      if (!comp) return res.status(400).json({ message: "Invalid company" });
      const client = comp.clients.find(c => c.name === b.clientName);
      if (!client) return res.status(400).json({ message: "Invalid client" });
      so.clientCompanyId   = comp._id;
      so.clientCompanyName = comp.companyName;
      so.clientName        = client.name;
      so.contactNumber     = client.contactNumber;
    }

    if (b.sentBy) {
      const usr = await User.findOne({ name: b.sentBy });
      if (!usr) return res.status(400).json({ message: "Invalid user" });
      so.sentById   = usr._id;
      so.sentByName = usr.name;
    }

    if (b.sampleReferenceCode) {
      const samp = await Sample.findOne({ sampleReferenceCode: b.sampleReferenceCode });
      if (!samp) return res.status(400).json({ message: "Invalid sample reference" });
      so.sampleRefId         = samp._id;
      so.sampleReferenceCode = samp.sampleReferenceCode;
      so.productCode         = samp.productId;
      so.productPicture      = samp.productPicture;
      so.productName         = samp.productName;
      so.brand               = samp.brandName;
      so.color               = samp.color;
    }

    // other manual fields
    [
      "sampleOutDate","qty","sentThrough","sampleDCNumber",
      "sampleOutStatus","qtyReceivedBack","receivedBack","sampleBackDate"
    ].forEach(f => {
      if (typeof b[f] !== "undefined") so[f] = b[f];
    });

    await so.save();
    res.json({ message: "Updated", sampleOut: so });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating Sample Out" });
  }
});

// DELETE
router.delete("/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const del = await SampleOut.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error deleting Sample Out" });
  }
});

module.exports = router;
