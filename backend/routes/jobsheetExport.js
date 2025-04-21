// routes/jobSheetExport.js  (COMMONJS version)
const express = require("express");
const path = require("path");
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { format } = require("date-fns");
const JobSheet = require("../models/JobSheet");

const router = express.Router();

router.get("/:id/export-docx", async (req, res) => {
  try {
    const js = await JobSheet.findById(req.params.id).lean();
    if (!js) return res.status(404).send("Job sheet not found");

    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "jobsheettemplate.docx"
    );
    const content = fs.readFileSync(templatePath, "binary");
    const doc = new Docxtemplater(new PizZip(content), {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData({
      eventName: js.eventName,
      jobSheetNumber: js.jobSheetNumber,
      deliveryDate: format(js.deliveryDate, "dd-MMM-yyyy"),
      clientCompanyName: js.clientCompanyName,
      referenceQuotation: js.referenceQuotation,
      deliveryTime: js.deliveryTime,
      clientName: js.clientName,
      orderDate: format(js.orderDate, "dd-MMM-yyyy"),
      crmIncharge: js.crmIncharge,
      contactNumber: js.contactNumber,
      poNumber: js.poNumber,
      poStatus: js.poStatus,
      deliveryType: js.deliveryType,
      deliveryMode: js.deliveryMode,
      deliveryCharges: js.deliveryCharges,
      deliveryAddress: js.deliveryAddress,
      giftBoxBagsDetails: js.giftBoxBagsDetails,
      packagingInstructions: js.packagingInstructions,
      otherDetails: js.otherDetails,
      items: js.items.map((it, i) => ({ slNo: i + 1, ...it })),
    });

    doc.render();
    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=job-sheet-${js.jobSheetNumber}.docx`,
    });
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).send("Template rendering failed");
  }
});

module.exports = router;
